import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGIN = Deno.env.get("TASKBOT_AI_ALLOWED_ORIGIN") || "https://strwbrym0cha.github.io";
const OPENAI_URL = "https://api.openai.com/v1/responses";
const MAX_REQUEST_BYTES = 48_000;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_MESSAGE_LENGTH = 800;
const MAX_TASKS = 200;
const MAX_EVENTS = 25;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EFFORT = new Set(["Low", "Medium", "High"]);
const STATUS = new Set(["active", "completed", "parked", "blocked"]);

const INSTRUCTIONS = `You are Task Bot, a concise and practical planner assistant.
Use only the sanitized planner context supplied with each request. Do not invent planner facts.
Clearly separate facts from suggestions when useful. Help the user understand today's workload,
identify appropriate available tasks, prioritize, reason about disruptions, and break large tasks
into suggested smaller steps. If relevant information is missing, say so.
You are read-only: never claim that you created, updated, moved, archived, parked, completed,
or deleted planner records. You cannot make planner changes; describe a proposed change and ask
the user to approve it in the planner. Keep responses calm, concise, and free of guilt language.`;

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const cleanString = (value: unknown, max = 500): string | null => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const cleanDate = (value: unknown): string | null => DATE.test(String(value || "")) ? String(value) : null;
const cleanList = (value: unknown) => Array.isArray(value) ? value : [];
const cleanBoolean = (value: unknown) => typeof value === "boolean" ? value : false;
const cleanNumber = (value: unknown, max = 1_440): number | null => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max ? Number(value) : null;

function corsHeaders(request: Request): HeadersInit | null {
  return request.headers.get("origin") === ALLOWED_ORIGIN ? {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  } : null;
}

function response(body: Record<string, unknown>, status: number, cors: HeadersInit | null) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...(cors || {}) } });
}

function configuredPublishableKey(): string | null {
  const direct = cleanString(Deno.env.get("SUPABASE_PUBLISHABLE_KEY")) || cleanString(Deno.env.get("SUPABASE_ANON_KEY"));
  if (direct) return direct;
  const keys = cleanString(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  if (!keys) return null;
  try {
    const parsed = JSON.parse(keys);
    if (Array.isArray(parsed)) return cleanString(parsed[0]?.key) || cleanString(parsed[0]);
    return cleanString(parsed?.key) || cleanString(parsed?.default);
  } catch {
    return null;
  }
}

async function authenticatedUser(request: Request): Promise<{ id: string } | null> {
  const authorization = request.headers.get("authorization") || "";
  const supabaseUrl = cleanString(Deno.env.get("SUPABASE_URL"));
  const publishableKey = configuredPublishableKey();
  if (!/^Bearer\s+\S+$/i.test(authorization) || !supabaseUrl || !publishableKey) return null;
  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: publishableKey },
    });
    if (!userResponse.ok) return null;
    const user = await userResponse.json();
    return cleanString(user?.id) ? { id: user.id } : null;
  } catch {
    return null;
  }
}

function sanitizeTask(task: unknown, selectedDate: string) {
  if (!isObject(task)) return null;
  const id = cleanString(task.id, 120);
  const title = cleanString(task.title, 400);
  if (!id || !title) return null;
  const effort = cleanString(task.effort, 20);
  const status = cleanString(task.status, 30);
  const source = isObject(task.source) ? task.source : {};
  return {
    id,
    title,
    status: status && STATUS.has(status) ? status : "active",
    date: cleanDate(task.date),
    dueDate: cleanDate(task.dueDate),
    priority: cleanString(task.priority, 40),
    category: cleanString(task.category, 120),
    effort: effort && EFFORT.has(effort) ? effort : null,
    estimatedDurationMinutes: cleanNumber(task.estimatedDurationMinutes),
    doneWhen: cleanString(task.doneWhen, 500),
    availableToday: task.availableToday !== undefined ? cleanBoolean(task.availableToday) : true,
    unavailableOn: cleanList(task.unavailableOn).map(cleanDate).filter(Boolean).slice(0, 31),
    parentTaskId: cleanString(task.parentTaskId, 120),
    childTaskIds: cleanList(task.childTaskIds).map((id) => cleanString(id, 120)).filter(Boolean).slice(0, 30),
    source: {
      type: cleanString(source.type, 80),
      projectId: cleanString(source.projectId, 120),
      courseId: cleanString(source.courseId, 120),
      workId: cleanString(source.workId, 120),
    },
    isForSelectedDay: cleanDate(task.date) === selectedDate,
  };
}

