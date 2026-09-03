import{createTask}from'../app/tasks.js';
import{createReminder}from'../app/reminders.js';

export const MOCHINI_ACTIONS_VERSION=3;

const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const pad=n=>String(n).padStart(2,'0');
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays=(date,days)=>{const d=new Date(date);d.setDate(d.getDate()+days);return d};
const makeId=(prefix='proposal')=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const WEEKDAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const ACTION_VERBS='clean|put|wash|take|call|send|buy|get|make|finish|fold|fill|do|pick|schedule|email|pay|go|visit|study|watch|complete|submit|book|order|return|drop|bring|pack|charge|print|turn|move|check|cancel|renew|write|read';

const prettyDate=(key,now=new Date())=>{
  if(!key)return'';
  const today=dateKey(now),tomorrow=dateKey(addDays(now,1));
  if(key===today)return'today';
  if(key===tomorrow)return'tomorrow';
  const d=new Date(`${key}T12:00:00`);
  return Number.isNaN(d.getTime())?key:d.toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'});
};

function endOfWeek(now){const d=new Date(now),days=(7-d.getDay())%7;return dateKey(addDays(d,days))}
function nextWeekday(now,name){const target=WEEKDAYS.indexOf(String(name).toLowerCase());if(target<0)return'';const delta=(target-now.getDay()+7)%7;return dateKey(addDays(now,delta))}

