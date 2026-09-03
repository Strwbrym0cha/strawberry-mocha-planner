export const DATA_KEY='sm_v16';
// Kept for compatibility with the existing sign-in hydration shell.
export const BACKUP_KEY='sm_v16_backup';
export const BACKUP_HISTORY_KEY='sm_v16_backups';
export const CORRUPT_SNAPSHOT_PREFIX='sm_v16_corrupt_';
export const CURRENT_SCHEMA_VERSION=6;
export const MAX_LOCAL_BACKUPS=7;

export const DEFAULT_NOMS={foods:[],pantry:[],groceries:[],recipes:[],mealPlan:[],emergencyNoms:[],today:null};
export const DEFAULT_HYPERFIXATION={active:false,focusType:null,focusId:null,focusLabel:null,startedAt:null,intention:null,exitAt:null,exitRoutineId:null};
export const DEFAULT_ROUTINE_MODE={active:false,routineId:null,skippedTaskIds:[]};
const DEFAULT_MOCHINI_LIFE={mood:'content',energy:70,affection:50,chaos:30,lastInteractionAt:null,lastSeenAt:null,lastEnergyAt:null,interactionsToday:0,ignoredCount:0,berriesFedToday:0,berriesFedTotal:0,currentActivity:null,activityChangedAt:null,currentObsession:null,obsessionStartedAt:null,currentLine:null,dialogueHistory:[],recentVisits:[],lastEvent:null,lastEventAt:null,lastPokeAt:null,pokeCount:0,dailyKey:null,weeklyKey:null,dailyFlags:{},weeklyFlags:{},permanentFlags:{}};
export const DEFAULT_MOCHINI={conversation:[],life:DEFAULT_MOCHINI_LIFE};
export const DEFAULT_WORK_HQ={version:1,clients:[],supervisors:[],materials:[],scheduleExceptions:[],sessionPlans:[],career:{currentRole:'bt_rlt',rbtRequirementSetId:'rbt_2026',rbtMilestones:{},exam:{status:'pending',date:null,time:null,location:null,notes:'',result:null},leadRbtChecklist:[],degreeProgress:{}},professionalDevelopment:[],fieldworkRecords:[],documents:[]};
export const DEFAULT_STUDY_NOOK={version:1,institutions:[],providers:[],programs:[],requirements:[],courses:[],assignments:[],terms:[],transferMappings:[],transferEvaluations:[],transferResults:[],studySessions:[],importantDates:[],documents:[]};
export const DEFAULT_FINANCE={version:1,accounts:[],ledger:[],categories:[],bills:[],subscriptions:[],goals:[],goalContributions:[],incomeSources:[],payRates:[],gigPlatforms:[],gigOrders:[],gigPayouts:[],gigGoals:[],legacyMetadata:{}};
export const DEFAULT_LIFESTYLE={version:1,movement:{types:[],activities:[],plans:[],goals:[]},hobbies:{items:[],projects:[],resources:[]},growth:{areas:[],goals:[],milestones:[],wins:[],reflections:[]},legacyMyLoves:[]};
export const DEFAULT_DATA={schemaVersion:CURRENT_SCHEMA_VERSION,events:[],reminders:[],tasks:[],routines:[],guidedRoutines:[],routineMode:DEFAULT_ROUTINE_MODE,habits:[],goals:[],wins:[],courses:[],projects:[],archive:[],days:{},dayNotes:{},money:{},brain:'',brainNotes:[],parkedProjects:[],recovery:{},weeklyLabNotes:{},labFindings:[],labObservations:[],labArchivedObservations:[],weeklyExperiment:{},labExperiments:[],financeWorkflow:{},schoolTasks:[],schoolGoals:[],workItems:[],workSchedule:{mode:'flexible',weekly:{sunday:[],monday:[],tuesday:[],wednesday:[],thursday:[],friday:[],saturday:[]}},workHQ:DEFAULT_WORK_HQ,studyNook:DEFAULT_STUDY_NOOK,finance:DEFAULT_FINANCE,lifestyle:DEFAULT_LIFESTYLE,noms:DEFAULT_NOMS,hyperfixation:DEFAULT_HYPERFIXATION,mochini:DEFAULT_MOCHINI,taskbot:{capacity:'High',missionId:null,disrupted:false},totalClasses:0,demoTasksCleaned:false};

