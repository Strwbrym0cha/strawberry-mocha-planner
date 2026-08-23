const ENDPOINT='https://sigjwmgekmrwehylvuvu.supabase.co/functions/v1/taskbot-ai';
const SESSION_KEYS=['sm_v16_session','sb-sigjwmgekmrwehylvuvu-auth-token'];
const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:[];
const localDateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function sessionCandidate(value){
  if(!value||typeof value!=='object')return null;
  if(text(value.access_token))return value;
  if(text(value.currentSession?.access_token))return value.currentSession;
  if(text(value.session?.access_token))return value.session;
  return null;
}
export function readMochiniSession(storage){
  let host=storage;
  if(!host&&typeof window!=='undefined'){
    try{host=(window.parent&&window.parent!==window?window.parent:window).localStorage}catch{host=null}
  }
  if(!host?.getItem)return null;
  for(const key of SESSION_KEYS){
    try{const parsed=JSON.parse(host.getItem(key)||'null'),session=sessionCandidate(parsed);if(session)return session}catch{}
  }
  return null;
}

function capacity(state){const energy=text(state?.context?.energy).toLowerCase(),cap=text(state?.context?.capacity).toLowerCase();if(energy==='drained'||cap==='soft'||cap==='low')return'Low';if(energy==='energized'||cap==='big'||cap==='high')return'High';return'Medium'}
function archivedIds(state,kind){return new Set(list(state?.v4?.archive).filter(x=>x?.kind===kind).map(x=>String(x.id||x.itemId||'')))}
export function inferPlanningDate(message,now=new Date()){
  const raw=text(message),explicit=raw.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if(explicit)return explicit[1];
  const d=new Date(now);
  if(/\btomorrow\b/i.test(raw))d.setDate(d.getDate()+1);
  return localDateKey(d);
}
export function buildMochiniAIContext(state,now=new Date(),selectedDate=localDateKey(now)){
  const date=selectedDate,taskArchive=archivedIds(state,'task');
  const tasks=list(state?.life?.tasks).filter(t=>t&&!taskArchive.has(String(t.id))).slice(0,200).map((t,index)=>({
    id:text(t.id)||`task-${index+1}`,
    title:text(t.text||t.title)||'Untitled task',
    status:t.done?'completed':'active',
    date:text(t.date)||null,
    dueDate:text(t.dueDate)||null,
    priority:text(t.priority)||null,
    category:text(t.category)||null,
    effort:({low:'Low',medium:'Medium',high:'High'}[text(t.energy).toLowerCase()])||null,
    estimatedDurationMinutes:Number.isFinite(Number(t.minutes))?Math.max(0,Number(t.minutes)):null,
    availableToday:!t.done&&(!text(t.date)||text(t.date)<=date),
    source:{type:text(t.source)||'v4-task'}
  }));
  const events=[...list(state?.life?.events).map(e=>({id:text(e.id),title:text(e.title)||'Scheduled event',date:text(e.date)||null,start:text(e.startTime)||null,end:text(e.endTime)||null})),...list(state?.work?.shifts).map(s=>({id:text(s.id),title:text(s.label)||'Work shift',date:text(s.date)||null,start:text(s.startTime)||null,end:text(s.endTime)||null}))].filter(e=>e.date===date).slice(0,25);
  return{date,capacity:capacity(state),currentMissionId:null,dayDisrupted:false,fixedEvents:events,tasks};
}
export function buildMochiniAIHistory(state,currentMessage=''){
  const current=text(currentMessage).toLowerCase();let skippedCurrent=false;
  return list(state?.mochini?.conversation).slice().reverse().filter(turn=>{
    if(!turn||!['user','assistant'].includes(turn.role)||!text(turn.text))return false;
    if(!skippedCurrent&&turn.role==='user'&&text(turn.text).toLowerCase()===current){skippedCurrent=true;return false}
    return true;
  }).slice(0,6).reverse().map(turn=>({role:turn.role,content:text(turn.text).slice(0,800)}));
}
const failure=(kind,error)=>({ok:false,kind,error});
export async function askMochiniAI({message,state,signal,fetchImpl,storage}={}){
  const prompt=text(message);if(!prompt||prompt.length>2000)return failure('invalid','Give me a slightly shorter question and I’ve got you.');
  const session=readMochiniSession(storage);if(!session?.access_token)return failure('auth','I can reason this through with you, but I need you signed in first.');
  const runFetch=fetchImpl||(typeof fetch==='function'?fetch:null);if(!runFetch)return failure('network','I can’t reach my thinking brain right now. Try again in a sec.');
  try{
    const selectedDate=inferPlanningDate(prompt);
    const response=await runFetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({message:prompt,context:buildMochiniAIContext(state,new Date(),selectedDate),history:buildMochiniAIHistory(state,prompt)}),signal});
    const payload=await response.json().catch(()=>null);
    if(response.status===401||response.status===403)return failure('auth','I need you to sign in again before I use my thinking brain.');
    if(!response.ok)return failure('provider','My thinking brain tripped for a second. Try that again?');
    if(!payload||payload.ok!==true||!text(payload.message))return failure('malformed','I got a weird empty answer back. Try that one more time?');
    return{ok:true,message:text(payload.message)};
  }catch(error){
    if(error?.name==='AbortError')return failure('cancelled','That took too long, so I stopped it. Try again?');
    return failure('network','I can’t reach my thinking brain right now. Try again in a sec.');
  }
}
