const V4_KEY='sm_v4_beta';
const V5_DATA_KEY='sm_v5_data';
const V4_BACKUP_KEY='sm_v4_beta_backup_before_v5';
const V5_MIGRATION_KEY='sm_v5_migration_receipt';
const V5_PREIMPORT_BACKUP_PREFIX='sm_v5_data_backup_before_v4_reimport_';
const V5_UI_KEY='sm_v5_preview_ui';
const V5_DAILY_NOTES_KEY='sm_v5_detailed_daily_notes';
const V5_ROOM_DETAILS_KEY='sm_v5_room_details';
const V5_LEDGER_KEY='sm_v5_money_ledger';
const CLOUD_PROJECT_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
const CLOUD_PUBLISHABLE_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';
const CLOUD_SESSION_KEYS=['sb-sigjwmgekmrwehylvuvu-auth-token','sm_v16_session'];

const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const unwrapState=value=>{
  let current=value;
  for(let i=0;i<3;i++){
    if(current?.data&&typeof current.data==='object'&&!Array.isArray(current.data))current=current.data;
    else break;
  }
  return current;
};
const COLLECTION_PATHS=[
  'life.inbox','life.tasks','life.reminders','life.routines','life.routineInstances','life.events','life.threads',
  'nourish.noms.foods','nourish.noms.recipes','nourish.noms.history','nourish.noms.groceries','nourish.noms.mealPlan','nourish.sips.history',
  'movement.sessions','movement.routines','movement.videos','movement.weighIns','movement.history','movement.logs','movement.completions',
  'education.programs','education.courses','education.items','education.sessions','education.reviews',
  'work.items','work.shifts','work.gigShifts','work.training','work.career','work.schedule','work.rbt.clients','work.rbt.sessions','work.rbt.notes','work.rbt.sessionNotes',
  'money.earnings','money.accounts','money.bills','money.spending','money.ledger','money.transactions','money.savingsGoals','money.debts',
  'growth.goals','growth.wins','growth.experiments',
  'insights.dayReviews','insights.activityLog','insights.observations','insights.experiments',
  'v4.people','v4.hobbies','v4.admin','v4.shopping','v4.brainDump','v4.openDayPlans','v4.archive','v4.patterns','v4.energyBlocks',
  'tasks','routines','events','reminders','habits','projects','goals','wins','courses','schoolTasks','workItems','brainNotes','priorities',
  'money.income','money.expenses','money.subscriptions','money.budgets','noms.foods','noms.pantry','noms.groceries','dayNotes','history'
];
const RECOVERY_COUNT_PATHS=[
  'life.tasks','life.routines','life.routineInstances','life.events','life.reminders','life.threads',
  'money.earnings','money.accounts','money.bills','money.spending','money.ledger','money.transactions','money.savingsGoals','money.debts',
  'work.items','work.shifts','work.training','work.career',
  'education.programs','education.courses','education.items','education.sessions','education.reviews',
  'insights.dayReviews','insights.activityLog','insights.observations','insights.experiments','movement.sessions',
  'v4.people','v4.hobbies','v4.admin','v4.shopping','v4.brainDump','v4.openDayPlans',
  'nourish.noms.foods','nourish.noms.recipes','nourish.noms.history','nourish.noms.groceries',
  'tasks','routines','events','reminders','habits','projects','goals','wins','courses','schoolTasks','workItems','brainNotes','priorities',
  'money.transactions','money.ledger'
];

function pathValue(source,path){return path.split('.').reduce((value,key)=>value?.[key],source)}
// Match V4 recovery exactly: its inventory includes retained blank slots too.
function countRows(value){return Array.isArray(value)?value.length:0}
function stateCounts(state){
  const counts={};
  COLLECTION_PATHS.forEach(path=>{counts[path]=countRows(pathValue(state,path))});
  counts.total=RECOVERY_COUNT_PATHS.reduce((sum,path)=>sum+countRows(pathValue(state,path)),0);
  return counts;
}
function hasUserContent(state){return stateCounts(state).total>0}
function shouldRefreshFromV4(migrated,v4){
  if(!v4)return false;
  if(!migrated)return true;
  const incoming=stateCounts(v4),existing=stateCounts(migrated);
  if(incoming.total>existing.total)return true;
  const incomingDate=Date.parse(sourceDate(v4)),existingDate=Date.parse(sourceDate(migrated));
  return Number.isFinite(incomingDate)&&Number.isFinite(existingDate)&&incomingDate>existingDate&&incoming.total>=existing.total;
}
function parseStored(raw){try{return raw?unwrapState(JSON.parse(raw)):null}catch{return null}}
function readReceipt(){try{const value=JSON.parse(localStorage.getItem(V5_MIGRATION_KEY)||'null');return value&&typeof value==='object'?value:null}catch{return null}}
function writeReceipt(receipt){try{localStorage.setItem(V5_MIGRATION_KEY,JSON.stringify(receipt))}catch{}}
function sourceDate(state){return text(state?.meta?.updatedAt)||text(state?.meta?.createdAt)||text(state?.__smUpdatedAt)}