function sanitizeContext(value: unknown) {
  if (!isObject(value)) return null;
  const selectedDate = cleanDate(value.date) || new Date().toISOString().slice(0, 10);
  const capacity = cleanString(value.capacity, 20);
  return {
    date: selectedDate,
    capacity: capacity && EFFORT.has(capacity) ? capacity : "High",
    currentMissionId: cleanString(value.currentMissionId, 120),
    dayDisrupted: cleanBoolean(value.dayDisrupted),
    fixedEvents: cleanList(value.fixedEvents).slice(0, MAX_EVENTS).map((event) => {
      if (!isObject(event)) return null;
      return {
        id: cleanString(event.id, 120),
        title: cleanString(event.title, 300) || "Scheduled event",
        date: cleanDate(event.date),
        start: cleanString(event.start, 30),
        end: cleanString(event.end, 30),
      };
    }).filter(Boolean),
    tasks: cleanList(value.tasks).slice(0, MAX_TASKS).map((task) => sanitizeTask(task, selectedDate)).filter(Boolean),
  };
}

function sanitizeHistory(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_HISTORY_MESSAGES) return null;
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const message of value) {
    if (!isObject(message) || (message.role !== "user" && message.role !== "assistant")) return null;
    const content = cleanString(message.content, MAX_HISTORY_MESSAGE_LENGTH);
    if (!content) return null;
    history.push({ role: message.role, content });
  }
  return history;
}

async function readBody(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_REQUEST_BYTES) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_REQUEST_BYTES) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function extractOutput(payload: unknown): string | null {
  if (!isObject(payload) || !Array.isArray(payload.output)) return null;
  const text = payload.output.flatMap((item: unknown) => isObject(item) && Array.isArray(item.content) ? item.content : [])
    .filter((item: unknown) => isObject(item) && item.type === "output_text")
    .map((item: Record<string, unknown>) => cleanString(item.text, 4_000))
    .filter(Boolean).join("\n").trim();
  return text || null;
}

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  if (!cors) return response({ ok: false, error: "This origin is not allowed." }, 403, null);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return response({ ok: false, error: "Method not allowed." }, 405, cors);

  const user = await authenticatedUser(request);
  if (!user) return response({ ok: false, error: "Please sign in to use Task Bot." }, 401, cors);

  const body = await readBody(request);
  const message = isObject(body) ? cleanString(body.message, MAX_MESSAGE_LENGTH) : null;
  const context = isObject(body) ? sanitizeContext(body.context) : null;
  const history = isObject(body) ? sanitizeHistory(body.history) : null;
  if (!message || !context || history === null) return response({ ok: false, error: "Please provide a valid message and planner context." }, 400, cors);

  const apiKey = cleanString(Deno.env.get("OPENAI_API_KEY"));
  if (!apiKey) {
    console.error("taskbot-ai is missing its OpenAI secret");
    return response({ ok: false, error: "Task Bot is not configured yet." }, 503, cors);
  }

  try {
    const providerResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: cleanString(Deno.env.get("TASKBOT_AI_MODEL"), 100) || "gpt-5.6",
        store: false,
        instructions: INSTRUCTIONS,
        input: [
          { role: "developer", content: `Sanitized planner context (read-only): ${JSON.stringify(context)}` },
          ...history,
          { role: "user", content: message },
        ],
        max_output_tokens: 500,
      }),
    });
    if (!providerResponse.ok) {
      console.warn("taskbot-ai OpenAI request failed", { status: providerResponse.status, taskCount: context.tasks.length });
      return response({ ok: false, error: "Task Bot is unavailable right now. Please try again." }, 502, cors);
    }
    const output = extractOutput(await providerResponse.json());
    if (!output) {
      console.warn("taskbot-ai received an empty OpenAI response", { taskCount: context.tasks.length });
      return response({ ok: false, error: "Task Bot could not prepare a response. Please try again." }, 502, cors);
    }
    console.info("taskbot-ai response sent", { taskCount: context.tasks.length, historyCount: history.length });
    return response({ ok: true, message: output }, 200, cors);
  } catch {
    console.error("taskbot-ai request failed");
    return response({ ok: false, error: "Task Bot is unavailable right now. Please try again." }, 502, cors);
  }
});
