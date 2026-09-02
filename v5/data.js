const V4_KEY='sm_v4_beta';
const V5_DATA_KEY='sm_v5_data';
const V4_BACKUP_KEY='sm_v4_beta_backup_before_v5';
const V5_UI_KEY='sm_v5_preview_ui';
const V5_DAILY_NOTES_KEY='sm_v5_detailed_daily_notes';
const V5_ROOM_DETAILS_KEY='sm_v5_room_details';
const V5_LEDGER_KEY='sm_v5_money_ledger';

const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();

export function localDateKey(date=new Date()){
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,'0');
  const day=String(date.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

export function readV4State(){
  try{
    const migrated=localStorage.getItem(V5_DATA_KEY);
    if(migrated){const parsed=JSON.parse(migrated);return parsed&&typeof parsed==='object'?parsed:null}
    const raw=localStorage.getItem(V4_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(parsed&&typeof parsed==='object'){
      if(!localStorage.getItem(V4_BACKUP_KEY))localStorage.setItem(V4_BACKUP_KEY,raw);
      localStorage.setItem(V5_DATA_KEY,JSON.stringify(parsed));
      return parsed;
    }
    return null;
  }catch(error){
    console.warn('KatOS V5 could not read the local V4 snapshot.',error);
    return null;
  }
}

export function migrateV4ToV5(){
  const state=readV4State();
  return{ok:!!state,source:state?'V4 backup copied into editable V5 data':'No V4 data found'};
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
  const shifts=list(state?.work?.shifts);
  const gigs=list(state?.money?.earnings).map(row=>({...row,_v5Amount:amountOfGig(row)}));
  const activeClients=clients.filter(row=>row?.status!=='closed');
  const todaySessions=sessions.filter(row=>row?.date===today&&row?.status!=='canceled').sort((a,b)=>String(a?.startTime||'').localeCompare(String(b?.startTime||'')));
  const todayShifts=shifts.filter(row=>row?.date===today).sort((a,b)=>String(a?.startTime||'').localeCompare(String(b?.startTime||'')));
  const waitingNotes=sessions.filter(row=>row?.status!=='canceled'&&row?.noteStatus!=='submitted').sort(sessionSort);
  const recentGigs=gigs.slice().sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||''))).slice(0,8);

  return{found:true,today,state,clients,sessions,shifts,gigs,activeClients,todaySessions,todayShifts,waitingNotes,recentGigs};
}
