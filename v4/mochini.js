import{makeId,localDateKey,isArchived}from'./store.js?v=4.0.0-preview.2';
const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:[];
const clone=v=>structuredClone(v);
const lower=v=>text(v).toLowerCase();
const addTurn=(s,role,message,meta={})=>{s.mochini={...s.mochini,conversation:[...list(s.mochini?.conversation),{id:makeId('turn'),role,text:message,at:new Date().toISOString(),meta}].slice(-100)};return s};
const stripLead=s=>text(s).replace(/^(mochini[,:]?\s*)/i,'').trim();
const titleCase=s=>text(s).replace(/^\w/,c=>c.toUpperCase());
const DATE_WORDS={today:0,tomorrow:1};
function relativeDate(raw){const l=lower(raw);for(const[k,offset]of Object.entries(DATE_WORDS))if(l.includes(k)){const d=new Date();d.setDate(d.getDate()+offset);return localDateKey(d)}return''}
function cleanTaskLabel(s){return titleCase(text(s).replace(/^(i\s+)?(need|have|got)\s+to\s+/i,'').replace(/^(please\s+)?(add|make|create)\s+(a\s+)?(task|to-?do)\s+(to\s+)?/i,'').replace(/^(remind me to|add (a )?reminder to|make (a )?reminder to)\s+/i,'').replace(/\b(today|tomorrow)\b/ig,'').replace(/[.!]+$/,'').trim())}
function splitActions(raw){let s=stripLead(raw);const numbered=[...s.matchAll(/(?:^|\s)(?:\d+[.)]|[-•])\s*([^]+?)(?=(?:\s\d+[.)]|\s[-•]|$))/g)].map(m=>cleanTaskLabel(m[1])).filter(Boolean);if(numbered.length>=2)return numbered.slice(0,3);s=s.replace(/^(okay|ok|now|then|also|i have to|i need to)\s*/i,'').trim();const parts=s.split(/\s+(?:and then|then|and also|also|and)\s+/i).map(cleanTaskLabel).filter(x=>x&&x.split(/\s+/).length<=16);return parts.length>=2?parts.slice(0,3):[]}
function explicitReminder(raw){return /\b(remind me|add (me )?(a )?reminder|make (me )?(a )?reminder|little ping|ping me)\b/i.test(raw)}
function explicitTask(raw){return /\b(add (me )?(a )?(task|to-?do)|make (me )?(a )?(task|to-?do)|sweet to-?do|task:)\b/i.test(raw)}
function looksAmbiguousAction(raw){const s=stripLead(raw);return /^(need|need to|gotta|got to|have to|remember to)\b/i.test(s)&&s.split(/\s+/).length<=8}
function looksBrainDump(raw){return /\b(brain dump|random thought|idea:|kat ?os idea|hobby idea|language idea)\b/i.test(raw)}
function chooseBucket(raw){const l=lower(raw);if(/negative|rant|hate|awful|terrible|closed drawer/.test(l))return'closed';if(/language/.test(l))return'language';if(/hobby/.test(l))return'hobby';if(/kat ?os/.test(l))return'katos';if(/idea/.test(l))return'idea';return'inbox'}
function nextTaskSuggestion(state){const today=localDateKey(),tasks=list(state.life?.tasks).filter(t=>!t.done&&!isArchived(state,'task',t.id)&&(!t.date||t.date<=today));const energy=state.context?.energy||'okay';const score=t=>{let n=0;if(t.protected)n+=100;if(t.date&&t.date<today)n+=50;else if(t.date===today)n+=30;const er={low:0,medium:1,high:2}[t.energy]??1;const ceiling=energy==='energized'?2:energy==='drained'?0:1;if(er<=ceiling)n+=25;else n-=20;if(Number(t.minutes||15)<=15)n+=8;return n};return tasks.sort((a,b)=>score(b)-score(a)||Number(a.minutes||15)-Number(b.minutes||15))[0]||null}
function whatNowReply(state){const task=nextTaskSuggestion(state);const today=localDateKey(),event=list(state.life?.events).filter(x=>x.date===today&&x.startTime).sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime)))[0];const routine=list(state.life?.routines).find(r=>!r.archived&&!isArchived(state,'routine',r.id));const bits=[];if(event)bits.push(`your calendar has “${event.title}” at ${event.startTime}`);if(task)bits.push(`the best-fit Sweet To-Do is “${task.text||task.title}”`);if(routine)bits.push(`you also have ${routine.name||routine.title} available`);if(!bits.length)return`Your board is pretty open right now ✨ You can rest on purpose, pick a hobby, or throw me a brain dump and I’ll help shape the day.`;return`Here’s what I’m weighing: ${bits.join('; ')}. ${task?`I’d start with “${task.text||task.title}” because it fits the strongest combination of urgency + your current context.`:'Nothing needs to be forced just to fill space.'}`}
function proposedTask(label,date=''){return{id:makeId('proposal'),kind:'task',title:label,payload:{text:label,date,minutes:15,energy:'medium',initiation:'easy',mode:'any',protected:false}}}
function proposedReminder(label,date=''){return{id:makeId('proposal'),kind:'reminder',title:label,payload:{title:label,date,time:'',timing:'specific'}}}

