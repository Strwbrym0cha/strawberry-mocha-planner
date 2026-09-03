import{makeId,localDateKey,isArchived}from'./store.js?v=4.0.0-preview.2';import{getLoreResponse}from'./mochini-lore.js';
import{feedMeRecommendation}from'./journey.js?v=4.0.0-recovery26';
const text=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:[];
const clone=v=>structuredClone(v);
const lower=v=>text(v).toLowerCase();const normalizeMessage=value=>lower(value).normalize('NFKC').replace(/[’‘`]/g,"'").replace(/\s+/g,' ').replace(/[!?.,]+$/,'').trim();const isMochiniActivityQuestion=value=>{const q=normalizeMessage(value).replace(/^(hi|hey|hello|good morning|good afternoon|good evening)\s+mochini\s+/,'');return q==='wyd'||/^(what are you doing|what are ya doing|what you doing|what you up to|what are you up to|whatcha doing|whatcha doin|whatcha doin+)$/i.test(q)};
const addTurn=(s,role,message,meta={})=>{s.mochini={...s.mochini,conversation:[...list(s.mochini?.conversation),{id:makeId('turn'),role,text:message,at:new Date().toISOString(),meta}].slice(-100)};return s};
const stripLead=s=>text(s).replace(/^(mochini[,:]?\s*)/i,'').trim();
const titleCase=s=>text(s).replace(/^\w/,c=>c.toUpperCase());
const DATE_WORDS={today:0,tomorrow:1};
function relativeDate(raw){const l=lower(raw);for(const[k,offset]of Object.entries(DATE_WORDS))if(l.includes(k)){const d=new Date();d.setDate(d.getDate()+offset);return localDateKey(d)}return''}
function cleanTaskLabel(s){return titleCase(text(s).replace(/^(i\s+)?(need|have|got)\s+to\s+/i,'').replace(/^(please\s+)?(add|make|create)\s+(a\s+)?(task|to-?do)\s+(to\s+)?/i,'').replace(/^(remind me to|add (a )?reminder to|make (a )?reminder to)\s+/i,'').replace(/\b(today|tomorrow)\b/ig,'').replace(/[.!]+$/,'').trim())}
function splitActions(raw){let s=stripLead(raw);const numbered=[...s.matchAll(/(?:^|\s)(?:\d+[.)]|[-•])\s*([^]+?)(?=(?:\s\d+[.)]|\s[-•]|$))/g)].map(m=>cleanTaskLabel(m[1])).filter(Boolean);if(numbered.length>=2)return numbered.slice(0,3);s=s.replace(/^(okay|ok|now|then|also|i have to|i need to)\s*/i,'').trim();const parts=s.split(/\s+(?:and then|then|and also|also|and)\s+/i).map(cleanTaskLabel).filter(x=>x&&x.split(/\s+/).length<=16);return parts.length>=2?parts.slice(0,3):[]}
function explicitReminder(raw){return /\b(remind me|add (me )?(a )?reminder|make (me )?(a )?reminder|little ping|ping me)\b/i.test(raw)}
function explicitTask(raw){return /\b(add (me )?(a )?(task|to-?do)|make (me )?(a )?(task|to-?do)|sweet to-?do|task:)\b/i.test(raw)||/^add\s+.+\b(today|tomorrow)\b/i.test(stripLead(raw))}
function looksAmbiguousAction(raw){const s=stripLead(raw);return /^(need|need to|gotta|got to|have to|remember to)\b/i.test(s)&&s.split(/\s+/).length<=8}
function looksBrainDump(raw){return /\b(brain dump|random thought|idea:|kat ?os idea|hobby idea|language idea)\b/i.test(raw)}
function chooseBucket(raw){const l=lower(raw);if(/negative|rant|hate|awful|terrible|closed drawer/.test(l))return'closed';if(/language/.test(l))return'language';if(/hobby/.test(l))return'hobby';if(/kat ?os/.test(l))return'katos';if(/idea/.test(l))return'idea';return'inbox'}
function nextTaskSuggestion(state){const today=localDateKey(),tasks=list(state.life?.tasks).filter(t=>!t.done&&!isArchived(state,'task',t.id)&&(!t.date||t.date<=today));const energy=state.context?.energy||'okay';const score=t=>{let n=0;if(t.protected)n+=100;if(t.date&&t.date<today)n+=50;else if(t.date===today)n+=30;const er={low:0,medium:1,high:2}[t.energy]??1;const ceiling=energy==='energized'?2:energy==='drained'?0:1;if(er<=ceiling)n+=25;else n-=20;if(Number(t.minutes||15)<=15)n+=8;return n};return tasks.sort((a,b)=>score(b)-score(a)||Number(a.minutes||15)-Number(b.minutes||15))[0]||null}
function feedMeReply(state,raw){if(!/\b(feed me|what (?:can|should) i eat|what(?:'s| is) for (?:food|dinner|lunch|breakfast)|i(?:'m| am) hungry|food idea|something (?:quick|easy) to eat)\b/i.test(raw))return'';const lowEnergy=/\b(quick|easy|low energy|tired|drained|no energy)\b/i.test(raw)||state.context?.energy==='drained'||state.context?.capacity==='soft';const pick=feedMeRecommendation(state,{lowEnergy});if(!pick)return`I don’t have a saved available Nom or ready meal prep to choose from yet. Add one in Food + Journey and I’ll keep it honest instead of inventing dinner. 🍓`;const source=pick.source==='meal-prep'?'ready meal prep':'saved Nom';return`Feed-me verdict: ${pick.name}. It’s a ${source}${Number(pick.prepMinutes||0)?` and takes about ${Number(pick.prepMinutes)} minutes`:''}. ${lowEnergy?'I kept the pick gentle.':''} 🍱`}

function minutesOfTime(value){const m=text(value).match(/^(\d{1,2}):(\d{2})/);if(!m)return null;return Number(m[1])*60+Number(m[2])}
function nowMinutes(now=new Date()){return now.getHours()*60+now.getMinutes()}
function inClockWindow(now,start,end){return start<=end?now>=start&&now<=end:now>=start||now<=end}
function circularDiff(now,target){let diff=now-target;while(diff>720)diff-=1440;while(diff<-720)diff+=1440;return diff}
function routineOccursToday(state,r,now=new Date()){
  if(!r||r.archived||isArchived(state,'routine',r.id))return false;
  const day=now.getDay(),rec=text(r.recurrence)||'daily',date=localDateKey(now);
  if(rec==='manual')return list(state.life?.routineInstances).some(x=>String(x.routineId)===String(r.id)&&x.date===date);
  if(rec==='weekdays')return day>=1&&day<=5;
  if(rec==='weekends')return day===0||day===6;
  if(rec==='selected')return list(r.days).map(Number).includes(day);
  return true;
}
function routineInstanceToday(state,r,now=new Date()){const date=localDateKey(now);return list(state.life?.routineInstances).find(x=>String(x.routineId)===String(r.id)&&x.date===date)||null}
function routineTimeAvailable(r,now=new Date()){
  const target=minutesOfTime(r?.preferredTime||r?.time||r?.startTime),mins=nowMinutes(now);
  if(target!==null){const diff=circularDiff(mins,target);return diff>=-120&&diff<=240}
  const part=lower(r?.daypart);
  if(!part||part==='any'||part==='anytime')return true;
  if(part==='morning')return inClockWindow(mins,300,720);
  if(part==='daytime'||part==='day')return inClockWindow(mins,600,1080);
  if(part==='evening')return inClockWindow(mins,990,1320);
  if(part==='bedtime'||part==='night'||part==='nighttime')return inClockWindow(mins,1200,180);
  return true;
}
function routineRelevantNow(state,r,now=new Date()){
  if(!routineOccursToday(state,r,now)||!routineTimeAvailable(r,now))return false;
  const inst=routineInstanceToday(state,r,now);
  return !inst||!['completed','skipped','deferred'].includes(inst.status);
}
function whatNowReply(state){const task=nextTaskSuggestion(state);const now=new Date(),today=localDateKey(now),event=list(state.life?.events).filter(x=>x.date===today&&x.startTime).sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime)))[0];const routine=list(state.life?.routines).find(r=>routineRelevantNow(state,r,now));const bits=[];if(event)bits.push(`your calendar has “${event.title}” at ${event.startTime}`);if(task)bits.push(`the best-fit Sweet To-Do is “${task.text||task.title}”`);if(routine)bits.push(`you also have ${routine.name||routine.title} available right now`);if(!bits.length)return`Your board is pretty open right now ✨ You can rest on purpose, pick a hobby, or throw me a brain dump and I’ll help shape the day.`;return`Here’s what I’m weighing: ${bits.join('; ')}. ${task?`I’d start with “${task.text||task.title}” because it fits the strongest combination of urgency + your current context.`:'Nothing needs to be forced just to fill space.'}`}
function proposedTask(label,date=''){return{id:makeId('proposal'),kind:'task',title:label,payload:{text:label,date,minutes:15,energy:'medium',initiation:'easy',mode:'any',protected:false}}}
function proposedReminder(label,date=''){return{id:makeId('proposal'),kind:'reminder',title:label,payload:{title:label,date,time:'',timing:'specific'}}}

function recentUserMessages(state){return list(state.mochini?.conversation).filter(turn=>turn.role==='user').map(turn=>text(turn.text)).filter(Boolean).slice(-6)}
function previousUserMessage(state){const messages=recentUserMessages(state);return messages.length>1?messages.at(-2):''}
function hangoutContext(raw){const s=text(raw);const patterns=[/\b(?:hang out|hangout|chill|spend time|go out)\s+with\s+([^,.!?]+)/i,/\bsee\s+([^,.!?]+)\s+(?:today|tomorrow|this weekend|later)/i];for(const pattern of patterns){const match=s.match(pattern);if(match?.[1])return{person:titleCase(match[1].trim().replace(/\s+(today|tomorrow|later|this weekend)$/i,'')),text:s}}return null}
function recentHangoutContext(state){const messages=recentUserMessages(state);for(let i=messages.length-2;i>=0;i--){const found=hangoutContext(messages[i]);if(found)return found}return null}
function isCasualHangoutStatement(raw){return /\b(?:wanna|want to|would like to|feel like|thinking about)\s+(?:hang out|hangout|chill|spend time|go out)\b/i.test(raw)&&!!hangoutContext(raw)}
function hangoutStarterReply(raw){const ctx=hangoutContext(raw);if(!ctx)return'';return`Okayyy, ${ctx.person} time 👀 Are we feeling stay-in-and-cuddle, food + wandering around somewhere, or an actual activity? I can help you pick without turning it into a task.`}
function casualFollowupReply(state,raw){
  const followup=/^(what should we do|what can we do|what do we do|what should we do together|any ideas|give me ideas|where should we go|what should we do for fun|what can we do for fun)[?.!]*$/i.test(text(raw));
  if(!followup)return'';
  const hangout=recentHangoutContext(state);
  if(hangout)return`With ${hangout.person}? Bet 😭 Pick your flavor: 1) grab food and wander a store/bookshop, 2) movie + snacks, 3) arcade/mini golf/bowling, 4) coffee or boba + a drive and yap session, or 5) stay in with takeout and a show. Tell me “cheap,” “at home,” “outside,” or “date-ish” and I’ll narrow it down.`;
  const previous=previousUserMessage(state);if(previous)return`I’m following you. You were talking about “${previous}.” Give me the vibe you want from it and I’ll actually help you choose instead of filing it somewhere.`;
  return`Absolutely. Give me one crumb of context about who “we” is and the vibe you want, and I’ll give you actual options.`
}
function hangoutChoiceReply(state,raw){const hangout=recentHangoutContext(state);if(!hangout)return'';if(!/^(let'?s|we should|we can|i'?m feeling|i want to|i wanna|stay in|movie|food|arcade|bowling|mini golf|coffee|boba)\b/i.test(text(raw)))return'';return`Cute, locked in as the vibe, not a task 😭💕 ${hangout.person} + ${text(raw).replace(/^let'?s\s+(do\s+)?/i,'').replace(/[.!]+$/,'')}. If you want, I can keep helping you flesh out the plan.`}
function conversationalFallback(state,raw){const previous=previousUserMessage(state);if(previous&&/^(why|how|what about|and then|okay but|but what|tell me more)\b/i.test(raw))return`I’m following the thread. You were talking about “${previous}.” Keep going and I’ll stay with that topic instead of trying to turn it into planner data.`;return`I’m with you 😊 I’m keeping that as conversation. You can keep talking, ask me for ideas, or ask me to help decide something. I won’t turn it into planner data unless you actually ask me to.`}

function greetingReply(raw,now=new Date()){
  const l=lower(raw).replace(/[.!?]+$/,'').trim();
  if(!/^(hi|hii+|hey|heyy+|hello|hiya|good morning|good afternoon|good evening)(?:\s+mochini)?$/.test(l))return'';
  if(l.startsWith('good morning'))return`Good morninggg 🍓 I’m awake and conducting tiny bean business. What’s up?`;
  if(l.startsWith('good afternoon'))return`Good afternoonnn 🍡✨ I’m here. What are we getting into?`;
  if(l.startsWith('good evening'))return`Good evening ✨ Tiny bean reporting for duty. What’s on your mind?`;
  return`Hiiii 🍡✨ I’m here. What’s up?`;
}
export function classifyMochiniAIIntent(raw){
  const l=lower(raw);
  if(/\b(help me (?:plan|decide|figure out|prioriti[sz]e)|can you help me (?:plan|decide|figure out|prioriti[sz]e)|how should i (?:plan|decide|prioriti[sz]e)|what should i do (?:tomorrow|today|this week|this weekend)|unscheduled day|open day|free day)\b/.test(l))return'planning';
  if(/\b(should i|what would make sense|help me choose|which should i|break (?:this|it) down|think through|reason through)\b/.test(l))return'reasoning';
  return'';
}
function mochiniSelfReply(state,raw){const l=state?.mochini?.life||{},q=normalizeMessage(raw);if(/\b(what are you obsessed with|what'?s your obsession|what is your obsession)\b/.test(q))return l.currentObsession?`${titleCase(l.currentObsession)}. I haven’t worked out the logistics yet, but spiritually I’m already there.`:'Nothing dramatic right now. I’m between obsessions and accepting tiny mysteries.';if(/\b(what are you doing|what are ya doing|whatcha doin|what you doing|what you up to|what are you up to|\\bwyd\\b)\b/.test(q))return`I’m currently ${l.currentActivity||'doing important bean business'}. It is very serious work, obviously.`;if(/\b(how are you feeling|what mood are you in|how are you)\b/.test(q))return`I’m feeling ${l.mood||'content'} with about ${Math.round(Number(l.energy)||0)} energy. Tiny status report complete.`;if(/\b(are you tired|how much energy do you have|what is your energy)\b/.test(q))return`I have ${Math.round(Number(l.energy)||0)}/100 energy, so I’m ${l.energy<30?'operating on bean fumes':l.energy<60?'doing okay, but pacing myself':'surprisingly powered up'}.`;if(/\b(how many berries did i give you|did i give you berries|how many berries.*today|berries.*today)\b/.test(q))return`You’ve given me ${Number(l.berriesFedToday)||0} berry${Number(l.berriesFedToday)===1?'':'ies'} today (${Number(l.berriesFedTotal)||0} total). My tiny stomach has filed the report.`;if(/\b(do you like me|do you love me)\b/.test(q))return`I like you in the affectionate tiny-bean way: ${Number(l.affection)||0}/100 approved. No dramatic contracts required.`;if(/\b(what do you want)\b/.test(q))return l.currentObsession?`I want to investigate ${l.currentObsession} and perhaps acquire a snack.`:'I want a small adventure, a reasonable snack, and zero alarm-clock negotiations.';return''}
export function appendMochiniResponse(state,message,meta={}){const next=clone(state);return addTurn(next,'assistant',message,meta)}

export function processMochini(state,input){let next=clone(state),raw=normalizeMessage(stripLead(input)),reply='';if(!raw)return{state:next,reply:'Girl you have to give me at least one crumb of context 😭',route:'local',requiresAI:false};next=addTurn(next,'user',raw);
  const greeting=greetingReply(raw);if(greeting){next=addTurn(next,'assistant',greeting,{conversation:true,greeting:true,local:true});return{state:next,reply:greeting,route:'local',requiresAI:false,intent:'greeting'}}
  const loreReply=getLoreResponse(next?.mochini?.lore,next?.mochini?.life,raw);if(loreReply){next=addTurn(next,'assistant',loreReply,{conversation:true,self:true,lore:true,local:true});return{state:next,reply:loreReply,route:'local',requiresAI:false,intent:'mochini_lore'}}
  if(isMochiniActivityQuestion(raw)){const line='I am currently '+(next.mochini?.life?.currentActivity||'doing important bean business')+'. It is very serious work, obviously.';next=addTurn(next,'assistant',line,{conversation:true,self:true,local:true});return{state:next,reply:line,route:'local',requiresAI:false,intent:'mochini_self'}}
  const selfReply=mochiniSelfReply(next,raw);if(selfReply){next=addTurn(next,'assistant',selfReply,{conversation:true,self:true,local:true});return{state:next,reply:selfReply,route:'local',requiresAI:false,intent:'mochini_self'}}
  const foodReply=feedMeReply(next,raw);if(foodReply){next=addTurn(next,'assistant',foodReply,{conversation:true,food:true,local:true});return{state:next,reply:foodReply,route:'local',requiresAI:false,intent:'feed_me'}}
  if(/^(what should i do( now)?|what do i do( now)?|pick for me)$/i.test(raw)){reply=whatNowReply(next);next=addTurn(next,'assistant',reply);return{state:next,reply,route:'local',requiresAI:false,intent:'what_now'}}
  const conversationalFollowup=casualFollowupReply(next,raw);if(conversationalFollowup){reply=conversationalFollowup;next=addTurn(next,'assistant',reply,{conversation:true,followup:true});return{state:next,reply}}
  const hangoutChoice=hangoutChoiceReply(next,raw);if(hangoutChoice&&!explicitTask(raw)&&!explicitReminder(raw)){reply=hangoutChoice;next=addTurn(next,'assistant',reply,{conversation:true,topic:'hangout'});return{state:next,reply}}
  if(looksBrainDump(raw)){const bucket=chooseBucket(raw),entry={id:makeId('dump'),text:raw.replace(/^(brain dump|random thought|idea:)\s*/i,''),bucket,createdAt:new Date().toISOString()};next.v4.brainDump=[...list(next.v4.brainDump),entry];reply=bucket==='closed'?`Locked it in the Closed Drawer 🔒 I won’t resurface it automatically.`:`Got it. I tossed that into ${bucket==='inbox'?'the unsorted pile':bucket} so you didn’t have to organize it first.`;next=addTurn(next,'assistant',reply);return{state:next,reply}}
  const date=relativeDate(raw),multi=splitActions(raw);
  if(multi.length>=2&&!explicitReminder(raw)){next.mochini.pendingProposal={id:makeId('proposal-batch'),kind:'task-batch',title:`${multi.length} Sweet To-Dos`,payload:{items:multi.map(label=>proposedTask(label,date).payload)}};reply=`I caught ${multi.length} separate things instead of making one giant Franken-task 😭 Want me to add all ${multi.length} to Sweet To-Dos?`;next=addTurn(next,'assistant',reply,{proposal:true});return{state:next,reply}}
  if(explicitReminder(raw)){const label=cleanTaskLabel(raw);next.mochini.pendingProposal=proposedReminder(label,date);reply=`Yep 🔔 I read that as a Little Ping: “${label}.” Add it?`;next=addTurn(next,'assistant',reply,{proposal:true});return{state:next,reply}}
  if(explicitTask(raw)){const label=cleanTaskLabel(raw);next.mochini.pendingProposal=proposedTask(label,date);reply=`Got you 📝 “${label}” belongs in Sweet To-Dos. Add it?`;next=addTurn(next,'assistant',reply,{proposal:true});return{state:next,reply,route:'local',requiresAI:false,intent:'task_proposal'}}
  const aiIntent=classifyMochiniAIIntent(raw);if(aiIntent)return{state:next,reply:'',route:'ai',requiresAI:true,intent:aiIntent};
  if(isCasualHangoutStatement(raw)){reply=hangoutStarterReply(raw);next=addTurn(next,'assistant',reply,{conversation:true,topic:'hangout'});return{state:next,reply}}
  if(looksAmbiguousAction(raw)){const label=cleanTaskLabel(raw);next.mochini.pendingProposal={id:makeId('clarify'),kind:'clarify-task-reminder',title:label,payload:{label,date}};reply=`I’m a little confused on the context 😊 Do you want “${label}” in Sweet To-Dos or as a Little Ping?`;next=addTurn(next,'assistant',reply,{clarify:true});return{state:next,reply}}
  const l=lower(raw);if(/\b(exhausted|drained|tired|no energy)\b/.test(l)){next.context={...next.context,energy:'drained',capacity:'soft'};reply=`Got you. I’m treating today like low-capacity mode, not a moral emergency. We can shrink choices instead of pretending you suddenly became a productivity robot.`}
  else if(/\b(locked in|lock in|so much energy|energized|productive)\b/.test(l)){next.context={...next.context,energy:'energized',capacity:'big'};reply=`Okayyy, power is online ⚡ I’ll favor the important/high-energy stuff first and leave the softer tasks for the landing.`}
  else if(/\b(overwhelmed|too much|scattered)\b/.test(l)){next.context={...next.context,brain:'scattered',capacity:'soft'};reply=`I hear scattered. I’ll keep the visible choice set small and favor things that transition cleanly.`}
  else return{state:next,reply:'',route:'ai',requiresAI:true,intent:'open_conversation'};
  next=addTurn(next,'assistant',reply,{conversation:true});return{state:next,reply,route:'local',requiresAI:false}
}

export function resolveClarification(state,target){const next=clone(state),p=next.mochini?.pendingProposal;if(!p||p.kind!=='clarify-task-reminder')return next;next.mochini.pendingProposal=target==='reminder'?proposedReminder(p.payload.label,p.payload.date):proposedTask(p.payload.label,p.payload.date);const message=target==='reminder'?`Perfect 🔔 I’ll stage it as a Little Ping. Nothing is created until you approve it.`:`Perfect 📝 I’ll stage it as a Sweet To-Do. Nothing is created until you approve it.`;return addTurn(next,'assistant',message,{proposal:true})}
export function rejectProposal(state){const next=clone(state);next.mochini.pendingProposal=null;return addTurn(next,'assistant',`Got it 😊 I won’t add it.`)}
export function clearChat(state){const next=clone(state);next.mochini={...next.mochini,conversation:[],pendingProposal:null};return next}