function cloudSession(){
  for(const key of CLOUD_SESSION_KEYS){
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||'null');
      const value=parsed?.currentSession||parsed?.session||parsed;
      if(value?.access_token&&value?.user?.id)return value;
    }catch{}
  }
  return null;
}

export async function restoreCloudV4Data(){
  const session=cloudSession();
  if(!session)return{ok:false,error:'Sign in to your KatOS account in V4 first, then try cloud restore again.'};
  try{
    const endpoint=`${CLOUD_PROJECT_URL}/rest/v1/planner_data?user_id=eq.${encodeURIComponent(session.user.id)}&select=data,updated_at`;
    const response=await fetch(endpoint,{headers:{apikey:CLOUD_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`} });
    const payload=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(text(payload?.message)||text(payload?.hint)||'The cloud backup could not be read.');
    const row=list(payload)[0];
    if(!row?.data||typeof row.data!=='object')return{ok:false,error:'No saved planner backup was found for this account.'};
    const source=unwrapState(row.data);
    const normalized=Number(source?.schemaVersion)===4?source:legacyFlatState(source);
    if(!hasUserContent(normalized))return{ok:false,error:'The cloud backup loaded, but it did not contain planner records.'};
    const raw=JSON.stringify({data:source,updatedAt:row.updated_at||''});
    const receipt=saveImportedState(normalized,raw,'supabase','cloud');
    return{ok:!!receipt,counts:receipt?.counts||stateCounts(normalized),sourceUpdatedAt:row.updated_at||''};
  }catch(error){return{ok:false,error:error?.message||'Cloud restore did not finish.'}}
}

function legacyFlatState(state){
  const source=obj(state);
  if(source.life||source.money||source.nourish||source.work||source.growth)return source;
  if(!['tasks','events','reminders','routines','habits','goals','wins','courses','archive'].some(key=>Array.isArray(source[key])))return source;
  const moneySource=obj(source.money);
  return{...source,schemaVersion:4,life:{inbox:list(source.inbox),tasks:list(source.tasks),reminders:list(source.reminders),routines:list(source.routines),routineInstances:[],events:list(source.events),threads:list(source.threads)},nourish:{noms:{foods:list(source.noms?.foods),recipes:list(source.noms?.recipes),history:list(source.noms?.history),groceries:list(source.noms?.groceries),mealPlan:[]},sips:obj(source.sips)},education:{programs:[],courses:list(source.courses),items:list(source.schoolTasks),sessions:list(source.studySessions)},work:{items:list(source.workItems),shifts:list(source.shifts),training:[],career:[]},money:{...moneySource,ledger:list(moneySource.ledger||moneySource.transactions),earnings:list(moneySource.earnings),accounts:list(moneySource.accounts),bills:list(moneySource.bills),spending:list(moneySource.spending),savingsGoals:list(moneySource.savingsGoals),debts:list(moneySource.debts)},growth:{goals:list(source.goals),wins:list(source.wins),experiments:[]},insights:{dayReviews:[],activityLog:[],observations:[],experiments:[]},v4:{people:list(source.people),hobbies:list(source.hobbies),admin:list(source.admin),shopping:list(source.shopping),brainDump:list(source.brainNotes),openDayPlans:[],archive:list(source.archive)}};
}

function candidateFromKey(key){
  try{
    const raw=localStorage.getItem(key)||'';
    const parsed=legacyFlatState(parseStored(raw));
    return parsed&&typeof parsed==='object'?{key,raw,state:parsed}:null;
  }catch{return null}
}

function bestLegacyCandidate(){
  const keys=[V4_KEY,'sm_v4_beta_backup_before_v5','sm_v4_beta_backup','sm_v16','sm_v16_backup','sm_v3_beta'];
  try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&(/^(sm_v4_beta_before_restore_|sm_v4_beta_before_cloud_restore_|sm_v16_backups)/.test(key)))keys.push(key)}}catch{}
  const candidates=keys.map(candidateFromKey).filter(candidate=>candidate?.state);
  return candidates.find(candidate=>candidate.key===V4_KEY&&hasUserContent(candidate.state))||candidates.filter(candidate=>hasUserContent(candidate.state)).sort((a,b)=>stateCounts(b.state).total-stateCounts(a.state).total)[0]||candidates[0]||null;
}

function ledgerEntryFromV4(row,index,kindHint=''){
  const item=obj(row),rawKind=text(item.kind||item.type||kindHint).toLowerCase(),kind=['income','expense','transfer'].includes(rawKind)?rawKind:(kindHint==='income'?'income':'expense');
  const amount=Math.abs(Number(item.amount??item.actualAmount??item.receivedAmount??item.netAmount??item.total??0));
  const label=text(item.label||item.name||item.description||item.title)||'Transaction';
  const date=/^\d{4}-\d{2}-\d{2}$/.test(text(item.date||item.receivedDate||item.expectedDate))?text(item.date||item.receivedDate||item.expectedDate):localDateKey();
  if(!label||!Number.isFinite(amount)||amount<=0)return null;
  return{id:`v4-${text(item.id)||index}`,kind,label,amount:cents(amount),date,category:text(item.category)||'Other',account:text(item.accountId||item.account||item.fromAccountId),toAccount:text(item.toAccountId||item.toAccount),note:text(item.note),createdAt:text(item.createdAt)||'',source:'v4-migration'};
}

function importedLedgerEntries(state){
  const moneyState=obj(state?.money),rawLedger=list(moneyState.ledger).length?moneyState.ledger:list(moneyState.transactions);
  const source=rawLedger.length?rawLedger:[...list(moneyState.spending).map(row=>({...obj(row),kind:'expense',label:row?.description||row?.label||row?.name})),...list(moneyState.earnings).filter(row=>row?.status==='received'||row?.received===true||row?.actualAmount||row?.amount).map(row=>({...obj(row),kind:'income',label:row?.label||row?.employer||row?.name}))];
  return source.map((row,index)=>ledgerEntryFromV4(row,index)).filter(Boolean);
}

function mergeImportedLedger(state){
  const source=importedLedgerEntries(state);
  if(!source.length)return 0;
  const current=loadV5Ledger(),seen=new Set(current.entries.map(entry=>String(entry?.id))),fresh=source.filter(entry=>!seen.has(String(entry.id)));
  if(!fresh.length)return 0;
  try{localStorage.setItem(V5_LEDGER_KEY,JSON.stringify({openingBalance:current.openingBalance,entries:[...current.entries,...fresh].slice(-500)}));return fresh.length}catch{return 0}
}

function mergeImportedDailyNotes(state){
  const source=list(state?.insights?.dayReviews).filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(text(row?.date))).map(row=>({
    date:text(row.date),mood:text(row.mood),sleepHours:text(row.sleepHours),sleepQuality:text(row.sleepQuality),energy:text(row.energy),stress:text(row.stress),meds:text(row.meds),food:text(row.food),movement:text(row.movement),social:text(row.social),whatHappened:text(row.happened||row.whatHappened),whatHelped:text(row.helped||row.whatHelped),whatWasHard:text(row.hard||row.whatWasHard),win:text(row.proud||row.win),tomorrowFocus:text(row.tomorrow||row.tomorrowFocus),notes:text(row.notes),updatedAt:text(row.updatedAt||row.createdAt)||new Date().toISOString(),source:'v4-migration'
  }));
  if(!source.length)return 0;
  let existing=[];try{existing=list(JSON.parse(localStorage.getItem(V5_DAILY_NOTES_KEY)||'[]'))}catch{}
  const byDate=new Map(existing.map(note=>[text(note?.date),note]));let added=0;
  source.forEach(note=>{if(!byDate.has(note.date)){byDate.set(note.date,note);added++}});
  if(!added)return 0;
  try{localStorage.setItem(V5_DAILY_NOTES_KEY,JSON.stringify([...byDate.values()].slice(-180)));return added}catch{return 0}
}

function saveImportedState(state,raw,key,reason='initial'){
  if(!state||typeof state!=='object')return null;
  try{
    if(raw&&!localStorage.getItem(V4_BACKUP_KEY))localStorage.setItem(V4_BACKUP_KEY,raw);
    localStorage.setItem(V5_DATA_KEY,JSON.stringify(state));
    const ledgerImported=mergeImportedLedger(state),dailyNotesImported=mergeImportedDailyNotes(state);
    const receipt={version:2,sourceKey:key,reason,importedAt:new Date().toISOString(),sourceUpdatedAt:sourceDate(state),counts:stateCounts(state),ledgerImported,dailyNotesImported,backupKey:V4_BACKUP_KEY};
    writeReceipt(receipt);
    return receipt;
  }catch(error){console.warn('KatOS V5 could not save the V4 migration.',error);return null}
}

export function localDateKey(date=new Date()){
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,'0');
  const day=String(date.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

export function readV4State(){
  try{
    const migrated=candidateFromKey(V5_DATA_KEY);
    const current=bestLegacyCandidate();
    const v4=current?.state;
    if(v4&&hasUserContent(v4)){
      if(!migrated?.state||shouldRefreshFromV4(migrated.state,v4)){
        if(migrated?.raw){try{localStorage.setItem(`${V5_PREIMPORT_BACKUP_PREFIX}${Date.now()}`,migrated.raw)}catch{}}
        saveImportedState(v4,current?.raw||'',current?.key||V4_KEY,migrated?.state?'refresh':'repair');
      }
      return v4;
    }
    if(migrated?.state){
      const ledgerImported=mergeImportedLedger(migrated.state),dailyNotesImported=mergeImportedDailyNotes(migrated.state);
      if(!readReceipt())writeReceipt({version:2,sourceKey:V5_DATA_KEY,reason:'repair',importedAt:new Date().toISOString(),sourceUpdatedAt:sourceDate(migrated.state),counts:stateCounts(migrated.state),ledgerImported,dailyNotesImported,backupKey:V4_BACKUP_KEY});
      return migrated.state;
    }
    if(v4){saveImportedState(v4,current?.raw||'',current?.key||V4_KEY,'initial');return v4}
    return null;
  }catch(error){
    console.warn('KatOS V5 could not read the local V4 snapshot.',error);
    return null;
  }
}

export function migrateV4ToV5(){
  try{
    const current=bestLegacyCandidate();
    if(!current?.state)return{ok:false,source:'No V4 data found'};
    const existing=localStorage.getItem(V5_DATA_KEY);
    if(existing){try{localStorage.setItem(`${V5_PREIMPORT_BACKUP_PREFIX}${Date.now()}`,existing)}catch{}}
    const receipt=saveImportedState(current.state,current.raw,current.key,'manual');
    return{ok:true,source:'V4 data copied into editable V5 data',counts:receipt?.counts||stateCounts(current.state),ledgerImported:receipt?.ledgerImported||0};
  }catch(error){return{ok:false,source:'V4 data could not be copied'} }
}

// This runs only in the browser. It does not upload the chosen export anywhere.
export function importV4Export(raw){
  try{
    const state=legacyFlatState(parseStored(raw));
    if(!state||!hasUserContent(state))return{ok:false,error:'That file did not contain a KatOS V4 planner export.'};
    const current=localStorage.getItem(V4_KEY);
    if(current)try{localStorage.setItem(`${V4_BACKUP_KEY}_before_export_${Date.now()}`,current)}catch{}
    localStorage.setItem(V4_KEY,String(raw));
    const existing=localStorage.getItem(V5_DATA_KEY);
    if(existing)try{localStorage.setItem(`${V5_PREIMPORT_BACKUP_PREFIX}${Date.now()}`,existing)}catch{}
    const receipt=saveImportedState(state,String(raw),'KatOS V4 export','file-import');
    return{ok:true,counts:receipt?.counts||stateCounts(state)};
  }catch{return{ok:false,error:'KatOS could not read that export file.'}}
}

export function migrationInfo(){
  const state=readV4State(),receipt=readReceipt();
  return{found:!!state,counts:state?stateCounts(state):{},receipt,ledgerEntries:loadV5Ledger().entries.length};
}

export function loadV5Ui(){
  const fallback={view:'boss',mode:'normal',sidebarOpen:false,bossLane:'rbt'};
  try{
    const parsed=JSON.parse(localStorage.getItem(V5_UI_KEY)||'null');
    if(!parsed||typeof parsed!=='object')return fallback;
    return{
      view:text(parsed.view)||fallback.view,
      mode:['normal','tiny','power'].includes(parsed.mode)?parsed.mode:fallback.mode,
      sidebarOpen:false,
      bossLane:parsed.bossLane==='gig'?'gig':'rbt',
      scheduleView:['day','week','calendar'].includes(parsed.scheduleView)?parsed.scheduleView:'day'
    };
  }catch{return fallback}
}

export function saveV5Ui(ui){
  const safe={view:ui.view,mode:ui.mode,bossLane:ui.bossLane,scheduleView:ui.scheduleView};
  try{localStorage.setItem(V5_UI_KEY,JSON.stringify(safe))}catch{}
}

export function loadV5DailyNote(day=localDateKey()){
  try{
    const entries=JSON.parse(localStorage.getItem(V5_DAILY_NOTES_KEY)||'[]');
    return list(entries).find(entry=>text(entry?.date)===day)||null;
  }catch{return null}
}

export function saveV5DailyNote(fields){
  const entry={...fields,date:localDateKey(),updatedAt:new Date().toISOString()};
  try{
    const entries=list(JSON.parse(localStorage.getItem(V5_DAILY_NOTES_KEY)||'[]')).filter(item=>text(item?.date)!==entry.date);
    entries.push(entry);
    localStorage.setItem(V5_DAILY_NOTES_KEY,JSON.stringify(entries.slice(-180)));
  }catch(error){console.warn('KatOS V5 could not save this daily note.',error)}
  return entry;
}

export function loadV5RoomDetail(room){
  try{
    const details=JSON.parse(localStorage.getItem(V5_ROOM_DETAILS_KEY)||'{}');
    const entry=details&&typeof details==='object'?details[room]:null;
    return entry&&typeof entry==='object'?entry:null;
  }catch{return null}
}

export function saveV5RoomDetail(room,fields){
  const entry={...fields,updatedAt:new Date().toISOString()};
  try{
    const details=JSON.parse(localStorage.getItem(V5_ROOM_DETAILS_KEY)||'{}');
    localStorage.setItem(V5_ROOM_DETAILS_KEY,JSON.stringify({...((details&&typeof details==='object')?details:{}),[room]:entry}));
  }catch(error){console.warn('KatOS V5 could not save this room detail.',error)}
  return entry;
}

const cloneState=value=>{try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value||{}))}};
const itemId=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const setAtPath=(state,path,value)=>{const keys=path.split('.');let cursor=state;for(let index=0;index<keys.length-1;index++){const key=keys[index];cursor[key]=obj(cursor[key]);cursor=cursor[key]}cursor[keys.at(-1)]=value};
const appendAtPath=(state,path,row)=>{const current=list(pathValue(state,path));setAtPath(state,path,[...current,row])};
const minutesFrom=value=>({"5 minutes":5,"15 minutes":15,"30 minutes":30,"45 minutes":45,"1 hour":60,"Longer than an hour":90,"Longer":90}[text(value)]||0);

// V5's pop-ups update the planner data itself, not just a display card.  The
// original V4 envelope is retained so V4 remains a safe recovery copy.
export function saveV5Workspace(view,fields={}){
  try{
    const source=readV4State()||candidateFromKey(V5_DATA_KEY)?.state;
    if(!source)return{ok:false,error:'Load your V4 data first so V5 has a planner to update.'};
    const state=cloneState(source),today=localDateKey(),now=new Date().toISOString(),value=key=>text(fields[key]);
    switch(view){
      case'home':state.context={...obj(state.context),focus:value('focus'),capacity:value('capacity'),energy:value('energy'),location:value('location'),protected:value('protected'),nextStep:value('nextStep'),needs:value('needs'),note:value('homeNotes')};break;
      case'boss':if(!value('date'))return{ok:false,error:'Choose the date for the gig shift first.'};appendAtPath(state,'work.gigShifts',{id:itemId('gig'),source:value('source')||'Gig work',date:value('date'),startTime:value('startTime'),endTime:value('endTime'),targetAmount:Number(fields.targetAmount)||0,note:value('note'),status:'planned',createdAt:now});break;
      case'time':appendAtPath(state,'life.events',{id:itemId('event'),title:value('anchor')||'Schedule item',date:value('date')||today,startTime:value('startTime'),endTime:value('endTime'),location:value('location'),priority:value('priority'),notes:value('scheduleNotes'),createdAt:now});break;
      case'tasks':if(!value('task'))return{ok:false,error:'Give the to-do a name first.'};appendAtPath(state,'life.tasks',{id:itemId('task'),text:value('task'),title:value('task'),date:value('due'),dueDate:value('due'),priority:value('priority').toLowerCase()||'normal',minutes:minutesFrom(value('timeEstimate')),location:value('location'),protected:value('protected').startsWith('Yes'),firstStep:value('firstStep'),notes:value('taskNotes'),done:false,createdAt:now});break;
      case'mochini':state.mochini={...obj(state.mochini),life:{...obj(state.mochini?.life),mood:value('mood'),energy:value('energy'),help:value('help'),suggestions:value('suggestions'),topic:value('topic'),context:value('context'),boundary:value('boundary'),updatedAt:now}};break;
      case'pings':if(!value('reminder'))return{ok:false,error:'Write the reminder first.'};appendAtPath(state,'life.reminders',{id:itemId('ping'),title:value('reminder'),date:value('date'),timing:value('when'),urgency:value('urgency'),repeat:value('repeat'),place:value('place'),notes:value('pingNotes'),completed:false,createdAt:now});break;
      case'routines':if(!value('routine'))return{ok:false,error:'Give the routine a name first.'};appendAtPath(state,'life.routines',{id:itemId('routine'),name:value('routine'),daypart:value('time'),recurrence:{'Every day':'daily',Weekdays:'weekdays','A few times a week':'selected',Weekly:'weekly','As needed':'as-needed'}[value('rhythm')]||'daily',cue:value('cue'),lowEnergy:value('energyVersion'),skipRule:value('skipRule'),steps:value('routineNotes').split('\n').map(label=>text(label)).filter(Boolean).map(label=>({id:itemId('step'),label,minutes:5,optional:false})),archived:false,createdAt:now});break;
      case'motion':appendAtPath(state,'movement.sessions',{id:itemId('movement'),label:value('type')||'Movement',type:value('type')||'movement',minutes:Number(fields.minutes)||0,effort:value('intensity'),location:value('location'),body:value('body'),after:value('after'),note:value('motionNotes'),date:today,createdAt:now});break;
      case'people':if(!value('person'))return{ok:false,error:'Add the person’s name first.'};appendAtPath(state,'v4.people',{id:itemId('person'),name:value('person'),relationship:value('relationship'),contactMethod:value('contactMethod'),nextContact:value('nextContact'),plans:value('plan'),boundary:value('boundary'),notes:value('important'),createdAt:now});break;
      case'hobbies':if(!value('hobby'))return{ok:false,error:'Give the hobby a name first.'};appendAtPath(state,'v4.hobbies',{id:itemId('hobby'),name:value('hobby'),kind:value('category'),status:{'Currently playing':'playing','Trying it':'playing',Curious:'curious',Paused:'shelf',Someday:'shelf'}[value('status')]||'curious',energy:value('energy'),mood:value('mood'),nextStep:value('next'),notes:value('hobbyNotes'),createdAt:now});break;
      case'study':if(!value('goal'))return{ok:false,error:'Add what you want to finish first.'};appendAtPath(state,'education.items',{id:itemId('study'),title:value('goal'),course:value('course'),type:value('activity')||'study',energy:value('energy'),minutes:minutesFrom(value('sessionLength')),dueDate:value('due'),nextStep:value('next'),notes:value('studyNotes'),done:false,createdAt:now});break;
      case'growth':if(!value('goal'))return{ok:false,error:'Give the goal a name first.'};appendAtPath(state,'growth.goals',{id:itemId('goal'),title:value('goal'),why:value('why'),area:value('area'),timeframe:value('timeframe'),feeling:value('feeling'),pace:value('pace'),support:value('support'),nextStep:value('next'),proof:value('proof'),status:'moving',createdAt:now});break;
      case'dump':if(!value('thought'))return{ok:false,error:'Write the thought first.'};appendAtPath(state,'v4.brainDump',{id:itemId('dump'),text:value('thought'),bucket:value('bucket').toLowerCase()||'inbox',urgency:value('urgency'),keep:value('keep'),nextStep:value('next'),notes:value('dumpNotes'),createdAt:now});break;
      case'archive':if(!value('title'))return{ok:false,error:'Name what you are saving first.'};appendAtPath(state,'v4.archive',{id:itemId('archive'),title:value('title'),kind:value('kind'),room:value('room'),reason:value('reason'),find:value('find'),notes:value('archiveNotes'),archivedAt:now});break;
      case'settings':state.profile={...obj(state.profile),preferences:{...obj(state.profile?.preferences),v5:{...fields,updatedAt:now}}};break;
      case'review':{const reviews=list(state.insights?.dayReviews),entry={...fields,id:reviews.find(row=>text(row?.date)===today)?.id||itemId('review'),date:today,happened:value('whatHappened'),helped:value('whatHelped'),hard:value('whatWasHard'),proud:value('win'),tomorrow:value('tomorrowFocus'),updatedAt:now,createdAt:reviews.find(row=>text(row?.date)===today)?.createdAt||now};setAtPath(state,'insights.dayReviews',[...reviews.filter(row=>text(row?.date)!==today),entry]);break}
      default:return{ok:true};
    }
    state.meta={...obj(state.meta),updatedAt:now};
    const existing=localStorage.getItem(V4_KEY)||'';
    const envelope=parseStored(existing)&&JSON.parse(existing)?.data?{...JSON.parse(existing),data:state}:{data:state};
    const raw=JSON.stringify(envelope);
    localStorage.setItem(V4_KEY,raw);
    saveImportedState(state,raw,V4_KEY,'v5-edit');
    return{ok:true};
  }catch(error){console.warn('KatOS V5 could not save this workspace.',error);return{ok:false,error:'That could not be saved. Your existing planner data is still safe.'}}
}

function cents(value){return Math.round((Number(value)||0)*100)/100}

export function loadV5Ledger(){
  try{
    const parsed=JSON.parse(localStorage.getItem(V5_LEDGER_KEY)||'null');
    if(Array.isArray(parsed))return{openingBalance:0,entries:parsed};
    return{openingBalance:cents(parsed?.openingBalance),entries:list(parsed?.entries).filter(entry=>entry&&typeof entry==='object')};
  }catch{return{openingBalance:0,entries:[]}}
}

export function saveV5LedgerEntry(fields){
  const label=text(fields?.label||fields?.name),amount=Math.abs(Number(fields?.amount));
  if(!label||!Number.isFinite(amount)||amount<=0)return{ok:false,error:'Add a name and an amount first.'};
  const kind=['income','expense','transfer'].includes(text(fields?.kind))?text(fields.kind):'expense';
  const date=/^\d{4}-\d{2}-\d{2}$/.test(text(fields?.date))?text(fields.date):localDateKey();
  const entry={id:`v5-ledger-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,kind,label,amount:cents(amount),date,category:text(fields?.category)||'Other',account:text(fields?.account)||'General',toAccount:text(fields?.toAccount),note:text(fields?.note),createdAt:new Date().toISOString()};
  const current=loadV5Ledger();
  try{localStorage.setItem(V5_LEDGER_KEY,JSON.stringify({openingBalance:current.openingBalance,entries:[...current.entries,entry].slice(-500)}));return{ok:true,entry}}
  catch(error){console.warn('KatOS V5 could not save this ledger entry.',error);return{ok:false,error:'This entry could not be saved.'}}
}

export function removeV5LedgerEntry(id){
  const current=loadV5Ledger();
  try{localStorage.setItem(V5_LEDGER_KEY,JSON.stringify({openingBalance:current.openingBalance,entries:current.entries.filter(entry=>String(entry?.id)!==String(id))}));return true}
  catch(error){console.warn('KatOS V5 could not remove this ledger entry.',error);return false}
}

export function ledgerSummary(baseBalance=0,today=localDateKey()){
  const entries=loadV5Ledger().entries.slice().sort((a,b)=>String(a?.date||'').localeCompare(String(b?.date||''))||String(a?.createdAt||'').localeCompare(String(b?.createdAt||'')));
  const month=String(today).slice(0,7),monthEntries=entries.filter(entry=>String(entry?.date||'').startsWith(month));
  const income=entries.filter(entry=>entry.kind==='income').reduce((sum,entry)=>sum+cents(entry.amount),0),expenses=entries.filter(entry=>entry.kind==='expense').reduce((sum,entry)=>sum+cents(entry.amount),0);
  const incomeMonth=monthEntries.filter(entry=>entry.kind==='income').reduce((sum,entry)=>sum+cents(entry.amount),0),expenseMonth=monthEntries.filter(entry=>entry.kind==='expense').reduce((sum,entry)=>sum+cents(entry.amount),0);
  const categories={};monthEntries.filter(entry=>entry.kind==='expense').forEach(entry=>{const key=text(entry.category)||'Other';categories[key]=cents((categories[key]||0)+Number(entry.amount||0))});
  return{entries,monthEntries,income,expenses,net:cents(income-expenses),incomeMonth,expenseMonth,netMonth:cents(incomeMonth-expenseMonth),categories,available:cents(Number(baseBalance)+income-expenses)};
}

function amountOfGig(row){
  const direct=Number(row?.amount??row?.total??row?.actualAmount);
  if(Number.isFinite(direct)&&direct!==0)return direct;
  return (Number(row?.earnings)||0)+(Number(row?.tips)||0);
}

function sessionSort(a,b){
  return String(b?.date||'').localeCompare(String(a?.date||''))||String(b?.startTime||'').localeCompare(String(a?.startTime||''));
}

export function snapshotV4(){
  const state=readV4State();
  const today=localDateKey();
  if(!state){
    return{found:false,today,clients:[],sessions:[],shifts:[],gigs:[],activeClients:[],todaySessions:[],todayShifts:[],waitingNotes:[],recentGigs:[]};
  }

  const clients=list(state?.work?.rbt?.clients);
  const sessions=list(state?.work?.rbt?.sessions);
  const gigShifts=list(state?.work?.gigShifts);
  const shifts=[...list(state?.work?.shifts),...gigShifts];
  const gigs=list(state?.money?.earnings).map(row=>({...row,_v5Amount:amountOfGig(row)}));
  const activeClients=clients.filter(row=>row?.status!=='closed');
  const todaySessions=sessions.filter(row=>row?.date===today&&row?.status!=='canceled').sort((a,b)=>String(a?.startTime||'').localeCompare(String(b?.startTime||'')));
  const todayShifts=shifts.filter(row=>row?.date===today).sort((a,b)=>String(a?.startTime||'').localeCompare(String(b?.startTime||'')));
  const waitingNotes=sessions.filter(row=>row?.status!=='canceled'&&row?.noteStatus!=='submitted').sort(sessionSort);
  const recentGigs=gigs.slice().sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||''))).slice(0,8);

  return{found:true,today,state,clients,sessions,shifts,gigs,gigShifts,activeClients,todaySessions,todayShifts,waitingNotes,recentGigs};
}