function recentUserMessages(state){return list(state.mochini?.conversation).filter(turn=>turn.role==='user').map(turn=>text(turn.text)).filter(Boolean).slice(-6)}
function previousUserMessage(state){const messages=recentUserMessages(state);return messages.length>1?messages.at(-2):''}
function hangoutContext(raw){const s=text(raw);const patterns=[/\b(?:hang out|hangout|chill|spend time|go out)\s+with\s+([^,.!?]+)/i,/\bsee\s+([^,.!?]+)\s+(?:today|tomorrow|this weekend|later)/i];for(const pattern of patterns){const match=s.match(pattern);if(match?.[1])return{person:titleCase(match[1].trim().replace(/\s+(today|tomorrow|later|this weekend)$/i,'')),text:s}}return null}
function recentHangoutContext(state){const messages=recentUserMessages(state);for(let i=messages.length-2;i>=0;i--){const found=hangoutContext(messages[i]);if(found)return found}return null}
function isCasualHangoutStatement(raw){return /\b(?:wanna|want to|would like to|feel like|thinking about)\s+(?:hang out|hangout|chill|spend time|go out)\b/i.test(raw)&&!!hangoutContext(raw)}
function hangoutStarterReply(raw){const ctx=hangoutContext(raw);if(!ctx)return'';return`Okayyy, ${ctx.person} time 👀 Are we feeling stay-in-and-cuddle, food + wandering around somewhere, or an actual activity? I can help you pick without turning it into a task.`}
function casualFollowupReply(state,raw){
  const l=lower(raw),followup=/^(what should we do|what can we do|what do we do|what should we do together|any ideas|give me ideas|where should we go|what should we do for fun|what can we do for fun)[?.!]*$/i.test(text(raw));
  if(!followup)return'';
  const hangout=recentHangoutContext(state);
  if(hangout){return`With ${hangout.person}? Bet 😭 Pick your flavor: 1) grab food and wander a store/bookshop, 2) movie + snacks, 3) arcade/mini golf/bowling, 4) coffee or boba + a drive and yap session, or 5) stay in with takeout and a show. Tell me “cheap,” “at home,” “outside,” or “date-ish” and I’ll narrow it down.`}
  const previous=previousUserMessage(state);
  if(previous)return`I’m following you. You were talking about “${previous}.” Give me the vibe you want from it and I’ll actually help you choose instead of filing it somewhere.`;
  return`Absolutely. Give me one crumb of context about who “we” is and the vibe you want, and I’ll give you actual options.`
}
function conversationalFallback(state,raw){const previous=previousUserMessage(state);if(previous&&/^(why|how|what about|and then|okay but|but what|tell me more)\b/i.test(raw))return`I’m following the thread. You were talking about “${previous}.” Keep going and I’ll stay with that topic instead of trying to turn it into planner data.`;return`I’m with you 😊 I’m keeping that as conversation. You can keep talking, ask me for ideas, or ask me to help decide something. I won’t turn it into planner data unless you actually ask me to.`}

