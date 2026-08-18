import{normalizeMochini}from'./data.js?v=22.1.20-20260817';

// Conversation is planner data, but is intentionally bounded so it cannot grow a snapshot forever.
export const MAX_MOCHINI_CONVERSATION=80;
const id=()=>`mochini-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const text=value=>String(value??'').trim().slice(0,2000);
const reasonCodes=value=>(Array.isArray(value)?value:[]).map(reason=>typeof reason==='string'?reason:reason?.code).filter(Boolean).slice(0,6);

export function conversationEvidence(result={}){
 const recommendation=result.recommendation;
 return{recommendation:recommendation?.task?.id?{taskId:String(recommendation.task.id),reasons:reasonCodes(recommendation.reasons)}:null,reason:text(result.reason||'').slice(0,300)};
}

export function conversationSession(state={}){
 const conversation=normalizeMochini(state.mochini).conversation,lastKat=[...conversation].reverse().find(turn=>turn?.role==='kat'),lastMochini=[...conversation].reverse().find(turn=>turn?.role==='mochini'),saved=lastMochini?.evidence?.recommendation;
 const task=saved?.taskId?(state.tasks||[]).find(item=>String(item?.id)===String(saved.taskId)):null;
 return{lastIntent:lastMochini?.intent||null,lastUserQuestion:lastKat?.text||null,lastRecommendation:task?{task,reasons:(saved?.reasons||[]).map(code=>({code}))}:null,lastReasons:(saved?.reasons||[]).map(code=>({code}))};
}

export function appendConversation(store,{role,text:message,intent=null,evidence=null,choices=[],escalation=false}={}){
 const safeRole=role==='kat'||role==='mochini'?role:null,safeText=text(message);if(!safeRole||!safeText)return{ok:false,error:'A conversation message needs a role and text.'};
 let saved=null;store.update(state=>{const mochini=normalizeMochini(state.mochini),entry={id:id(),role:safeRole,text:safeText,createdAt:new Date().toISOString(),intent:intent||null,evidence:evidence&&typeof evidence==='object'?evidence:null,choices:Array.isArray(choices)?choices.slice(0,4):[],escalation:!!escalation};saved=entry;return{...state,mochini:{...mochini,conversation:[...mochini.conversation,entry].slice(-MAX_MOCHINI_CONVERSATION)}}});return{ok:true,entry:saved};
}

export function clearConversation(store){store.update(state=>({...state,mochini:{...normalizeMochini(state.mochini),conversation:[]}}));return{ok:true};}
