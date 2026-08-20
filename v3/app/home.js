import{evaluateStateBrain,brainStatusChips}from'./brain.js';
import{contextLabel}from'./context.js';

export const HOME_VERSION=1;

const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const localDateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const sameDay=(value,date)=>text(value)===date;
const openItem=item=>item&&item.completed!==true&&item.done!==true&&item.status!=='complete'&&item.status!=='completed';

const MODE_META={
  normal:{icon:'🍓',label:'Normal',accent:'strawberry'},
  study:{icon:'🎓',label:'Study Mode',accent:'lavender'},
  boss:{icon:'💼',label:'Boss Mode',accent:'blue'},
  bedtime:{icon:'🌙',label:'Bedtime',accent:'moon'},
  'soft-reset':{icon:'🌸',label:'Soft Reset',accent:'blush'},
  hyperfixation:{icon:'🔥',label:'Hyperfixation',accent:'ember'},
  'home-reset':{icon:'🏡',label:'Home Reset',accent:'sage'},
  'going-out':{icon:'🚗',label:'Going Out',accent:'gold'}
};

function daypart(now){
  const hour=now.getHours();
  if(hour<11)return{key:'morning',icon:'🌤️',label:'Good morning',hint:'Start small enough to actually start.'};
  if(hour<17)return{key:'daytime',icon:'☀️',label:'Good afternoon',hint:'Keep the useful part of the day visible.'};
  if(hour<21)return{key:'evening',icon:'🌆',label:'Good evening',hint:'Bring the day in for a softer landing.'};
  return{key:'landing',icon:'🌙',label:'Landing zone',hint:'Only the things that still matter tonight need the front row.'};
}

function collectSignals(state,now){
  const today=localDateKey(now),life=state.life||{},education=state.education||{},work=state.work||{},movement=state.movement||{},nourish=state.nourish||{};
  const tasks=list(life.tasks).filter(openItem);
  const protectedTasks=tasks.filter(item=>item.protected===true||item.isProtected===true||item.hardBoundary===true);
  const reminders=list(life.reminders).filter(openItem);
  const beforeBed=reminders.filter(item=>item.timing==='before_bed'&&(!item.date||item.date<=today));
  const dueReminders=reminders.filter(item=>!item.date||item.date<=today);
  const events=list(life.events).filter(item=>sameDay(item.date,today));
  const routines=list(life.routines).filter(item=>item&&item.archived!==true);
  const schoolTasks=list(education.tasks).filter(openItem);
  const workItems=list(work.items).filter(openItem);
  const movementRoutines=list(movement.routines).filter(item=>item&&item.archived!==true);
  const movementToday=list(movement.sessions).filter(item=>sameDay(item.date,today)||text(item.completedAt).startsWith(today));
  const nomHistory=list(nourish.noms?.history).filter(item=>sameDay(item.date,today)||text(item.loggedAt).startsWith(today));
  const sipHistory=list(nourish.sips?.history).filter(item=>sameDay(item.date,today)||text(item.loggedAt).startsWith(today));
  return{today,tasks,protectedTasks,reminders,beforeBed,dueReminders,events,routines,schoolTasks,workItems,movementRoutines,movementToday,nomHistory,sipHistory};
}

const signalCard=(key,icon,eyebrow,title,detail,count,priority=5)=>({key,kind:'signal',icon,eyebrow,title,detail,count:Number(count)||0,priority});
const policyCard=(policy)=>({key:'brain-guidance',kind:'policy',icon:'🧠',eyebrow:'KATOS BRAIN',title:policy.headline,detail:`${policy.choiceCount} visible choice${policy.choiceCount===1?'':'s'} · ${policy.taskEnergyCeiling} effort ceiling · ${policy.initiationStyle.replaceAll('-',' ')}`,count:null,priority:1});

