const SUPABASE_URL = 'https://sigjwmgekmrwehylvuvu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MrtltNJt8EufDKM1UqqDCQ_JphJneJt';
const TABLE = 'planner_data';

const V5_DATA_KEY = 'sm_v5_data';
const V4_DATA_KEY = 'sm_v4_beta';
const EXTRA_KEYS = Object.freeze({
  dailyNotes: 'sm_v5_detailed_daily_notes',
  roomDetails: 'sm_v5_room_details',
  ledger: 'sm_v5_money_ledger',
});

const SESSION_KEY = 'sm_cloud_session';
const LAST_SYNC_KEY = 'sm_cloud_last_sync';
const CLIENT_ID_KEY = 'sm_cloud_client_id';

let syncBusy = false;
let autoSyncStarted = false;
let pushTimer = null;
let pollTimer = null;
let pullTimer = null;
let lastLocalSnapshot = null;
let lastCloudTime = 0;

function parseJson(raw, fallback = null) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function isoTime(value) {
  const t = Date.parse(value || '');
  return Number.isFinite(t) ? t : 0;
}

function stateTime(state) {
  return isoTime(state?.__smUpdatedAt)
    || isoTime(state?.meta?.updatedAt)
    || isoTime(state?.meta?.lastSavedAt)
    || 0;
}

function contentScore(state) {
  if (!state || typeof state !== 'object') return 0;
  let score = 0;
  const add = (value) => { if (Array.isArray(value)) score += value.length; };
  add(state.tasks);
  add(state.routines);
  add(state.pings);
  add(state.dailyNotes);
  add(state.schedule?.appointments);
  add(state.work?.clients);
  add(state.work?.sessions);
  add(state.study?.courses);
  add(state.money?.ledger);
  add(state.money?.bills);
  add(state.money?.subscriptions);
  add(state.gig?.orders);
  add(state.gig?.payouts);
  return score;
}

function readLocalState() {
  return parseJson(localStorage.getItem(V5_DATA_KEY), null);
}

function captureLocalSnapshot() {
  return [
    localStorage.getItem(V5_DATA_KEY) || '',
    localStorage.getItem(EXTRA_KEYS.dailyNotes) || '',
    localStorage.getItem(EXTRA_KEYS.roomDetails) || '',
    localStorage.getItem(EXTRA_KEYS.ledger) || '',
  ];
}

function snapshotsEqual(a, b) {
  return !!a && !!b && a.length === b.length && a.every((value, i) => value === b[i]);
}

function readExtras() {
  const extras = {};
  for (const [name, key] of Object.entries(EXTRA_KEYS)) {
    const raw = localStorage.getItem(key);
    if (raw != null) extras[name] = parseJson(raw, null);
  }
  return extras;
}

function writeExtras(extras) {
  if (!extras || typeof extras !== 'object') return;
  for (const [name, key] of Object.entries(EXTRA_KEYS)) {
    if (!Object.prototype.hasOwnProperty.call(extras, name)) continue;
    const value = extras[name];
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  }
}

function writeCanonicalLocalState(state) {
  if (!state || typeof state !== 'object') return;
  localStorage.setItem(V5_DATA_KEY, JSON.stringify(state));

  // V5 data.js still reads the legacy envelope as a recovery source. Keep it
  // aligned with the cloud pull so a fresh phone does not immediately replace
  // the downloaded V5 state with an older device-local V4 copy.
  const existing = parseJson(localStorage.getItem(V4_DATA_KEY), null);
  const envelope = existing && typeof existing === 'object' && existing.data && typeof existing.data === 'object'
    ? { ...existing, data: state }
    : { data: state };
  localStorage.setItem(V4_DATA_KEY, JSON.stringify(envelope));
}

function buildOutgoingState(state) {
  const now = new Date().toISOString();
  const outgoing = structuredClone(state || {});
  outgoing.__smUpdatedAt = now;
  outgoing.__v5CloudExtras = readExtras();
  return outgoing;
}

function applyCloudState(state) {
  if (!state || typeof state !== 'object') return false;
  writeExtras(state.__v5CloudExtras);
  writeCanonicalLocalState(state);
  lastLocalSnapshot = captureLocalSnapshot();
  return true;
}

