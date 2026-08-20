import{evaluateStateBrain,brainStatusChips}from'./brain.js';
import{contextLabel}from'./context.js';
import{recommendTasks}from'./tasks.js';
import{routineSummary as buildRoutineSummary,nextRoutineStep}from'./routines.js';
import{timeMapSummary}from'./time.js';

export const HOME_VERSION=3;

const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const localDateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const sameDay=(value,date)=>text(value)===date;
const openItem=item=>item&&item.completed!==true&&item.done!==true&&item.status!=='complete'&&item.status!=='completed';

const MODE_META={
  normal:{icon:'🍓',label:'Normal',accent:'strawberry'},
  study:{icon:'🎓',label:'Study Mode',accent:'lavender'},
  boss:{icon:'💼',label:'Boss Bitch',accent:'blue'},
  bedtime:{icon:'🌙',label:'Bedtime',accent:'moon'},
  'soft-reset':{icon:'🌸',label:'Soft Reset',accent:'blush'},
  hyperfixation:{icon:'🔥',label:'Hyperfixation',accent:'ember'},
  'home-reset':{icon:'🏡',label:'Home Reset',accent:'sage'},
  'going-out':{icon:'🚗',label:'Going Out',accent:'gold'}
};

function daypart(now){const hour=now.getHours();if(hour<11)return{key:'morning',icon:'🌤️',label:'Good morning',hint:'Start small enough to actually start.'};if(hour<17)return{key:'daytime',icon:'☀️',label:'Good afternoon',hint:'Keep the useful part of the day visible.'};if(hour<21)return{key:'evening',icon:'🌆',label:'Good evening',hint:'Bring the day in for a softer landing.'};return{key:'landing',icon:'🌙',label:'Landing zone',hint:'Only the things that still matter tonight need the front row.'}}

function collectSignals(state,now){
  const today=localDateKey(now),life=state.life||{},education=state.education||{},work=state.work||{},movement=state.movement||{},nourish=state.nourish||{};
  const tasks=list(life.tasks).filter(openItem),protectedTasks=tasks.filter(item=>item.protected===true||item.isProtected===true||item.hardBoundary===true),reminders=list(life.reminders).filter(openItem),beforeBed=reminders.filter(item=>item.timing==='before_bed'&&(!item.date||item.date<=today)),dueReminders=reminders.filter(item=>!item.date||item.date<=today);
  const routines=buildRoutineSummary(life.routines,life.routineInstances,today),time=timeMapSummary(state,now),schoolTasks=list(education.tasks).filter(openItem),workItems=list(work.items).filter(openItem),movementRoutines=list(movement.routines).filter(item=>item&&item.archived!==true),movementToday=list(movement.sessions).filter(item=>sameDay(item.date,today)||text(item.completedAt).startsWith(today)),nomHistory=list(nourish.noms?.history).filter(item=>sameDay(item.date,today)||text(item.loggedAt).startsWith(today)),sipHistory=list(nourish.sips?.history).filter(item=>sameDay(item.date,today)||text(item.loggedAt).startsWith(today));
  return{today,tasks,protectedTasks,reminders,beforeBed,dueReminders,routines,time,schoolTasks,workItems,movementRoutines,movementToday,nomHistory,sipHistory};
}

const signalCard=(key,icon,eyebrow,title,detail,count,priority=5)=>({key,kind:'signal',icon,eyebrow,title,detail,count:Number(count)||0,priority});
const policyCard=policy=>({key:'brain-guidance',kind:'policy',icon:'🧠',eyebrow:'KATOS BRAIN',title:policy.headline,detail:`${policy.choiceCount} visible choice${policy.choiceCount===1?'':'s'} · ${policy.taskEnergyCeiling} effort ceiling · ${policy.initiationStyle.replaceAll('-',' ')}`,count:null,priority:4});

function taskCards(policy,signals){return recommendTasks(signals.tasks,policy,signals.today).map((entry,index)=>{const task=entry.task,meta=[`${task.minutes} min`,`${task.energy} energy`,task.initiation==='sticky'?'sticky start':'easy start',task.protected?'protected':'flexible'].join(' · ');return{key:`task-${task.id}`,kind:'task-choice',taskId:task.id,icon:task.protected?'🛡️':'📝',eyebrow:task.protected?'PROTECTED SWEET TO-DO':'SWEET TO-DO',title:task.text,detail:`${meta}${entry.reasons.length?` · ${entry.reasons.join(', ')}`:''}`,count:null,priority:task.protected?0:1+index}})}

function routineCard(signals,mode){
  const active=signals.routines.active;if(!active.length)return null;
  const preferred=active.find(row=>row.template.daypart===mode||mode==='bedtime'&&row.template.daypart==='bedtime')||active[0],step=nextRoutineStep(preferred.template,preferred.instance),progress=preferred.progress;
  return signalCard('routines','🔁','ROUTINES V3',preferred.template.name,step?`${progress.done}/${progress.total} steps · next: ${step.label}`:`${progress.done}/${progress.total} steps`,active.length,mode==='bedtime'||mode==='home-reset'?1:3);
}

