export const V4_KEY='sm_v4_beta';
export const V3_KEY='sm_v3_beta';
export const V4_BUILD='4.0.0-preview.2';
import{DEFAULT_LIFE,normalizeLife}from'./mochini-life.js';

const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const clone=v=>structuredClone(v);
const _makeId=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const pad=v=>String(v).padStart(2,'0');
export const localDateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
export const money=v=>Math.round((Number(v)||0)*100)/100;

function parseStorage(key){try{const raw=localStorage.getItem(key);if(!raw)return null;const parsed=JSON.parse(raw);return obj(parsed?.data||parsed)}catch{return null}}

function normalizeArchive(v){return list(v).map(x=>({kind:text(x.kind),id:text(x.id),archivedAt:text(x.archivedAt)||new Date().toISOString()})).filter(x=>x.kind&&x.id)}
function normalizePerson(v,i=0){v=obj(v);return{id:text(v.id)||`person-${i}`,name:text(v.name)||'Person',relationship:text(v.relationship),notes:text(v.notes),likes:text(v.likes),plans:text(v.plans),giftIdeas:text(v.giftIdeas),importantDates:text(v.importantDates),privateNotes:text(v.privateNotes),createdAt:text(v.createdAt)||new Date().toISOString()}}
function normalizeHobby(v,i=0){v=obj(v);return{id:text(v.id)||`hobby-${i}`,name:text(v.name)||'Hobby',status:['playing','shelf','curious'].includes(v.status)?v.status:'playing',kind:text(v.kind)||'general',lastTouched:text(v.lastTouched),notes:text(v.notes),supplies:text(v.supplies),cost:money(v.cost),skill:text(v.skill),language:v.language===true,createdAt:text(v.createdAt)||new Date().toISOString()}}
function normalizeAdmin(v,i=0){v=obj(v);return{id:text(v.id)||`admin-${i}`,name:text(v.name)||'Important thing',kind:text(v.kind)||'document',physicalLocation:text(v.physicalLocation),digitalLocation:text(v.digitalLocation),issuer:text(v.issuer),expires:text(v.expires),notes:text(v.notes),createdAt:text(v.createdAt)||new Date().toISOString()}}
function normalizeWish(v,i=0){v=obj(v);return{id:text(v.id)||`wish-${i}`,name:text(v.name)||'Thing I Want',price:money(v.price),category:text(v.category)||'other',why:text(v.why),waitUntil:text(v.waitUntil),bought:v.bought===true,createdAt:text(v.createdAt)||new Date().toISOString()}}
function normalizeDump(v,i=0){v=obj(v);return{id:text(v.id)||`dump-${i}`,text:text(v.text),bucket:['inbox','idea','hobby','language','katos','closed'].includes(v.bucket)?v.bucket:'inbox',createdAt:text(v.createdAt)||new Date().toISOString()}}
function normalizeOpenPlan(v,i=0){v=obj(v);return{id:text(v.id)||`open-day-${i}`,date:text(v.date)||localDateKey(),items:list(v.items).map(x=>({id:text(x.id)||_makeId('plan-item'),label:text(x.label),kind:text(x.kind)||'flex',done:x.done===true})),createdAt:text(v.createdAt)||new Date().toISOString()}}
function normalizeBlock(v,i=0){v=obj(v);return{id:text(v.id)||`block-${i}`,name:text(v.name)||`Block ${i+1}`,start:text(v.start),end:text(v.end),energy:['low','okay','high','unknown'].includes(v.energy)?v.energy:'okay'}}

function normalizeDebt(v,i=0){v=obj(v);const type=['credit-card','car-loan','personal-loan','student-loan','mortgage','medical','bnpl','line-of-credit','other'].includes(v.type)?v.type:'other';return{...v,id:text(v.id)||`debt-${i}`,name:text(v.name)||'Debt',type,balance:money(v.balance),apr:Math.max(0,num(v.apr)),minimum:money(v.minimum||v.paymentAmount),paymentAmount:money(v.paymentAmount||v.minimum),dueDate:text(v.dueDate),dueDay:Math.max(0,Math.min(31,Math.round(num(v.dueDay)))),creditLimit:money(v.creditLimit),lender:text(v.lender),linkedBillId:text(v.linkedBillId),createdAt:text(v.createdAt)||new Date().toISOString()}}
function normalizeBill(v,i=0){v=obj(v);return{...v,id:text(v.id)||`bill-${i}`,name:text(v.name)||'Bill',amount:money(v.amount),dueDate:text(v.dueDate),dueDay:Math.max(0,Math.min(31,Math.round(num(v.dueDay)))),recurring:v.recurring!==false,paid:v.paid===true,linkedDebtId:text(v.linkedDebtId),createdAt:text(v.createdAt)||new Date().toISOString()}}
function normalizeMoney(v){v=obj(v);return{...v,earnings:list(v.earnings),accounts:list(v.accounts),bills:list(v.bills).map(normalizeBill),spending:list(v.spending),savingsGoals:list(v.savingsGoals),debts:list(v.debts).map(normalizeDebt)}}