const EDITABLE_RECORD_PATHS=new Set([
  'life.events','life.tasks','life.reminders','life.routines','movement.sessions','movement.routines',
  'v4.people','v4.hobbies','education.courses','education.items','growth.goals','growth.wins',
  'v4.brainDump','v4.archive','money.accounts','money.bills','money.savingsGoals','money.subscriptions',
  'money.earnings','work.gigShifts','work.shifts','work.rbt.clients','work.rbt.sessions','insights.dayReviews'
]);

function persistEditedState(state){
  const now=new Date().toISOString();
  state.meta={...obj(state.meta),updatedAt:now};
  const existing=localStorage.getItem(V4_KEY)||'';
  let envelope={data:state};
  try{const parsed=JSON.parse(existing);if(parsed?.data&&typeof parsed.data==='object')envelope={...parsed,data:state}}catch{}
  const raw=JSON.stringify(envelope);
  localStorage.setItem(V4_KEY,raw);
  saveImportedState(state,raw,V4_KEY,'v5-record-edit');
  return state;
}

export function updateV5LedgerEntry(id,fields={}){
  const current=loadV5Ledger(),index=current.entries.findIndex(entry=>String(entry?.id)===String(id));
  if(index<0)return{ok:false,error:'That ledger entry could not be found.'};
  const existing=current.entries[index];
  const amount=fields.amount===undefined?existing.amount:Math.abs(Number(fields.amount));
  if(!text(fields.label??existing.label)||!Number.isFinite(amount)||amount<=0)return{ok:false,error:'A ledger entry needs a name and amount.'};
  const entry={...existing,...fields,id:existing.id,amount:cents(amount),updatedAt:new Date().toISOString()};
  try{
    const entries=current.entries.slice();entries[index]=entry;
    localStorage.setItem(V5_LEDGER_KEY,JSON.stringify({openingBalance:current.openingBalance,entries}));
    return{ok:true,record:entry};
  }catch{return{ok:false,error:'That ledger entry could not be updated.'}}
}

