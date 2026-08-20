import{createTask}from'../app/tasks.js';
import{createReminder}from'../app/reminders.js';

export const MOCHINI_ACTIONS_VERSION=2;

const text=value=>String(value??'').trim();
const pad=n=>String(n).padStart(2,'0');
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays=(date,days)=>{const d=new Date(date);d.setDate(d.getDate()+days);return d};
const makeId=()=>`proposal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const WEEKDAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const prettyDate=(key,now=new Date())=>{
  if(!key)return'';
  const today=dateKey(now),tomorrow=dateKey(addDays(now,1));
  if(key===today)return'today';
  if(key===tomorrow)return'tomorrow';
  const d=new Date(`${key}T12:00:00`);
  return Number.isNaN(d.getTime())?key:d.toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'});
};

function endOfWeek(now){
  const d=new Date(now),days=(7-d.getDay())%7;
  return dateKey(addDays(d,days));
}

function nextWeekday(now,name){
  const target=WEEKDAYS.indexOf(String(name).toLowerCase());
  if(target<0)return'';
  const current=now.getDay(),delta=(target-current+7)%7;
  return dateKey(addDays(now,delta));
}

function inferWhen(input,now){
  const lower=input.toLowerCase();
  if(/before bed|before i go to bed|before going to bed/.test(lower))return{date:dateKey(now),timing:'before_bed',label:'before bed'};
  if(/tonight/.test(lower))return{date:dateKey(now),timing:'specific',label:'tonight'};
  if(/\btoday\b/.test(lower))return{date:dateKey(now),timing:'specific',label:'today'};
  if(/\btomorrow\b/.test(lower))return{date:dateKey(addDays(now,1)),timing:'specific',label:'tomorrow'};
  if(/before (the )?end of (the )?week|by (the )?end of (the )?week|this week|end of (the )?week/.test(lower)){
    const date=endOfWeek(now);return{date,timing:'specific',label:prettyDate(date,now)};
  }
  const weekday=lower.match(/\b(?:by|before|on)\s+(?:this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if(weekday){const date=nextWeekday(now,weekday[1]);return{date,timing:'specific',label:prettyDate(date,now)}}
  return{date:'',timing:'specific',label:''};
}

function actionClause(input){
  const source=text(input);
  const patterns=[
    /(?:^|\b(?:and|also|but)\s+)i\s+(?:totally\s+)?forgot\s+(?:that\s+)?(.+)$/i,
    /(?:^|\b(?:and|also|but)\s+)i\s+(?:just\s+)?remembered\s+(?:that\s+)?(.+)$/i,
    /(?:^|\b(?:and|also|but)\s+)i\s+(?:really\s+)?(?:need|have|gotta|must)\s+(?:to\s+)?(.+)$/i,
    /(?:^|\b(?:and|also|but)\s+)we\s+(?:really\s+)?(?:need|have|gotta|must)\s+(?:to\s+)?(.+)$/i,
    /(?:^|\b(?:and|also|but)\s+)(?:remind me|don't let me forget|dont let me forget)\s+(?:to\s+)?(.+)$/i
  ];
  for(const pattern of patterns){const match=source.match(pattern);if(match?.[1])return match[1].trim()}
  return source;
}

function cleanTitle(input){
  let value=actionClause(input)
    .replace(/^(?:crap|ugh|omg|shoot|damn|oops|girl)[,! ]*/i,'')
    .replace(/^mochini[,! ]*/i,'')
    .replace(/^(?:crap|ugh|omg|shoot|damn|oops|girl)[,! ]*/i,'')
    .replace(/^i\s+(?:totally\s+)?forgot\s+(?:that\s+)?/i,'')
    .replace(/^i\s+(?:just\s+)?remembered\s+(?:that\s+)?/i,'')
    .replace(/^i\s+(?:really\s+)?(?:need|have|gotta|must)\s+(?:to\s+)?/i,'')
    .replace(/^we\s+(?:really\s+)?(?:need|have|gotta|must)\s+(?:to\s+)?/i,'')
    .replace(/^(?:remind me|don't let me forget|dont let me forget)\s+(?:to\s+)?/i,'')
    .replace(/\s+(?:before|by)\s+(?:the\s+)?end\s+of\s+(?:the\s+)?week\b.*$/i,'')
    .replace(/\s+this\s+week\b.*$/i,'')
    .replace(/\s+(?:tonight|today|tomorrow)\b.*$/i,'')
    .replace(/\s+before\s+(?:i\s+go\s+to\s+)?bed\b.*$/i,'')
    .replace(/\s+(?:by|before|on)\s+(?:this\s+)?(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b.*$/i,'')
    .replace(/[.!?]+$/,'')
    .trim();
  if(!value)value='Untitled thing';
  return value.charAt(0).toUpperCase()+value.slice(1);
}

export function proposeFromMessage(message,nowValue=new Date()){
  const input=text(message),lower=input.toLowerCase(),now=nowValue instanceof Date?nowValue:new Date(nowValue);
  if(!input)return null;
  const clause=actionClause(input),when=inferWhen(clause,now);
  const reminderScore=(/remind me|don't let me forget|dont let me forget|i forgot|forgot i|i just remembered/.test(lower)?3:0)+(when.date?2:0)+(/\bbefore\b|\bby\b|tonight|tomorrow|this week/.test(clause.toLowerCase())?1:0);
  const taskScore=(/\bi (?:really )?(?:need|have|gotta|must) (?:to )?/.test(lower)?2:0)+(/\bwe (?:really )?(?:need|have|gotta|must) (?:to )?/.test(lower)?2:0);
  if(reminderScore===0&&taskScore===0)return null;

  const kind=reminderScore>=taskScore?'reminder':'task';
  const title=cleanTitle(input),id=makeId();
  const proposal={
    id,
    kind,
    title,
    status:'pending',
    requiresApproval:true,
    originalMessage:input,
    createdAt:new Date().toISOString(),
    payload:kind==='reminder'
      ?{title,date:when.date,timing:when.timing,source:'mochini',sourceProposalId:id}
      :{text:title,date:when.date,energy:'medium',initiation:'easy',minutes:15,mode:'any',protected:false,source:'mochini',sourceProposalId:id}
  };
  proposal.reply=kind==='reminder'
    ?`That’s okay Kat 😊 Would you like me to make “${title}” a Little Ping${when.label?` for ${when.label}`:''}?`
    :`Got you 😊 Would you like me to add “${title}” to Sweet To-Dos${when.label?` for ${when.label}`:''}?`;
  return proposal;
}

export function stageProposal(state={},proposal){
  if(!proposal)return state;
  return{...state,mochini:{...(state.mochini||{}),pendingProposal:{...proposal,status:'pending'}}};
}

export function approveProposal(state={}){
  const proposal=state.mochini?.pendingProposal;
  if(!proposal||proposal.status!=='pending')return{state,created:null};
  const now=new Date().toISOString(),life=state.life||{},insights=state.insights||{};
  let created=null,nextLife=life;
  if(proposal.kind==='task'){
    created=createTask(proposal.payload);
    nextLife={...life,tasks:[...(Array.isArray(life.tasks)?life.tasks:[]),created]};
  }else if(proposal.kind==='reminder'){
    created=createReminder(proposal.payload);
    nextLife={...life,reminders:[...(Array.isArray(life.reminders)?life.reminders:[]),created]};
  }else return{state,created:null};
  const event={id:`activity-${Date.now().toString(36)}`,type:`mochini.${proposal.kind}.approved`,targetId:created.id,proposalId:proposal.id,timestamp:now};
  const next={...state,life:nextLife,insights:{...insights,activityLog:[...(Array.isArray(insights.activityLog)?insights.activityLog:[]),event]},mochini:{...(state.mochini||{}),pendingProposal:null,lastProposal:{...proposal,status:'approved',resolvedAt:now}}};
  return{state:next,created};
}

export function rejectProposal(state={}){
  const proposal=state.mochini?.pendingProposal;
  if(!proposal)return state;
  const now=new Date().toISOString();
  return{...state,mochini:{...(state.mochini||{}),pendingProposal:null,lastProposal:{...proposal,status:'rejected',resolvedAt:now}}};
}