function timeCard(signals){
  const time=signals.time;if(time.current.length){const item=time.current[0];return signalCard('time-now','🕰️','BERRY BUSY · NOW',item.title,item.endTime?`Until ${item.endTime}${item.protected?' · protected':''}`:`Happening now${item.protected?' · protected':''}`,time.items.length,item.protected?0:1)}
  if(time.next){const mins=time.nextMinutes,when=mins==null?'later':mins<60?`in ${Math.max(0,mins)} min`:`in ${Math.floor(mins/60)}h ${mins%60}m`;return signalCard('time-next','📅','BERRY BUSY · NEXT',time.next.title,`${when}${time.next.protected?' · protected commitment':''}`,time.items.length,time.next.protected&&mins!=null&&mins<=90?0:2)}
  if(time.deadlinesToday.length)return signalCard('time-deadlines','⏰','BERRY BUSY','Due today',`${time.deadlinesToday.length} deadline${time.deadlinesToday.length===1?'':'s'} on the Time Map.`,time.deadlinesToday.length,2);
  return null;
}

function candidateCards(state,policy,signals){
  const mode=policy.context.mode,cards=[...taskCards(policy,signals)],time=timeCard(signals),routine=routineCard(signals,mode);if(time)cards.push(time);if(routine)cards.push(routine);
  if(signals.beforeBed.length)cards.push(signalCard('bed-pings','🌙','LITTLE PINGS','Before-bed pings',`${signals.beforeBed.length} thing${signals.beforeBed.length===1?'':'s'} waiting for tonight.`,signals.beforeBed.length,mode==='bedtime'?1:4));else if(signals.dueReminders.length)cards.push(signalCard('pings','🔔','LITTLE PINGS','Still hanging around',`${signals.dueReminders.length} reminder${signals.dueReminders.length===1?'':'s'} due or undated.`,signals.dueReminders.length,4));
  if(signals.schoolTasks.length)cards.push(signalCard('school','🎓','STUDY NOOK','School lane',`${signals.schoolTasks.length} open school item${signals.schoolTasks.length===1?'':'s'}.`,signals.schoolTasks.length,mode==='study'?1:6));
  if(signals.workItems.length)cards.push(signalCard('work','💼','BOSS BITCH','Work lane',`${signals.workItems.length} open work item${signals.workItems.length===1?'':'s'}.`,signals.workItems.length,mode==='boss'?1:6));
  if(signals.movementRoutines.length&&!signals.movementToday.length)cards.push(signalCard('motion','🌷','MOTION','Movement is available',`${signals.movementRoutines.length} saved movement option${signals.movementRoutines.length===1?'':'s'} available.`,signals.movementRoutines.length,mode==='soft-reset'?3:8));
  if(signals.nomHistory.length||signals.sipHistory.length)cards.push(signalCard('nourish','🍱','NOURISH','Today has a trail',`${signals.nomHistory.length} Nom log${signals.nomHistory.length===1?'':'s'} · ${signals.sipHistory.length} Sip log${signals.sipHistory.length===1?'':'s'}.`,signals.nomHistory.length+signals.sipHistory.length,9));
  return cards;
}

function fallbackCards(state,policy,signals){
  const result=[];if(policy.modeSuggestion)result.push({key:'mode-suggestion',kind:'mode-suggestion',icon:policy.modeSuggestion.icon,eyebrow:'BRAIN SUGGESTION',title:`Try ${policy.modeSuggestion.label}`,detail:policy.modeSuggestion.reason,count:null,priority:1});result.push(policyCard(policy));
  if(policy.context.currentActivity)result.push({key:'current-activity',kind:'context',icon:'📍',eyebrow:'RIGHT NOW',title:policy.context.currentActivity,detail:'KatOS will treat this as the current activity instead of pretending nothing is happening.',count:null,priority:2});
  if(policy.restAllowed&&(policy.context.energy==='drained'||policy.context.capacity==='soft'||policy.context.mode==='soft-reset'||policy.context.mode==='bedtime'))result.push({key:'rest',kind:'rest',icon:'🌙',eyebrow:'VALID OPTION',title:'Stopping can count',detail:'There is no rule requiring KatOS to fill empty space with more work.',count:null,priority:3});
  if(!signals.tasks.length&&!signals.reminders.length&&!signals.time.items.length&&!signals.routines.total&&!signals.schoolTasks.length&&!signals.workItems.length)result.push({key:'empty-life',kind:'empty',icon:'🌱',eyebrow:'V3 IS STILL NEW',title:'No live life data connected yet',detail:'V2 has not been imported, so Home is adapting to context without inventing fake obligations.',count:null,priority:9});return result;
}

export function buildAdaptiveHome(state={},nowValue=new Date()){
  const now=nowValue instanceof Date?nowValue:new Date(nowValue),policy=evaluateStateBrain(state),part=daypart(now),mode=MODE_META[policy.context.mode]||MODE_META.normal,signals=collectSignals(state,now),actual=candidateCards(state,policy,signals).sort((a,b)=>a.priority-b.priority||String(a.key).localeCompare(String(b.key))),fallbacks=fallbackCards(state,policy,signals),merged=[];
  const add=card=>{if(card&&!merged.some(item=>item.key===card.key))merged.push(card)};if(actual.length)add(actual[0]);fallbacks.forEach(add);actual.slice(1).forEach(add);
  const visibleCount=Math.max(1,Math.min(5,policy.choiceCount)),cards=merged.slice(0,visibleCount),contextBits=['brain','energy','capacity','pressure'].map(key=>{const item=contextLabel(key,policy.context[key]);return`${item.icon} ${item.label}`});
  return{version:HOME_VERSION,greeting:`${part.label}${policy.context.mode!=='normal'?` · ${mode.label}`:''}`,daypart:part,mode,headline:policy.headline,subhead:part.hint,contextBits,cards,visibleCount,totalSignals:actual.length,brainChips:brainStatusChips(policy),policy,signals};
}