function inferWhen(input,now){
  const lower=input.toLowerCase();
  if(/before bed|before i go to bed|before going to bed/.test(lower))return{date:dateKey(now),timing:'before_bed',label:'before bed'};
  if(/\btonight\b/.test(lower))return{date:dateKey(now),timing:'specific',label:'tonight'};
  if(/\btoday\b/.test(lower))return{date:dateKey(now),timing:'specific',label:'today'};
  if(/\btomorrow\b/.test(lower))return{date:dateKey(addDays(now,1)),timing:'specific',label:'tomorrow'};
  if(/before (the )?end of (the )?week|by (the )?end of (the )?week|this week|end of (the )?week/.test(lower)){const date=endOfWeek(now);return{date,timing:'specific',label:prettyDate(date,now)}}
  const weekday=lower.match(/\b(?:by|before|on)\s+(?:this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if(weekday){const date=nextWeekday(now,weekday[1]);return{date,timing:'specific',label:prettyDate(date,now)}}
  return{date:'',timing:'specific',label:''};
}

function stripLead(input){
  return text(input)
    .replace(/^(?:crap|ugh|omg|shoot|damn|oops|girl)[,! ]*/i,'')
    .replace(/^mochini[,! ]*/i,'')
    .replace(/^(?:please\s+)?(?:add|make|create)\s+(?:me\s+)?(?:a\s+)?(?:reminder|little ping)\s+(?:to\s+)?/i,'')
    .replace(/^(?:please\s+)?(?:remind me|ping me|don't let me forget|dont let me forget)\s+(?:to\s+)?/i,'')
    .replace(/^(?:please\s+)?(?:add|make|create)\s+(?:this\s+)?(?:as\s+)?(?:a\s+)?(?:task|sweet to-?do)\s*(?:to\s+)?/i,'')
    .replace(/^i\s+(?:also\s+)?(?:totally\s+)?forgot\s+(?:that\s+)?/i,'')
    .replace(/^i\s+(?:also\s+)?(?:just\s+)?remembered\s+(?:that\s+)?/i,'')
    .replace(/^i\s+(?:also\s+)?(?:really\s+)?(?:need|have|gotta|must)\s+(?:to\s+)?/i,'')
    .replace(/^we\s+(?:also\s+)?(?:really\s+)?(?:need|have|gotta|must)\s+(?:to\s+)?/i,'')
    .replace(/^(?:i\s+)?have\s+to\s+/i,'')
    .replace(/^(?:i\s+)?gotta\s+/i,'')
    .replace(/^need\s+to\s+/i,'')
    .trim();
}

function removeTiming(input){
  return text(input)
    .replace(/\s+(?:before|by)\s+(?:the\s+)?end\s+of\s+(?:the\s+)?week\b.*$/i,'')
    .replace(/\s+this\s+week\b.*$/i,'')
    .replace(/\s+(?:tonight|today|tomorrow)\b.*$/i,'')
    .replace(/\s+before\s+(?:i\s+go\s+to\s+)?bed\b.*$/i,'')
    .replace(/\s+(?:by|before|on)\s+(?:this\s+)?(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b.*$/i,'')
    .trim();
}

function titleCaseAction(input){
  let value=removeTiming(stripLead(input)).replace(/^\d+[.)]\s*/,'').replace(/^[,;:\-\s]+|[,;:\-\s]+$/g,'').replace(/[.!?]+$/,'').trim();
  if(!value)value='Untitled thing';
  return value.charAt(0).toUpperCase()+value.slice(1);
}

function extractActions(input){
  const source=removeTiming(stripLead(input));
  const numbered=[...source.matchAll(/(?:^|\s)(?:\d+)[.)]\s*([^\n]+?)(?=(?:\s+\d+[.)]\s*)|$)/g)].map(m=>text(m[1])).filter(Boolean);
  if(numbered.length>=2)return numbered.slice(0,3).map(titleCaseAction);
  const semis=source.split(/\s*;\s*/).map(text).filter(Boolean);
  if(semis.length>=2)return semis.slice(0,3).map(titleCaseAction);
  const parts=source.split(/\s+(?:and then|then|and)\s+/i).map(text).filter(Boolean);
  if(parts.length>=2&&parts.length<=3&&parts.slice(1).every(part=>new RegExp(`^(?:to\\s+)?(?:${ACTION_VERBS})\\b`,'i').test(part)))return parts.map(titleCaseAction);
  return[titleCaseAction(source)];
}

function reminderIntent(lower){return /\b(remind me|ping me|add (?:a )?reminder|make (?:a )?reminder|create (?:a )?reminder|little ping|don't let me forget|dont let me forget)\b/.test(lower)}
function explicitTaskIntent(lower){return /\b(add|make|create)\b.{0,18}\b(task|sweet to-?do)\b/.test(lower)||/\b(i|we)\s+(?:also\s+)?(?:really\s+)?(?:have|gotta|must)\s+(?:to\s+)?/.test(lower)||/\bi\s+need\s+to\b/.test(lower)}
function vagueActionIntent(input){const lower=input.toLowerCase().trim();return /^need\s+to\s+\S+/.test(lower)||new RegExp(`^(?:${ACTION_VERBS})\\b`,'i').test(lower)}

function normalProposal(kind,title,when,input){
  const id=makeId();
  const proposal={id,kind,title,status:'pending',requiresApproval:true,originalMessage:input,createdAt:new Date().toISOString(),payload:kind==='reminder'?{title,date:when.date,time:'',timing:when.timing,source:'mochini',sourceProposalId:id}:{text:title,date:when.date,energy:'medium',initiation:'easy',minutes:15,mode:'any',protected:false,source:'mochini',sourceProposalId:id}};
  proposal.reply=kind==='reminder'?`Got you 😊 Want me to make “${title}” a Little Ping${when.label?` for ${when.label}`:''}?`:`Got you 😊 Want me to add “${title}” to Sweet To-Dos${when.label?` for ${when.label}`:''}?`;
  return proposal;
}

export function proposeFromMessage(message,nowValue=new Date()){
  const input=text(message),lower=input.toLowerCase(),now=nowValue instanceof Date?nowValue:new Date(nowValue);
  if(!input)return null;
  const when=inferWhen(input,now),actions=extractActions(input);
  if(reminderIntent(lower))return normalProposal('reminder',actions[0],when,input);
  if(explicitTaskIntent(lower)){
    if(actions.length>1){const items=actions.slice(0,3).map(action=>normalProposal('task',action,when,input));return{id:makeId('batch'),kind:'batch',title:`${items.length} Sweet To-Dos`,items,status:'pending',requiresApproval:true,originalMessage:input,createdAt:new Date().toISOString(),reply:`I caught ${items.length} separate things 😊 ${items.map((x,i)=>`${i+1}. ${x.title}`).join('  ')} Want me to add all ${items.length} to Sweet To-Dos?`}}
    return normalProposal('task',actions[0],when,input);
  }
  if(vagueActionIntent(input)){
    const title=actions[0],id=makeId('clarify');
    return{id,kind:'clarification',title,status:'pending',requiresApproval:true,originalMessage:input,createdAt:new Date().toISOString(),payload:{title,date:when.date,timing:when.timing},reply:`I’m a little confused on the context 😊 Do you want “${title}” in Sweet To-Dos or as a Little Ping?`};
  }
  return null;
}

export function stageProposal(state={},proposal){
  if(!proposal)return state;
  const previous=state.mochini?.pendingProposal,now=new Date().toISOString();
  return{...state,mochini:{...(state.mochini||{}),pendingProposal:{...proposal,status:'pending'},lastProposal:previous?{...previous,status:'superseded',resolvedAt:now}:state.mochini?.lastProposal||null}};
}

export function resolveClarification(state={},kind='task'){
  const pending=state.mochini?.pendingProposal;
  if(!pending||pending.kind!=='clarification'||!['task','reminder'].includes(kind))return state;
  const when={date:text(pending.payload?.date),timing:text(pending.payload?.timing)||'specific',label:''},proposal=normalProposal(kind,pending.title,when,pending.originalMessage||pending.title);
  return stageProposal({...state,mochini:{...(state.mochini||{}),pendingProposal:null,lastProposal:{...pending,status:'clarified',resolvedAt:new Date().toISOString()}}},proposal);
}

export function approveProposal(state={}){
  const proposal=state.mochini?.pendingProposal;
  if(!proposal||proposal.status!=='pending')return{state,created:null,createdItems:[]};
  const now=new Date().toISOString(),life=state.life||{},insights=state.insights||{};
  let createdItems=[],nextLife=life;
  if(proposal.kind==='task'){
    const created=createTask(proposal.payload);createdItems=[created];nextLife={...life,tasks:[...list(life.tasks),created]};
  }else if(proposal.kind==='reminder'){
    const created=createReminder(proposal.payload);createdItems=[created];nextLife={...life,reminders:[...list(life.reminders),created]};
  }else if(proposal.kind==='batch'){
    createdItems=list(proposal.items).slice(0,3).filter(x=>x.kind==='task').map(item=>createTask(item.payload));nextLife={...life,tasks:[...list(life.tasks),...createdItems]};
  }else return{state,created:null,createdItems:[]};
  const events=createdItems.map(created=>({id:`activity-${Date.now().toString(36)}-${created.id}`,type:`mochini.${proposal.kind==='batch'?'task':proposal.kind}.approved`,targetId:created.id,proposalId:proposal.id,timestamp:now}));
  const next={...state,life:nextLife,insights:{...insights,activityLog:[...list(insights.activityLog),...events]},mochini:{...(state.mochini||{}),pendingProposal:null,lastProposal:{...proposal,status:'approved',resolvedAt:now}}};
  const created=proposal.kind==='batch'?{text:`${createdItems.length} Sweet To-Dos`,id:proposal.id}:createdItems[0]||null;
  return{state:next,created,createdItems};
}

export function rejectProposal(state={}){
  const proposal=state.mochini?.pendingProposal;
  if(!proposal)return state;
  const now=new Date().toISOString();
  return{...state,mochini:{...(state.mochini||{}),pendingProposal:null,lastProposal:{...proposal,status:'rejected',resolvedAt:now}}};
}