export function processMochini(state,input){let next=clone(state),raw=stripLead(input),reply='';if(!raw)return{state:next,reply:'Girl you have to give me at least one crumb of context 😭'};next=addTurn(next,'user',raw);
  if(/^(what should i do( now)?|what do i do( now)?|pick for me)$/i.test(raw)){reply=whatNowReply(next);next=addTurn(next,'assistant',reply);return{state:next,reply}}
  const conversationalFollowup=casualFollowupReply(next,raw);if(conversationalFollowup){reply=conversationalFollowup;next=addTurn(next,'assistant',reply,{conversation:true,followup:true});return{state:next,reply}}
  if(looksBrainDump(raw)){const bucket=chooseBucket(raw),entry={id:makeId('dump'),text:raw.replace(/^(brain dump|random thought|idea:)\s*/i,''),bucket,createdAt:new Date().toISOString()};next.v4.brainDump=[...list(next.v4.brainDump),entry];reply=bucket==='closed'?`Locked it in the Closed Drawer 🔒 I won’t resurface it automatically.`:`Got it. I tossed that into ${bucket==='inbox'?'the unsorted pile':bucket} so you didn’t have to organize it first.`;next=addTurn(next,'assistant',reply);return{state:next,reply}}
  const date=relativeDate(raw),multi=splitActions(raw);
  if(multi.length>=2&&!explicitReminder(raw)){next.mochini.pendingProposal={id:makeId('proposal-batch'),kind:'task-batch',title:`${multi.length} Sweet To-Dos`,payload:{items:multi.map(label=>proposedTask(label,date).payload)}};reply=`I caught ${multi.length} separate things instead of making one giant Franken-task 😭 Want me to add all ${multi.length} to Sweet To-Dos?`;next=addTurn(next,'assistant',reply,{proposal:true});return{state:next,reply}}
  if(explicitReminder(raw)){const label=cleanTaskLabel(raw);next.mochini.pendingProposal=proposedReminder(label,date);reply=`Yep 🔔 I read that as a Little Ping: “${label}.” Add it?`;next=addTurn(next,'assistant',reply,{proposal:true});return{state:next,reply}}
  if(explicitTask(raw)){const label=cleanTaskLabel(raw);next.mochini.pendingProposal=proposedTask(label,date);reply=`Got you 📝 “${label}” belongs in Sweet To-Dos. Add it?`;next=addTurn(next,'assistant',reply,{proposal:true});return{state:next,reply}}
  if(isCasualHangoutStatement(raw)){reply=hangoutStarterReply(raw);next=addTurn(next,'assistant',reply,{conversation:true,topic:'hangout'});return{state:next,reply}}
  if(looksAmbiguousAction(raw)){const label=cleanTaskLabel(raw);next.mochini.pendingProposal={id:makeId('clarify'),kind:'clarify-task-reminder',title:label,payload:{label,date}};reply=`I’m a little confused on the context 😊 Do you want “${label}” in Sweet To-Dos or as a Little Ping?`;next=addTurn(next,'assistant',reply,{clarify:true});return{state:next,reply}}
  const l=lower(raw);if(/\b(exhausted|drained|tired|no energy)\b/.test(l)){next.context={...next.context,energy:'drained',capacity:'soft'};reply=`Got you. I’m treating today like low-capacity mode, not a moral emergency. We can shrink choices instead of pretending you suddenly became a productivity robot.`}
  else if(/\b(locked in|lock in|so much energy|energized|productive)\b/.test(l)){next.context={...next.context,energy:'energized',capacity:'big'};reply=`Okayyy, power is online ⚡ I’ll favor the important/high-energy stuff first and leave the softer tasks for the landing.`}
  else if(/\b(overwhelmed|too much|scattered)\b/.test(l)){next.context={...next.context,brain:'scattered',capacity:'soft'};reply=`I hear scattered. I’ll keep the visible choice set small and favor things that transition cleanly.`}
  else reply=conversationalFallback(next,raw);
  next=addTurn(next,'assistant',reply,{conversation:true});return{state:next,reply}
}

export function resolveClarification(state,target){const next=clone(state),p=next.mochini?.pendingProposal;if(!p||p.kind!=='clarify-task-reminder')return next;next.mochini.pendingProposal=target==='reminder'?proposedReminder(p.payload.label,p.payload.date):proposedTask(p.payload.label,p.payload.date);const message=target==='reminder'?`Perfect 🔔 I’ll stage it as a Little Ping. Nothing is created until you approve it.`:`Perfect 📝 I’ll stage it as a Sweet To-Do. Nothing is created until you approve it.`;return addTurn(next,'assistant',message,{proposal:true})}
export function rejectProposal(state){const next=clone(state);next.mochini.pendingProposal=null;return addTurn(next,'assistant',`Got it 😊 I won’t add it.`)}
export function clearChat(state){const next=clone(state);next.mochini={...next.mochini,conversation:[],pendingProposal:null};return next}