function getSession() {
  return parseJson(localStorage.getItem(SESSION_KEY), null);
}

function setSession(session) {
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getClientId() {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

async function authRequest(path, body) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.msg || payload?.error_description || payload?.message || 'Cloud sign-in failed.');
  return payload;
}

async function refreshSession(session) {
  if (!session?.refresh_token) return null;
  try {
    const next = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    setSession(next);
    return next;
  } catch {
    setSession(null);
    return null;
  }
}

async function validSession() {
  let session = getSession();
  if (!session?.access_token) return null;
  const expiresAt = Number(session.expires_at || 0) * 1000;
  if (expiresAt && expiresAt < Date.now() + 60_000) session = await refreshSession(session);
  return session?.access_token ? session : null;
}

async function rest(path, { method = 'GET', body = null, prefer = '' } = {}) {
  let session = await validSession();
  if (!session) throw new Error('Not signed in.');

  const doFetch = (token) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body == null ? null : JSON.stringify(body),
  });

  let response = await doFetch(session.access_token);
  if (response.status === 401) {
    session = await refreshSession(session);
    if (!session) throw new Error('Cloud session expired.');
    response = await doFetch(session.access_token);
  }
  if (!response.ok) throw new Error((await response.text().catch(() => '')) || `Cloud request failed (${response.status}).`);
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

async function fetchCloudState() {
  const rows = await rest(`${TABLE}?select=data,updated_at&limit=1`);
  const row = Array.isArray(rows) ? rows[0] : null;
  return row ? { state: row.data, updatedAt: row.updated_at } : null;
}

async function pushCloud(state) {
  const session = await validSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Cloud account is missing a user id.');

  const outgoing = buildOutgoingState(state);
  const rows = await rest(`${TABLE}?on_conflict=user_id`, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: [{ user_id: userId, data: outgoing }],
  });

  // Stamp both local canonical copies with exactly what was accepted by cloud.
  // This prevents the same device from pulling/reloading its own write later.
  writeCanonicalLocalState(outgoing);
  lastLocalSnapshot = captureLocalSnapshot();

  const row = Array.isArray(rows) ? rows[0] : null;
  const serverTime = isoTime(row?.updated_at) || stateTime(outgoing) || Date.now();
  lastCloudTime = Math.max(lastCloudTime, serverTime);
  localStorage.setItem(LAST_SYNC_KEY, new Date(serverTime).toISOString());
  dispatchSyncStatus('synced', { direction: 'push', at: serverTime });
  return { state: outgoing, serverTime };
}

function dispatchSyncStatus(status, detail = {}) {
  try {
    window.dispatchEvent(new CustomEvent('katos:cloud-sync', { detail: { status, ...detail } }));
  } catch { /* no-op */ }
}