function candidateCards(state,policy,signals){
  const mode=policy.context.mode,cards=[];
  if(signals.protectedTasks.length)cards.push(signalCard('protected','🛡️','PROTECTED','Needs to stay visible',`${signals.protectedTasks.length} protected commitment${signals.protectedTasks.length===1?'':'s'} still open.`,signals.protectedTasks.length,policy.protectedCommitments==='front'?0:2));
  if(signals.events.length)cards.push(signalCard('events','📅','TODAY','Time-bound plans',`${signals.events.length} event${signals.events.length===1?'':'s'} on today’s calendar.`,signals.events.length,mode==='going-out'?1:3));
  if(signals.beforeBed.length)cards.push(signalCard('bed-pings','🌙','LITTLE PINGS','Before-bed pings',`${signals.beforeBed.length} thing${signals.beforeBed.length===1?'':'s'} waiting for tonight.`,signals.beforeBed.length,mode==='bedtime'?1:4));
  else if(signals.dueReminders.length)cards.push(signalCard('pings','🔔','LITTLE PINGS','Still hanging around',`${signals.dueReminders.length} reminder${signals.dueReminders.length===1?'':'s'} due or undated.`,signals.dueReminders.length,4));
  if(signals.routines.length)cards.push(signalCard('routines','🎀','ROUTINES','Rhythms available',`${signals.routines.length} routine${signals.routines.length===1?'':'s'} can carry the next steps for you.`,signals.routines.length,mode==='bedtime'||mode==='home-reset'?2:5));
  if(signals.schoolTasks.length)cards.push(signalCard('school','🎓','STUDY NOOK','School lane',`${signals.schoolTasks.length} open school item${signals.schoolTasks.length===1?'':'s'}.`,signals.schoolTasks.length,mode==='study'?1:6));
  if(signals.workItems.length)cards.push(signalCard('work','💼','BOSS MODE','Work lane',`${signals.workItems.length} open work item${signals.workItems.length===1?'':'s'}.`,signals.workItems.length,mode==='boss'?1:6));
  if(signals.tasks.length)cards.push(signalCard('tasks','📝','SWEET TO-DOS','Open choices',`${signals.tasks.length} open task${signals.tasks.length===1?'':'s'} exist in V3. Home will only surface as many as the Brain allows.`,signals.tasks.length,7));
  if(signals.movementRoutines.length&&!signals.movementToday.length)cards.push(signalCard('motion','🌷','MOTION','Movement is available',`${signals.movementRoutines.length} saved movement option${signals.movementRoutines.length===1?'':'s'} available.`,signals.movementRoutines.length,mode==='soft-reset'?3:8));
  if(signals.nomHistory.length||signals.sipHistory.length)cards.push(signalCard('nourish','🍱','NOURISH','Today has a trail',`${signals.nomHistory.length} Nom log${signals.nomHistory.length===1?'':'s'} · ${signals.sipHistory.length} Sip log${signals.sipHistory.length===1?'':'s'}.`,signals.nomHistory.length+signals.sipHistory.length,9));
  return cards;
}

function fallbackCards(state,policy,signals){
  const result=[policyCard(policy)];
  if(policy.modeSuggestion)result.push({key:'mode-suggestion',kind:'mode-suggestion',icon:policy.modeSuggestion.icon,eyebrow:'BRAIN SUGGESTION',title:`Try ${policy.modeSuggestion.label}`,detail:policy.modeSuggestion.reason,count:null,priority:1});
  if(policy.context.currentActivity)result.push({key:'current-activity',kind:'context',icon:'📍',eyebrow:'RIGHT NOW',title:policy.context.currentActivity,detail:'KatOS will treat this as the current activity instead of pretending nothing is happening.',count:null,priority:2});
  if(policy.restAllowed&&(policy.context.energy==='drained'||policy.context.capacity==='soft'||policy.context.mode==='soft-reset'||policy.context.mode==='bedtime'))result.push({key:'rest',kind:'rest',icon:'🌙',eyebrow:'VALID OPTION',title:'Stopping can count',detail:'There is no rule requiring KatOS to fill empty space with more work.',count:null,priority:3});
  if(!signals.tasks.length&&!signals.reminders.length&&!signals.events.length&&!signals.schoolTasks.length&&!signals.workItems.length)result.push({key:'empty-life',kind:'empty',icon:'🌱',eyebrow:'V3 IS STILL NEW',title:'No live life data connected yet',detail:'That is intentional. V2 has not been imported, so Home is adapting to context without inventing fake obligations.',count:null,priority:9});
  return result;
}

export function buildAdaptiveHome(state={},nowValue=new Date()){
  const now=nowValue instanceof Date?nowValue:new Date(nowValue),policy=evaluateStateBrain(state),part=daypart(now),mode=MODE_META[policy.context.mode]||MODE_META.normal,signals=collectSignals(state,now);
  const actual=candidateCards(state,policy,signals).sort((a,b)=>a.priority-b.priority||String(a.key).localeCompare(String(b.key)));
  const fallbacks=fallbackCards(state,policy,signals);
  const merged=[];
  const add=card=>{if(card&&!merged.some(item=>item.key===card.key))merged.push(card)};
  if(actual.length)add(actual[0]);
  fallbacks.forEach(add);
  actual.slice(1).forEach(add);
  const visibleCount=Math.max(1,Math.min(5,policy.choiceCount));
  const cards=merged.slice(0,visibleCount);
  const contextBits=['brain','energy','capacity','pressure'].map(key=>{const item=contextLabel(key,policy.context[key]);return`${item.icon} ${item.label}`});
  return{
    version:HOME_VERSION,
    greeting:`${part.label}${policy.context.mode!=='normal'?` · ${mode.label}`:''}`,
    daypart:part,
    mode,
    headline:policy.headline,
    subhead:part.hint,
    contextBits,
    cards,
    visibleCount,
    totalSignals:actual.length,
    brainChips:brainStatusChips(policy),
    policy,
    signals
  };
}
