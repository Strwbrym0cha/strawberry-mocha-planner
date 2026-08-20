import{inferContextPatch,updateContext,describeContextPatch}from'../app/context.js?v=3.0.0-alpha.5';
import{evaluateStateBrain}from'../app/brain.js';
import{inventorySummary,normalizeNoms}from'../app/noms.js?v=3.0.0-alpha.16';
import{isArchived}from'../app/archive-policy.js?v=2';
import{proposeFromMessage,stageProposal}from'./actions.js?v=3.0.0-alpha.5';

export const MOCHINI_CONVERSATION_VERSION=3;

const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const makeId=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;

export function normalizeConversation(value){
  return list(value).filter(item=>item&&typeof item==='object').map((item,index)=>({
    id:String(item.id||`turn-${index}`),
    role:item.role==='assistant'?'assistant':'user',
    text:text(item.text),
    createdAt:String(item.createdAt||''),
    meta:item.meta&&typeof item.meta==='object'?item.meta:{}
  })).filter(item=>item.text).slice(-80);
}

export function appendConversation(state={},...entries){
  const current=normalizeConversation(state.mochini?.conversation);
  const nextEntries=entries.flat().filter(Boolean).map(entry=>({
    id:String(entry.id||makeId('turn')),
    role:entry.role==='assistant'?'assistant':'user',
    text:text(entry.text),
    createdAt:String(entry.createdAt||new Date().toISOString()),
    meta:entry.meta&&typeof entry.meta==='object'?entry.meta:{}
  })).filter(entry=>entry.text);
  return{...state,mochini:{...(state.mochini||{}),conversation:[...current,...nextEntries].slice(-80)}};
}

function changedContext(before,after,patch){
  return Object.keys(patch).filter(key=>before?.[key]!==after?.[key]).map(key=>({key,before:before?.[key],after:after?.[key]}));
}

function contextAcknowledgement(changes,policy){
  if(!changes.length)return'';
  const labels=describeContextPatch(Object.fromEntries(changes.map(change=>[change.key,change.after])));
  const pretty=labels.map(item=>`${item.icon} ${item.label}`);
  const joined=pretty.length===1?pretty[0]:pretty.length===2?`${pretty[0]} + ${pretty[1]}`:`${pretty.slice(0,-1).join(', ')} + ${pretty.at(-1)}`;
  const lead=changes.some(change=>change.key==='energy'&&change.after==='drained')||changes.some(change=>change.key==='capacity'&&change.after==='soft')
    ?`Got you. I’m reading today as ${joined}, so I’ll keep things smaller and gentler.`
    :changes.some(change=>change.key==='brain'&&change.after==='locked-in')
      ?`Got you. I’m reading ${joined}, so I’ll protect the useful momentum.`
      :`Got you. I’m reading today as ${joined}, and I’ll let KatOS adapt around that.`;
  return policy?.headline?`${lead} ${policy.headline}`:lead;
}

function groceryNudge(state){
  const raw=normalizeNoms(state.nourish?.noms),noms={...raw,foods:raw.foods.filter(item=>!isArchived(state,'nom-food',item.id))},summary=inventorySummary(noms);
  if(!summary.shouldSuggestTrip)return'';
  const names=summary.needsTrip.slice(0,3).map(item=>item.name),more=summary.needsTripCount>3?` + ${summary.needsTripCount-3} more`:'';
  return`🛒 Tiny fridge note: ${names.join(', ')}${more} ${summary.out.length?'is getting pretty empty':'is running low'}. A grocery trip soon might save Future You some food roulette. I can leave it as a suggestion unless you want to add the low Noms to the Grocery Basket.`;
}

function neutralReply(policy,state){
  const grocery=groceryNudge(state);
  const base=policy?.context?.brain==='scattered'
    ?`I’m with you 😊 I’m keeping the decision surface small. ${policy.headline}`
    :policy?.context?.energy==='drained'
      ?`I’m with you 😊 I’m not adding pressure just because there’s empty space. ${policy.headline}`
      :`I’m with you 😊 I didn’t hear anything that needs changing or adding, so I’m leaving your setup as-is.`;
  return[base,grocery].filter(Boolean).join(' ');
}

export function processMochiniMessage(state={},message,nowValue=new Date()){
  const input=text(message),now=nowValue instanceof Date?nowValue:new Date(nowValue);
  if(!input)return{state,reply:'',proposal:null,contextChanges:[],policy:evaluateStateBrain(state)};

  const before={...(state.context||{})},patch=inferContextPatch(input);
  let next=state;
  if(Object.keys(patch).length)next={...next,context:updateContext(next.context,patch)};
  const contextChanges=changedContext(before,next.context||{},patch);
  const policy=evaluateStateBrain(next);

  const existingPending=next.mochini?.pendingProposal;
  const proposal=existingPending?null:proposeFromMessage(input,now);
  if(proposal)next=stageProposal(next,proposal);

  const contextText=contextAcknowledgement(contextChanges,policy),grocery=contextChanges.length?groceryNudge(next):'';
  let reply='';
  if(proposal)reply=[contextText,proposal.reply,grocery].filter(Boolean).join(' ');
  else if(existingPending)reply=[contextText,'I’m also still holding the last action proposal for your approval, so I won’t stack another one on top of it.',grocery].filter(Boolean).join(' ');
  else reply=contextText?[contextText,grocery].filter(Boolean).join(' '):neutralReply(policy,next);

  const inference=contextChanges.length?{
    id:makeId('context-inference'),
    sourceMessage:input,
    appliedAt:new Date().toISOString(),
    changes:contextChanges,
    after:Object.fromEntries(contextChanges.map(change=>[change.key,change.after]))
  }:null;

  const userTurn={role:'user',text:input,meta:{contextPatch:patch}};
  const assistantTurn={role:'assistant',text:reply,meta:{contextChanges,proposalId:proposal?.id||'',brainHeadline:policy.headline}};
  next=appendConversation(next,userTurn,assistantTurn);

  const insights=next.insights||{};
  const activityLog=list(insights.activityLog);
  if(inference)activityLog.push({id:makeId('activity'),type:'mochini.context.inferred',timestamp:inference.appliedAt,changes:contextChanges,sourceMessage:input});
  next={...next,insights:{...insights,activityLog},mochini:{...(next.mochini||{}),lastContextInference:inference||next.mochini?.lastContextInference||null}};

  return{state:next,reply,proposal,contextChanges,policy};
}

export function undoLastContextInference(state={}){
  const inference=state.mochini?.lastContextInference;
  if(!inference||!Array.isArray(inference.changes)||!inference.changes.length)return{state,undone:[]};
  const current=state.context||{},patch={},undone=[];
  inference.changes.forEach(change=>{
    if(current[change.key]===change.after){patch[change.key]=change.before;undone.push(change)}
  });
  if(!undone.length)return{state,undone:[]};
  let next={...state,context:updateContext(current,patch),mochini:{...(state.mochini||{}),lastContextInference:null}};
  next=appendConversation(next,{role:'assistant',text:'Got it 😊 I undid that context read and put those settings back.'});
  const insights=next.insights||{};
  next={...next,insights:{...insights,activityLog:[...list(insights.activityLog),{id:makeId('activity'),type:'mochini.context.undo',timestamp:new Date().toISOString(),changes:undone}]}};
  return{state:next,undone};
}

export function clearMochiniConversation(state={}){
  return{...state,mochini:{...(state.mochini||{}),conversation:[]}};
}