// Deliberate, idempotent research records from Kat's recent real-world use.
// These IDs remain stable so normal reloads and cloud hydration never duplicate them.
const KAT_LABS_RESEARCH_AT='2026-08-18T00:00:00.000Z';
const KAT_LABS_RESEARCH_OBSERVATIONS=[
 {id:'kat-labs-observation-routine-momentum',text:'After initiating a shower, related self-care tasks followed more easily: Shower → Wash Hair → Skincare → Makeup. The later tasks required less initiation once the first action began.',tags:['Routines','Transitions','Motivation'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-gateway-tasks',text:'Showering acted as a gateway action for related self-care behaviors. Once the shower began, skincare and other getting-ready actions followed more naturally.',tags:['Routines','Transitions'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-deferral-resistance',text:'The longer showering was postponed, the harder initiating it felt. Repeated delay increased resistance rather than keeping it constant.',tags:['Planning','Motivation'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-predetermined-commitment',text:'Despite not wanting to shower, Kat followed the previously chosen plan because the decision had already been intentionally made as part of KatOS/Mochini guidance.',tags:['Planning','Focus'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-hyperfixation-overrides-plan',text:'Kat became strongly hyperfocused on KatOS/the planner and lost interest in previously planned tasks, then chose an intentional exit sequence: Planner → Shower → Bed.',tags:['Focus','Planning'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-exit-ramps',text:'A predetermined sequence after hyperfixation made it possible to leave the planner and transition into necessary self-care.',tags:['Focus','Transitions'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-momentum-needs-guardrails',text:'After showering, momentum continued through hair care, skincare, makeup, and cleaning the vanity. Kat intentionally stopped cleaning because required work videos still needed to be completed.',tags:['Focus','Planning'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-observation-momentum-redirection',text:'Kat was able to stop one productive chain because another obligation was recognized as more important.',tags:['Focus','Transitions'],timestamp:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT}
];
const KAT_LABS_RESEARCH_FINDINGS=[
 {id:'kat-labs-finding-routine-momentum',title:'Routine Momentum',description:'Starting the first action in an established routine can create behavioral momentum that lowers the activation barrier for related actions. KatOS implication: future Routine/Guided Mode guidance can recognize routine chains instead of treating every step as unrelated.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-gateway-tasks',title:'Gateway Tasks',description:'For some routines, the most important intervention may be identifying and initiating the gateway task rather than motivating every step individually. KatOS implication: future guidance can highlight the first useful action.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-deferral-resistance-compounds',title:'Deferral Resistance Compounds',description:'Task postponement may be behaviorally non-neutral. For some tasks, repeated deferral can increase initiation difficulty. KatOS implication: future guidance can distinguish a task that can safely wait from one deferred repeatedly, without guilt or punishment language.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-predetermined-commitment',title:'Predetermined Commitment Can Override Resistance',description:'A previously intentional commitment can function as an external executive-function scaffold. KatOS implication: Mochini should not casually renegotiate a reasonable plan because resistance appears later, while Kat always retains override control.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-hyperfixation-overrides-planned-tasks',title:'Hyperfixation Can Override Planned Tasks',description:'Hyperfixation may be better supported through boundaries and exit ramps than through constant interruption. KatOS implication: future Hyperfixation/Locked-In Mode can protect important obligations while allowing intentional focus.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-exit-ramps',title:'Exit Ramps Help End Hyperfixation',description:'Hyperfixation is easier to leave when there is a concrete next action or short transition sequence. KatOS implication: future Guided Modes may support an exit ramp such as Current Focus → Shower → Bed.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-productive-momentum-needs-guardrails',title:'Productive Momentum Needs Guardrails',description:'Behavioral momentum can be useful but can also carry attention into lower-priority productive tasks. KatOS implication: future Mochini behavior can preserve momentum while redirecting it when a protected commitment needs attention.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT},
 {id:'kat-labs-finding-momentum-can-be-redirected',title:'Momentum Can Be Redirected',description:'The goal does not always need to be stopping momentum; active momentum can be redirected toward the next protected task. KatOS implication: future guidance may carry momentum into an important commitment.',status:'Observed',createdAt:KAT_LABS_RESEARCH_AT,updatedAt:KAT_LABS_RESEARCH_AT}
];
const GUIDED_MODES_NAME='KatOS V2 • Guided Modes';
const GUIDED_MODES_RESEARCH_VERSION=1;
const GUIDED_MODES_UPDATE={currentObjective:'Design Routine System V2 and improve Hyperfixation Mode using observed Kat Labs behavior, including gateway tasks, momentum chains, exit ramps, and protected commitments.',doneWhen:'Routines can support gateway tasks and momentum-aware guidance, Hyperfixation Mode has intentional exit/re-entry tools, and important commitments remain protected without turning KatOS into a punitive task system.',nextStep:'Add the minimum task signals needed for future Routine and Hyperfixation reasoning.'};

const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>structuredClone(value);
const dateStamp=data=>Date.parse(data?.__smUpdatedAt||'')||0;
const parseRecord=raw=>{if(typeof raw!=='string'||!raw)return{ok:false,empty:true,data:null};try{const parsed=JSON.parse(raw),data=parsed?.data||parsed;if(!isObject(data))return{ok:false,error:'Snapshot root is not an object.',data:null};return{ok:true,data}}catch{return{ok:false,error:'Snapshot JSON could not be parsed.',data:null}}};
const readRecord=(storage,key)=>{try{const raw=storage.getItem(key);return{...parseRecord(raw),raw}}catch(error){return{ok:false,error:'Snapshot storage could not be read.',raw:null,cause:error}}};
const writeRecord=(storage,key,data)=>storage.setItem(key,JSON.stringify({data}));

export const localDateKey=(date=new Date())=>{const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const asList=value=>Array.isArray(value)?value:(value&&typeof value==='object'?Object.values(value):[]);
export const moneyTotals=money=>{const data=money||{};const total=key=>asList(data[key]).reduce((sum,item)=>sum+Number(item?.amount??0),0);const income=total('income');const spent=total('expenses');const bills=asList(data.bills).filter(item=>!item?.paid).reduce((sum,item)=>sum+Number(item?.amount||0),0);const cash=Number(data.cash?.amount??data.cash??0);return{income,spent,bills,cash,available:income-spent-bills+cash}};
export const normalizeNoms=value=>{const noms=isObject(value)?value:{};const next={...clone(DEFAULT_NOMS),...noms};for(const key of ['foods','pantry','groceries','recipes','mealPlan','emergencyNoms'])if(!Array.isArray(next[key]))next[key]=[];if(next.today!==null&&!isObject(next.today))next.today=null;return next};
export const normalizeHyperfixation=value=>{const session=isObject(value)?value:{};return{...clone(DEFAULT_HYPERFIXATION),...session,active:!!session.active,focusType:['task','project','goal','freeform'].includes(session.focusType)?session.focusType:null,focusId:session.focusId==null?null:String(session.focusId),focusLabel:typeof session.focusLabel==='string'?session.focusLabel:null,startedAt:typeof session.startedAt==='string'?session.startedAt:null,intention:typeof session.intention==='string'?session.intention:null,exitAt:/^\d{2}:\d{2}$/.test(String(session.exitAt||''))?session.exitAt:null,exitRoutineId:session.exitRoutineId==null?null:String(session.exitRoutineId)}};
export const normalizeRoutineMode=value=>{const mode=isObject(value)?value:{};return{...clone(DEFAULT_ROUTINE_MODE),...mode,active:!!mode.active,routineId:mode.routineId==null?null:String(mode.routineId),skippedTaskIds:Array.isArray(mode.skippedTaskIds)?[...new Set(mode.skippedTaskIds.filter(Boolean).map(String))]:[]}};
export const normalizeGuidedRoutine=value=>{const routine=isObject(value)?value:{};const taskIds=Array.isArray(routine.taskIds)?[...new Set(routine.taskIds.filter(Boolean).map(String))]:[];return{...routine,id:routine.id==null?null:String(routine.id),name:typeof routine.name==='string'?routine.name.trim():'',taskIds,gatewayTaskId:taskIds.includes(String(routine.gatewayTaskId||''))?String(routine.gatewayTaskId):null}};
export const normalizeMochini=value=>{const mochini=isObject(value)?value:{},life=isObject(mochini.life)?mochini.life:{},bounded=(entry,fallback)=>Math.min(100,Math.max(0,Number.isFinite(Number(entry))?Number(entry):fallback));return{...clone(DEFAULT_MOCHINI),...mochini,conversation:Array.isArray(mochini.conversation)?mochini.conversation:[],life:{...clone(DEFAULT_MOCHINI_LIFE),...life,mood:['content','happy','excited','sleepy','bored','proud','grumpy','chaotic','curious'].includes(life.mood)?life.mood:'content',energy:bounded(life.energy,70),affection:bounded(life.affection,50),chaos:bounded(life.chaos,30),dialogueHistory:Array.isArray(life.dialogueHistory)?life.dialogueHistory.slice(-6):[],recentVisits:Array.isArray(life.recentVisits)?life.recentVisits.slice(-8):[],dailyFlags:isObject(life.dailyFlags)?life.dailyFlags:{},weeklyFlags:isObject(life.weeklyFlags)?life.weeklyFlags:{},permanentFlags:isObject(life.permanentFlags)?life.permanentFlags:{}}}};
/** Preserves the original weeklyExperiment object while exposing it as one record in the V2 collection. */
export const normalizeLabExperiments=(value,legacy={})=>{const experiments=Array.isArray(value)?value.filter(isObject):[];if(experiments.length)return experiments.map((experiment,index)=>({...experiment,id:experiment.id||`lab-experiment-${index}`,status:['Planned','Active','Completed'].includes(experiment.status)?experiment.status:'Active'}));if(!isObject(legacy)||!Object.values(legacy).some(value=>String(value??'').trim()))return[];return[{...legacy,id:legacy.id||'legacy-weekly-experiment',status:['Planned','Active','Completed'].includes(legacy.status)?legacy.status:'Active'}]};
export function normalizeTask(task){if(!isObject(task))return task;const next={...task};if(next.done===undefined||next.done===null)next.done=false;if(next.parked===undefined||next.parked===null)next.parked=false;if(next.hardBoundary===undefined||next.hardBoundary===null)next.hardBoundary=false;if(!Array.isArray(next.unavailableOn))next.unavailableOn=[];next.routineId=typeof next.routineId==='string'&&next.routineId.trim()?next.routineId.trim():null;next.isGatewayTask=next.isGatewayTask===true;next.isProtected=next.isProtected===true;const deferred=Number(next.timesDeferred);next.timesDeferred=Number.isFinite(deferred)&&deferred>=0?Math.floor(deferred):0;return next}

const appendMissing=(items,seeds,key='id')=>[...items,...seeds.filter(seed=>!items.some(item=>String(item?.[key]??'')===String(seed[key]??'')))];
const applyGuidedModesResearch=projects=>projects.map(project=>{
 const name=String(project?.name??project?.title??'');
 if(name!==GUIDED_MODES_NAME||project?.guidedModesResearchVersion===GUIDED_MODES_RESEARCH_VERSION)return project;
 return{...project,...GUIDED_MODES_UPDATE,guidedModesResearchVersion:GUIDED_MODES_RESEARCH_VERSION};
});

/** Versioned, idempotent migration seam. Version 0 is every legacy snapshot without schemaVersion. */
export function migrateState(input={}){
 if(!isObject(input))return{state:clone(DEFAULT_DATA),issues:['State root was not an object.'],recovered:false};
 const state={...input},issues=[];let version=Number.isInteger(state.schemaVersion)&&state.schemaVersion>=0?state.schemaVersion:0;
 if(version<1){state.schemaVersion=1;version=1;}
 if(version<2){
  state.schemaVersion=2;version=2;
 }
 if(version<3){
  // Preserve the older generic Work data untouched. Work HQ is a new
  // de-identified information surface and never fabricates clients from shifts.
  if(!isObject(state.workHQ))state.workHQ=clone(DEFAULT_WORK_HQ);
  state.schemaVersion=3;version=3;
 }
 if(version<4){
  const legacyCourses=Array.isArray(state.courses)?state.courses:[],legacyTasks=Array.isArray(state.schoolTasks)?state.schoolTasks:[];
  if(!isObject(state.studyNook))state.studyNook=clone(DEFAULT_STUDY_NOOK);
  const nook=state.studyNook,programId='legacy-academic-program',providerId='legacy-course-provider';
  if(!Array.isArray(nook.programs))nook.programs=[];
  if((legacyCourses.length||legacyTasks.length)&&!nook.programs.some(item=>item.id===programId))nook.programs.push({id:programId,title:'Existing academic plan',shortTitle:'Academic plan',level:'other',programType:'degree',status:'preparing',totalCreditsRequired:0,notes:'Migrated from legacy Study data; verify program and requirement details.',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  if(!Array.isArray(nook.providers))nook.providers=[];
  if((legacyCourses.length||legacyTasks.length)&&!nook.providers.some(item=>item.id===providerId))nook.providers.push({id:providerId,name:'Legacy course source',type:'other',active:true,notes:'Migrated without inferring a provider.',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  if(!Array.isArray(nook.courses))nook.courses=[];
  for(const [index,course] of legacyCourses.entries()){const id=`legacy-course-${String(course?.id||index)}`;if(nook.courses.some(item=>item.id===id))continue;nook.courses.push({id,programId,providerId,title:String(course?.name||course?.title||'Untitled course'),courseCode:'',credits:0,status:course?.status==='Completed'?'completed':course?.status==='In Progress'?'in_progress':'planned',progressPercent:Number(course?.progress)||0,notes:String(course?.notes||''),legacyCourseId:course?.id||null,createdAt:course?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()})}
  // Ambiguous legacy school tasks remain actions, not invented assignments.
  const tasks=Array.isArray(state.tasks)?state.tasks:[];state.tasks=legacyTasks.reduce((all,item,index)=>{const legacyId=String(item?.id||index),id=`legacy-school-task-${legacyId}`;if(all.some(task=>task.id===id||task.externalId===`legacy-school-task:${legacyId}`))return all;return[...all,{id,text:String(item?.name||item?.title||'School task'),source:'study',externalId:`legacy-school-task:${legacyId}`,scheduledDate:item?.due||null,deadlineDate:item?.due||null,deadlineType:'soft',done:!!item?.done,status:item?.done?'completed':'open',legacySchoolTaskId:legacyId,createdAt:item?.createdAt||new Date().toISOString()}]},tasks);
  state.schemaVersion=4;version=4;
 }
 if(version<5){
  if(!isObject(state.finance))state.finance=clone(DEFAULT_FINANCE);const finance=state.finance,legacy=isObject(state.money)?state.money:{};
  for(const key of ['accounts','ledger','categories','bills','subscriptions','goals','goalContributions','incomeSources','payRates','gigPlatforms','gigOrders','gigPayouts','gigGoals'])if(!Array.isArray(finance[key]))finance[key]=[];
  const cashAmount=Number(legacy.cash?.amount??legacy.cash),hasLegacyActivity=(Array.isArray(legacy.income)&&legacy.income.length)||(Array.isArray(legacy.expenses)&&legacy.expenses.length);if((Number.isFinite(cashAmount)||hasLegacyActivity)&&!finance.accounts.some(a=>a.id==='legacy-cash-account'))finance.accounts.push({id:'legacy-cash-account',name:'Legacy cash on hand',institution:'',type:'cash',active:true,openingBalance:Number.isFinite(cashAmount)?cashAmount:0,openingBalanceDate:new Date().toISOString().slice(0,10),notes:'Migrated balance; no transactions were invented.',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  const asLegacyList=value=>Array.isArray(value)?value:(value&&typeof value==='object'?Object.values(value):[]);
  for(const [kind,type] of [['income','income'],['expenses','expense']])for(const [index,item] of asLegacyList(legacy[kind]).entries()){const id=`legacy-money-${kind}-${String(item?.id||index)}`;if(finance.ledger.some(t=>t.id===id))continue;const amount=Number(item?.amount)||0;if(!amount)continue;finance.ledger.push({id,accountId:'legacy-cash-account',type,amount,date:item?.date||new Date().toISOString().slice(0,10),merchantOrSource:String(item?.name||item?.title||kind),status:'posted',source:'migrated',notes:'Migrated from legacy Money Café; account attribution may need review.',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})}
  for(const [index,item] of asLegacyList(legacy.bills).entries()){const id=`legacy-bill-${String(item?.id||index)}`;if(finance.bills.some(b=>b.id===id))continue;finance.bills.push({id,name:String(item?.name||'Legacy bill'),expectedAmount:Number(item?.amount)||0,amountType:'fixed',recurrence:String(item?.repeat||'Monthly').toLowerCase(),dueDay:parseInt(item?.due)||1,active:true,autopay:false,notes:'Migrated legacy bill; verify due date and recurrence.',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})}
  for(const [index,item] of asLegacyList(legacy.savings).entries()){const id=`legacy-goal-${String(item?.id||index)}`;if(finance.goals.some(g=>g.id===id))continue;finance.goals.push({id,title:String(item?.name||'Legacy savings goal'),targetAmount:Number(item?.target)||0,progressMethod:'manual_amount',manualAmountOptional:Number(item?.current??item?.amount)||0,status:'active',priority:'Whenever',notes:'Migrated from a legacy money bucket.',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})}
 finance.legacyMetadata={...(finance.legacyMetadata||{}),legacyMoneyPreserved:true};state.schemaVersion=5;version=5;
 }
 if(version<6){
  if(!isObject(state.lifestyle))state.lifestyle=clone(DEFAULT_LIFESTYLE);const lifestyle=state.lifestyle;
  for(const domain of ['movement','hobbies','growth'])if(!isObject(lifestyle[domain]))lifestyle[domain]=clone(DEFAULT_LIFESTYLE[domain]);
  for(const key of ['types','activities','plans','goals'])if(!Array.isArray(lifestyle.movement[key]))lifestyle.movement[key]=[];
  for(const key of ['items','projects','resources'])if(!Array.isArray(lifestyle.hobbies[key]))lifestyle.hobbies[key]=[];
  for(const key of ['areas','goals','milestones','wins','reflections'])if(!Array.isArray(lifestyle.growth[key]))lifestyle.growth[key]=[];
  if(!Array.isArray(lifestyle.legacyMyLoves))lifestyle.legacyMyLoves=[];
  // Earlier day notes may contain a free-text movement memory. Preserve it as history,
  // never as a claim that a workout was completed or a new habit/task.
  for(const [date,note] of Object.entries(state.days||{})){const title=String(note?.movement||'').trim(),id=`legacy-movement-day-${date}`;if(title&&!lifestyle.movement.activities.some(item=>item.id===id))lifestyle.movement.activities.push({id,title,date,status:'completed',plannedMinutes:0,actualMinutes:0,intensity:'',notes:'Migrated from an earlier daily movement note.',sourcePlanIdOptional:null,linkedActionIdOptional:null,createdAt:note?.savedAt||new Date().toISOString(),updatedAt:note?.savedAt||new Date().toISOString(),completedAt:note?.savedAt||null})}
  for(const [index,win] of (Array.isArray(state.wins)?state.wins:[]).entries()){const id=`legacy-win-${String(win?.id||index)}`;if(!lifestyle.growth.wins.some(item=>item.id===id))lifestyle.growth.wins.push({id,title:String(win?.text||win?.title||win?.name||'Saved accomplishment'),date:win?.date||new Date().toISOString().slice(0,10),source:'legacy-wins',externalIdOptional:String(win?.id||index),categoryOptional:'',noteOptional:'Migrated from the prior Wins surface.',pinned:false,createdAt:win?.createdAt||new Date().toISOString()})}
  const legacyLoves=[...(Array.isArray(state.myLoves)?state.myLoves:[]),...(Array.isArray(state.loves)?state.loves:[]),...(Array.isArray(state.people)?state.people:[])];
  for(const [index,item] of legacyLoves.entries()){const legacyId=String(item?.id||index),title=String(item?.title||item?.name||item?.text||'').trim(),id=`legacy-love-${legacyId}`,kind=String(item?.category||item?.type||item?.kind||'').toLowerCase(),hobbyLike=/hobby|interest|collection|creative|coding|color|anime|game|funko/.test(kind);if(!lifestyle.legacyMyLoves.some(entry=>entry.id===id))lifestyle.legacyMyLoves.push({id,legacyId,record:item,migration:hobbyLike?'hobby':'archived_legacy',createdAt:new Date().toISOString()});if(hobbyLike&&title&&!lifestyle.hobbies.items.some(hobby=>hobby.id===`migrated-hobby-${legacyId}`))lifestyle.hobbies.items.push({id:`migrated-hobby-${legacyId}`,title,category:'Migrated interest',status:'exploring',energyLevelOptional:'',typicalMinutesOptional:0,setupEffortOptional:'',requiresSuppliesOptional:false,notes:'Migrated from legacy My Loves; review whenever you want.',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),archivedAt:null})}
  state.schemaVersion=6;version=6;
 }
 {
  // Bridge each legacy reminder to exactly one canonical task/action. The source
  // reminder stays intact for old screens and recovery, but Daily Shit owns the
  // actionable representation. Stable ids make this migration idempotent.
  const tasks=Array.isArray(state.tasks)?state.tasks:[],reminders=Array.isArray(state.reminders)?state.reminders:[];
  const migrated=reminders.reduce((all,reminder,index)=>{const legacyId=String(reminder?.id||`index-${index}`),actionId=`legacy-reminder-${legacyId}`,exists=all.some(task=>String(task?.id)===actionId||String(task?.legacyReminderId||'')===legacyId);if(exists)return all;return[...all,{id:actionId,text:String(reminder?.title||reminder?.name||'Reminder'),type:'reminder',source:'migrated',legacyReminderId:legacyId,externalId:legacyId,date:reminder?.date||null,time:reminder?.time||null,scheduledDate:reminder?.date||null,scheduledTime:reminder?.time||null,recurrence:reminder?.repeat?{frequency:String(reminder.repeat).toLowerCase()}:null,done:!!reminder?.completed,status:reminder?.completed?'completed':'open',createdAt:reminder?.createdAt||new Date().toISOString()}]},tasks);
  state.tasks=migrated;
 }
 if(version>CURRENT_SCHEMA_VERSION)issues.push('Snapshot was created by a newer KatOS version; unknown fields were preserved.');
 return{state,issues,recovered:true};
}

/** Lightweight, preservation-first validation for current and legacy state. */
export function validateState(input={}){
 const migrated=migrateState(input);let data={...clone(DEFAULT_DATA),...migrated.state};const issues=[...migrated.issues];
 for(const key of ['events','reminders','tasks','routines','guidedRoutines','habits','goals','wins','courses','projects','archive','brainNotes','parkedProjects','labFindings','labObservations','labArchivedObservations','labExperiments','schoolTasks','schoolGoals','workItems'])if(!Array.isArray(data[key])){issues.push(`${key} was normalized to an empty list.`);data[key]=[]}
 data.tasks=data.tasks.map(normalizeTask);
 data.guidedRoutines=data.guidedRoutines.map(normalizeGuidedRoutine).filter(routine=>routine.id&&routine.name);
 for(const key of ['days','dayNotes','money','recovery','weeklyLabNotes','weeklyExperiment'])if(!isObject(data[key])){issues.push(`${key} was normalized to an object.`);data[key]={}}
 if(!isObject(data.money.financeWorkflow))data.money={...data.money,financeWorkflow:{}};
 if(!isObject(data.workSchedule)){issues.push('workSchedule was normalized.');data.workSchedule=clone(DEFAULT_DATA.workSchedule)}
 if(!isObject(data.workSchedule.weekly))data.workSchedule.weekly={};
 for(const day of ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'])if(!Array.isArray(data.workSchedule.weekly[day]))data.workSchedule.weekly[day]=[];
 if(!data.workSchedule.mode)data.workSchedule.mode='flexible';
 if(!isObject(data.workHQ)){issues.push('workHQ was normalized.');data.workHQ=clone(DEFAULT_WORK_HQ)}
 for(const key of ['clients','supervisors','materials','scheduleExceptions','sessionPlans','professionalDevelopment','fieldworkRecords','documents'])if(!Array.isArray(data.workHQ[key]))data.workHQ[key]=[];
 if(!isObject(data.workHQ.career))data.workHQ.career=clone(DEFAULT_WORK_HQ.career);
 if(!isObject(data.studyNook)){issues.push('studyNook was normalized.');data.studyNook=clone(DEFAULT_STUDY_NOOK)}
 for(const key of ['institutions','providers','programs','requirements','courses','assignments','terms','transferMappings','transferEvaluations','transferResults','studySessions','importantDates','documents'])if(!Array.isArray(data.studyNook[key]))data.studyNook[key]=[];
 if(!isObject(data.finance)){issues.push('finance was normalized.');data.finance=clone(DEFAULT_FINANCE)}
 for(const key of ['accounts','ledger','categories','bills','subscriptions','goals','goalContributions','incomeSources','payRates','gigPlatforms','gigOrders','gigPayouts','gigGoals'])if(!Array.isArray(data.finance[key]))data.finance[key]=[];
 if(!isObject(data.lifestyle))data.lifestyle=clone(DEFAULT_LIFESTYLE);
 for(const domain of ['movement','hobbies','growth'])if(!isObject(data.lifestyle[domain]))data.lifestyle[domain]=clone(DEFAULT_LIFESTYLE[domain]);
 for(const key of ['types','activities','plans','goals'])if(!Array.isArray(data.lifestyle.movement[key]))data.lifestyle.movement[key]=[];
 for(const key of ['items','projects','resources'])if(!Array.isArray(data.lifestyle.hobbies[key]))data.lifestyle.hobbies[key]=[];
 for(const key of ['areas','goals','milestones','wins','reflections'])if(!Array.isArray(data.lifestyle.growth[key]))data.lifestyle.growth[key]=[];
 if(!Array.isArray(data.lifestyle.legacyMyLoves))data.lifestyle.legacyMyLoves=[];
 if(!isObject(data.taskbot))data.taskbot={capacity:'High',missionId:null,disrupted:false};
 data.noms=normalizeNoms(data.noms);
 data.hyperfixation=normalizeHyperfixation(data.hyperfixation);
 data.routineMode=normalizeRoutineMode(data.routineMode);
 data.mochini=normalizeMochini(data.mochini);
 data.labExperiments=normalizeLabExperiments(data.labExperiments,data.weeklyExperiment);
 data.labObservations=appendMissing(data.labObservations,KAT_LABS_RESEARCH_OBSERVATIONS);
 data.labFindings=appendMissing(data.labFindings,KAT_LABS_RESEARCH_FINDINGS);
 data.projects=applyGuidedModesResearch(data.projects);
 if(!Number.isInteger(data.schemaVersion)||data.schemaVersion<CURRENT_SCHEMA_VERSION)data.schemaVersion=CURRENT_SCHEMA_VERSION;
 return{ok:isObject(input),state:data,issues};
}

export function normalize(input={}){return validateState(input).state}

function readBackupHistory(storage){const record=readRecord(storage,BACKUP_HISTORY_KEY);if(!record.ok)return[];const entries=Array.isArray(record.data?.entries)?record.data.entries:Array.isArray(record.data)?record.data:[];return entries.filter(entry=>isObject(entry)&&isObject(entry.data)).map(entry=>({createdAt:entry.createdAt||entry.data.__smUpdatedAt||'',data:entry.data}))}
function saveBackupHistory(storage,entries){writeRecord(storage,BACKUP_HISTORY_KEY,{entries:entries.slice(-MAX_LOCAL_BACKUPS)})}
function preserveCorrupt(storage,key,raw){if(typeof raw!=='string'||!raw)return;try{storage.setItem(`${CORRUPT_SNAPSHOT_PREFIX}${Date.now()}`,raw)}catch{/* Recovery copies are best effort only. */}}
function newestValid(candidates){return candidates.filter(candidate=>candidate?.data&&isObject(candidate.data)).sort((a,b)=>(dateStamp(b.data)||Date.parse(b.createdAt||'')||0)-(dateStamp(a.data)||Date.parse(a.createdAt||'')||0))[0]||null}

/** Loads without writing. A malformed active record is preserved and a valid backup is preferred. */
export function loadLocalData(storage=localStorage){
 const primary=readRecord(storage,DATA_KEY),legacy=readRecord(storage,BACKUP_KEY),history=readBackupHistory(storage);
 if(!primary.ok&&!primary.empty){preserveCorrupt(storage,DATA_KEY,primary.raw);console.warn('KatOS: primary local snapshot was malformed; attempting recovery from backups.');}
 const winner=newestValid([primary.ok?{data:primary.data}:null,legacy.ok?{data:legacy.data}:null,...history]);
 if(!winner){if(!primary.empty||!legacy.empty)console.warn('KatOS: no valid local snapshot was available; using defaults without overwriting local storage.');return clone(DEFAULT_DATA)}
 const result=validateState(winner.data);if(result.issues.length)console.warn('KatOS: loaded snapshot with safe normalization.',result.issues);return result.state;
}

/** Writes active state and records the prior valid active snapshot in a bounded recovery history. */
export function saveLocalData(data,storage=localStorage,{createBackup=true}={}){
 const result=validateState(data),next={...result.state,__smUpdatedAt:data?.__smUpdatedAt||new Date().toISOString()};const previous=readRecord(storage,DATA_KEY);
 if(createBackup&&previous.ok){const prior=validateState(previous.data).state;if(JSON.stringify(prior)!==JSON.stringify(next)){const history=readBackupHistory(storage).filter(entry=>JSON.stringify(entry.data)!==JSON.stringify(prior));history.push({createdAt:new Date().toISOString(),data:prior});saveBackupHistory(storage,history)}}
 writeRecord(storage,DATA_KEY,next);
 // Continue maintaining the legacy mirror so existing root hydration remains compatible.
 writeRecord(storage,BACKUP_KEY,next);
 return{ok:true,state:next,issues:result.issues};
}

export function listLocalBackups(storage=localStorage){return readBackupHistory(storage).slice().reverse().map(entry=>({createdAt:entry.createdAt,state:validateState(entry.data).state}))}
export function getLocalBackup(storage,index){const backups=listLocalBackups(storage);return backups[index]?.state||null}