function ensureMoneyLinks(state){const m=normalizeMoney(state.money),bills=[...m.bills],debts=m.debts.map(debt=>{
  let bill=debt.linkedBillId?bills.find(b=>b.id===debt.linkedBillId):bills.find(b=>b.linkedDebtId===debt.id);
  const amount=money(debt.paymentAmount||debt.minimum);
  if(!bill&&amount>0&&(debt.dueDate||debt.dueDay)){
    bill=normalizeBill({id:_makeId('bill'),name:`${debt.name} Payment`,amount,dueDate:debt.dueDate,dueDay:debt.dueDay,recurring:true,paid:false,linkedDebtId:debt.id,createdAt:new Date().toISOString()});
    bills.push(bill);
  }
  if(bill){bill.name=`${debt.name} Payment`;bill.amount=amount||bill.amount;bill.dueDate=debt.dueDate||bill.dueDate;bill.dueDay=debt.dueDay||bill.dueDay;bill.linkedDebtId=debt.id;debt.linkedBillId=bill.id}
  return debt;
});state.money={...m,bills,debts};return state}

function v4Defaults(){return{mode:'normal',energyBlocks:[normalizeBlock({name:'First wind',start:'08:00',end:'12:00',energy:'high'},0),normalizeBlock({name:'Second wind',start:'13:00',end:'17:00',energy:'okay'},1)],people:[],hobbies:[],admin:[],shopping:[],brainDump:[],openDayPlans:[],archive:[],ui:{lastView:'home',nomsTab:'fridge',moneyTab:'overview',memoryTab:'archive'}}}

function importV3(){const v3=parseStorage(V3_KEY)||{},now=new Date().toISOString();return normalizeState({...clone(v3),schemaVersion:4,meta:{...obj(v3.meta),build:V4_BUILD,createdAt:now,updatedAt:now,importedFromV3At:now},v4:v4Defaults()})}

export function normalizeState(value){const s=obj(value),life=obj(s.life),nourish=obj(s.nourish),insights=obj(s.insights),profile=obj(s.profile),prefs=obj(profile.preferences),legacyArchive=list(prefs.archiveRefs),v4={...v4Defaults(),...obj(s.v4)},meta=obj(s.meta);const next={...s,schemaVersion:4,profile:{...profile,preferences:{...prefs,archiveRefs:[]}},context:{brain:'steady',energy:'okay',capacity:'normal',pressure:'chill',socialBattery:'neutral',mode:'normal',currentActivity:'',note:'',...obj(s.context)},life:{inbox:list(life.inbox),tasks:list(life.tasks),reminders:list(life.reminders),routines:list(life.routines),routineInstances:list(life.routineInstances),events:list(life.events),threads:list(life.threads)},nourish:{...nourish,noms:{foods:[],recipes:[],history:[],groceries:[],mealPlan:[],...obj(nourish.noms)},sips:{waterGoalOz:64,fridge:[],history:[],...obj(nourish.sips)}},movement:{sessions:[],routines:[],videos:[],weighIns:[],...obj(s.movement)},education:{programs:[],courses:[],items:[],sessions:[],reviews:[],...obj(s.education)},work:{items:[],schedule:{},shifts:[],training:[],career:[],focus:{},...obj(s.work)},money:normalizeMoney(s.money),growth:{goals:[],wins:[],experiments:[],...obj(s.growth)},insights:{activityLog:[],observations:[],experiments:[],resetSessions:[],legacyNotes:[],dayReviews:[],...insights},mochini:{conversation:[],pendingProposal:null,lastProposal:null,lastContextInference:null,life:normalizeLife(s.mochini?.life),...obj(s.mochini),life:normalizeLife(s.mochini?.life)},v4:{...v4,energyBlocks:list(v4.energyBlocks).map(normalizeBlock),people:list(v4.people).map(normalizePerson),hobbies:list(v4.hobbies).map(normalizeHobby),admin:list(v4.admin).map(normalizeAdmin),shopping:list(v4.shopping).map(normalizeWish),brainDump:list(v4.brainDump).map(normalizeDump),openDayPlans:list(v4.openDayPlans).map(normalizeOpenPlan),archive:normalizeArchive([...list(v4.archive),...legacyArchive]),ui:{lastView:'home',nomsTab:'fridge',moneyTab:'overview',memoryTab:'archive',...obj(v4.ui)}},meta:{...meta,build:V4_BUILD,createdAt:text(meta.createdAt)||new Date().toISOString(),updatedAt:text(meta.updatedAt)||new Date().toISOString()}};return ensureMoneyLinks(next)}