async function syncOnOpen() {
  if (syncBusy) return { ok: false, action: 'busy' };
  syncBusy = true;
  dispatchSyncStatus('syncing');
  try {
    const local = readLocalState();
    const cloud = await fetchCloudState();

    if (!cloud?.state) {
      if (local && contentScore(local) > 0) {
        await pushCloud(local);
        return { ok: true, action: 'pushed-initial' };
      }
      dispatchSyncStatus('synced', { direction: 'none' });
      return { ok: true, action: 'empty' };
    }

    const cloudTime = isoTime(cloud.updatedAt) || stateTime(cloud.state);
    const localTime = stateTime(local);
    lastCloudTime = cloudTime;

    if (!local || cloudTime > localTime) {
      applyCloudState(cloud.state);
      localStorage.setItem(LAST_SYNC_KEY, new Date(cloudTime || Date.now()).toISOString());
      dispatchSyncStatus('synced', { direction: 'pull', at: cloudTime });
      return { ok: true, action: 'pulled' };
    }

    if (localTime > cloudTime) {
      await pushCloud(local);
      return { ok: true, action: 'pushed-newer-local' };
    }

    // Equal/unknown timestamps: preserve the richer copy rather than silently
    // replacing a populated device with a sparse one.
    if (contentScore(cloud.state) > contentScore(local)) {
      applyCloudState(cloud.state);
      localStorage.setItem(LAST_SYNC_KEY, new Date(cloudTime || Date.now()).toISOString());
      dispatchSyncStatus('synced', { direction: 'pull', at: cloudTime });
      return { ok: true, action: 'pulled-richer' };
    }

    dispatchSyncStatus('synced', { direction: 'none', at: cloudTime });
    return { ok: true, action: 'already-current' };
  } catch (error) {
    console.warn('[KatOS V5] cloud sync skipped:', error);
    dispatchSyncStatus('offline', { error: String(error?.message || error) });
    return { ok: false, action: 'offline', error };
  } finally {
    syncBusy = false;
  }
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    if (syncBusy) return schedulePush();
    const session = await validSession();
    const local = readLocalState();
    if (!session || !local || contentScore(local) <= 0) return;

    syncBusy = true;
    dispatchSyncStatus('syncing');
    try {
      await pushCloud(local);
    } catch (error) {
      console.warn('[KatOS V5] auto-push failed:', error);
      dispatchSyncStatus('offline', { error: String(error?.message || error) });
    } finally {
      syncBusy = false;
    }
  }, 800);
}

function startAutoSync() {
  if (autoSyncStarted) return;
  autoSyncStarted = true;
  lastLocalSnapshot = captureLocalSnapshot();

  // Watch the canonical planner plus V5 data that historically lived in
  // separate localStorage keys. This makes notes, room details and ledger
  // changes travel to the phone too, not just the main planner object.
  pollTimer = setInterval(() => {
    const current = captureLocalSnapshot();
    if (!snapshotsEqual(current, lastLocalSnapshot)) {
      lastLocalSnapshot = current;
      schedulePush();
    }
  }, 900);

  pullTimer = setInterval(async () => {
    if (syncBusy || document.visibilityState === 'hidden') return;
    const session = await validSession();
    if (!session) return;

    syncBusy = true;
    try {
      const cloud = await fetchCloudState();
      const cloudTime = isoTime(cloud?.updatedAt) || stateTime(cloud?.state);
      const localTime = stateTime(readLocalState());
      if (cloud?.state && cloudTime > localTime && cloudTime > lastCloudTime) {
        applyCloudState(cloud.state);
        lastCloudTime = cloudTime;
        localStorage.setItem(LAST_SYNC_KEY, new Date(cloudTime || Date.now()).toISOString());
        dispatchSyncStatus('synced', { direction: 'pull', at: cloudTime });
        location.reload();
      }
    } catch (error) {
      console.warn('[KatOS V5] periodic pull failed:', error);
    } finally {
      syncBusy = false;
    }
  }, 15_000);
}

function stopAutoSync() {
  clearTimeout(pushTimer);
  clearInterval(pollTimer);
  clearInterval(pullTimer);
  pushTimer = pollTimer = pullTimer = null;
  autoSyncStarted = false;
}

function showSignInGate() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'cloud-gate';
    overlay.innerHTML = `
      <style>
        .cloud-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;background:linear-gradient(135deg,#fff7fb,#f7f5ff 55%,#f5fbf6);font-family:Inter,system-ui,sans-serif;color:#5b3f4a}
        .cloud-card{width:min(520px,100%);padding:28px;border:1px solid #e7cbd7;border-radius:28px;background:rgba(255,255,255,.94);box-shadow:0 24px 70px rgba(101,63,83,.14)}
        .cloud-card h1{font-family:Georgia,serif;margin:0 0 8px;font-size:34px;color:#4d3440}.cloud-card p{line-height:1.55;color:#795d68}.cloud-card label{display:block;margin-top:13px;font-size:13px;font-weight:700}.cloud-card input{width:100%;box-sizing:border-box;margin-top:6px;padding:12px 14px;border:1px solid #dec6d0;border-radius:14px;background:#fff;font:inherit}.cloud-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.cloud-card button{border:1px solid #d9bdca;border-radius:999px;padding:11px 17px;background:#fff7fb;color:#6b4255;font