export function updateV5Record(path,id,fields={}){
  if(path==='v5.ledger')return updateV5LedgerEntry(id,fields);
  if(!EDITABLE_RECORD_PATHS.has(path))return{ok:false,error:'That kind of entry cannot be edited here yet.'};
  try{
    const state=cloneState(readV4State()||candidateFromKey(V5_DATA_KEY)?.state);
    const collection=list(pathValue(state,path)),index=collection.findIndex(row=>String(row?.id)===String(id));
    if(index<0)return{ok:false,error:'That saved entry could not be found.'};
    const old=obj(collection[index]);
    const record={...old,...fields,id:old.id,createdAt:old.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const next=collection.slice();next[index]=record;setAtPath(state,path,next);if(path==='insights.dayReviews')syncDetailedDailyNote(record);persistEditedState(state);
    return{ok:true,record};
  }catch{return{ok:false,error:'That entry could not be updated. Your existing data is still safe.'}}
}

export function archiveV5Record(path,id){
  try{
    if(path==='v5.ledger'){
      const current=loadV5Ledger(),index=current.entries.findIndex(row=>String(row?.id)===String(id));
      if(index<0)return{ok:false,error:'That ledger entry could not be found.'};
      const item=current.entries[index],entries=current.entries.filter((_,rowIndex)=>rowIndex!==index);
      localStorage.setItem(V5_LEDGER_KEY,JSON.stringify({openingBalance:current.openingBalance,entries}));
      const state=cloneState(readV4State()||candidateFromKey(V5_DATA_KEY)?.state);
      appendAtPath(state,'v4.archive',{id:itemId('archive'),kind:'v5.ledger',originalId:item.id,title:item.label||'Ledger entry',data:item,archivedAt:new Date().toISOString()});
      persistEditedState(state);return{ok:true};
    }
    if(!EDITABLE_RECORD_PATHS.has(path)||path==='v4.archive')return{ok:false,error:'This entry cannot be archived here.'};
    const state=cloneState(readV4State()||candidateFromKey(V5_DATA_KEY)?.state);
    const collection=list(pathValue(state,path)),index=collection.findIndex(row=>String(row?.id)===String(id));
    if(index<0)return{ok:false,error:'That saved entry could not be found.'};
    const item=collection[index],next=collection.filter((_,rowIndex)=>rowIndex!==index);
    setAtPath(state,path,next);
    if(path==='insights.dayReviews')removeDetailedDailyNote(item.date);
    appendAtPath(state,'v4.archive',{id:itemId('archive'),kind:path,originalId:item.id,title:rowTitleForArchive(item),data:item,archivedAt:new Date().toISOString()});
    persistEditedState(state);return{ok:true};
  }catch{return{ok:false,error:'That entry could not be archived. Your existing data is still safe.'}}
}

function syncDetailedDailyNote(row){
  const date=text(row?.date);if(!date)return;
  const note={date,mood:text(row.mood),sleepHours:text(row.sleepHours),sleepQuality:text(row.sleepQuality),energy:text(row.energy),stress:text(row.stress),meds:text(row.meds),food:text(row.food),movement:text(row.movement),social:text(row.social),whatHappened:text(row.whatHappened||row.happened),whatHelped:text(row.whatHelped||row.helped),whatWasHard:text(row.whatWasHard||row.hard),win:text(row.win||row.proud),tomorrowFocus:text(row.tomorrowFocus||row.tomorrow),notes:text(row.notes),updatedAt:text(row.updatedAt)||new Date().toISOString(),source:'v5-record-edit'};
  try{const entries=list(JSON.parse(localStorage.getItem(V5_DAILY_NOTES_KEY)||'[]')).filter(item=>text(item?.date)!==date);entries.push(note);localStorage.setItem(V5_DAILY_NOTES_KEY,JSON.stringify(entries.slice(-180)))}catch{}
}
function removeDetailedDailyNote(date){try{const entries=list(JSON.parse(localStorage.getItem(V5_DAILY_NOTES_KEY)||'[]')).filter(item=>text(item?.date)!==text(date));localStorage.setItem(V5_DAILY_NOTES_KEY,JSON.stringify(entries))}catch{}}
function rowTitleForArchive(row){return text(row?.title)||text(row?.text)||text(row?.name)||text(row?.label)||'Archived entry'}

export function openV5DayReview(date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text(date)))return{ok:false,error:'Choose a valid calendar date.'};
  try{
    const state=cloneState(readV4State()||candidateFromKey(V5_DATA_KEY)?.state);
    const reviews=list(pathValue(state,'insights.dayReviews'));
    const existing=reviews.find(row=>text(row?.date)===date);
    if(existing)return{ok:true,record:existing};
    const now=new Date().toISOString();
    const record={id:itemId('review'),date,mood:'',sleepHours:'',sleepQuality:'',energy:'',stress:'',meds:'',food:'',movement:'',social:'',whatHappened:'',whatHelped:'',whatWasHard:'',win:'',tomorrowFocus:'',notes:'',createdAt:now,updatedAt:now};
    appendAtPath(state,'insights.dayReviews',record);persistEditedState(state);
    return{ok:true,record};
  }catch{return{ok:false,error:'That day review could not be opened.'}}
}