export function loadState(){const existing=parseStorage(V4_KEY),state=existing?normalizeState(existing):importV3();if(!existing)saveState(state);return state}
export function saveState(value){const next=ensureMoneyLinks(normalizeState({...value,meta:{...obj(value.meta),build:V4_BUILD,updatedAt:new Date().toISOString()}}));localStorage.setItem(V4_KEY,JSON.stringify({data:next}));window.__katOSV4=next;return next}
export function resetV4FromV3(){const next=importV3();localStorage.setItem(V4_KEY,JSON.stringify({data:next}));return next}
export function makeId(prefix){return _makeId(prefix)}
export function isArchived(state,kind,id){const k=String(kind),target=String(id);if(k==='thread'&&list(state?.life?.threads).some(x=>String(x.id)===target&&x.status==='archived'))return true;if(k==='routine'&&list(state?.life?.routines).some(x=>String(x.id)===target&&x.archived===true))return true;return list(state?.v4?.archive).some(x=>x.kind===k&&x.id===target)}
export function archiveItem(state,kind,id){const next=clone(state),k=String(kind),target=String(id);if(k==='thread')next.life.threads=list(next.life.threads).map(x=>String(x.id)===target?{...x,status:'archived'}:x);if(k==='routine')next.life.routines=list(next.life.routines).map(x=>String(x.id)===target?{...x,archived:true}:x);if(!list(next.v4.archive).some(x=>x.kind===k&&x.id===target))next.v4.archive.push({kind:k,id:target,archivedAt:new Date().toISOString()});return next}
export function restoreItem(state,kind,id){const next=clone(state),k=String(kind),target=String(id);next.v4.archive=list(next.v4.archive).filter(x=>!(x.kind===k&&x.id===target));if(k==='thread')next.life.threads=list(next.life.threads).map(x=>String(x.id)===target?{...x,status:x.status==='archived'?'active':x.status}:x);if(k==='routine')next.life.routines=list(next.life.routines).map(x=>String(x.id)===target?{...x,archived:false}:x);return next}
export function deleteArchivedReference(state,kind,id){return restoreItem(state,kind,id)}
export function upsertDebt(state,input){const next=clone(state),m=normalizeMoney(next.money),id=text(input.id)||_makeId('debt'),prior=m.debts.find(x=>x.id===id),debt=normalizeDebt({...prior,...input,id,createdAt:prior?.createdAt||new Date().toISOString()});m.debts=prior?m.debts.map(x=>x.id===id?debt:x):[...m.debts,debt];next.money=m;return ensureMoneyLinks(next)}
export function removeDebt(state,id){const next=clone(state),m=normalizeMoney(next.money),debt=m.debts.find(x=>x.id===String(id));m.debts=m.debts.filter(x=>x.id!==String(id));if(debt?.linkedBillId)m.bills=m.bills.filter(x=>x.id!==debt.linkedBillId);else m.bills=m.bills.filter(x=>x.linkedDebtId!==String(id));next.money=m;return next}
export function syncDebtFromBill(state,billId,patch){const next=clone(state),m=normalizeMoney(next.money),bill=m.bills.find(x=>x.id===String(billId));if(!bill)return next;Object.assign(bill,patch);if(bill.linkedDebtId){const debt=m.debts.find(x=>x.id===bill.linkedDebtId);if(debt){if(patch.amount!==undefined){debt.paymentAmount=money(patch.amount);debt.minimum=money(patch.amount)}if(patch.dueDate!==undefined)debt.dueDate=text(patch.dueDate);if(patch.dueDay!==undefined)debt.dueDay=Math.round(num(patch.dueDay))}}next.money=m;return ensureMoneyLinks(next)}
export function activeRows(state,kind,rows){return list(rows).filter(x=>!isArchived(state,kind,x.id))}
