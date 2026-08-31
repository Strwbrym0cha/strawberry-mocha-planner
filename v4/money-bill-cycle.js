export const REPEAT_OPTIONS=['Monthly','Weekly','Every 2 weeks','Quarterly','Yearly'];

const text=v=>String(v??'').trim();
const clampDay=v=>Math.min(31,Math.max(1,Number(v)||1));
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export function normalizeRepeat(value){
 const raw=text(value).toLowerCase();
 if(!raw)return'Monthly';
 if(['weekly','week'].includes(raw))return'Weekly';
 if(['biweekly','bi-weekly','every 2 weeks','every two weeks','fortnightly'].includes(raw))return'Every 2 weeks';
 if(['quarterly','quarter'].includes(raw))return'Quarterly';
 if(['yearly','annual','annually','year'].includes(raw))return'Yearly';
 return'Monthly';
}

function parseDate(value){
 const match=text(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(!match)return null;
 const d=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12,0,0,0);
 return Number.isNaN(d.getTime())?null:d;
}

function daysInMonth(year,month){return new Date(year,month+1,0,12).getDate()}
function addMonthsClamped(base,months,day=base.getDate()){
 const first=new Date(base.getFullYear(),base.getMonth()+months,1,12,0,0,0);
 first.setDate(Math.min(clampDay(day),daysInMonth(first.getFullYear(),first.getMonth())));
 return first;
}
function addDays(base,days){const next=new Date(base);next.setDate(next.getDate()+days);return next}

export function currentBillDueDate(bill,now=new Date()){
 const explicit=parseDate(bill?.dueDate)||parseDate(bill?.due);
 if(explicit)return explicit;
 const dueDay=Number(bill?.dueDay)||0;
 if(dueDay>0){
  const base=new Date(now.getFullYear(),now.getMonth(),1,12,0,0,0);
  base.setDate(Math.min(clampDay(dueDay),daysInMonth(base.getFullYear(),base.getMonth())));
  return base;
 }
 return new Date(now.getFullYear(),now.getMonth(),now.getDate(),12,0,0,0);
}

export function nextBillDueDate(bill,now=new Date()){
 const repeat=normalizeRepeat(bill?.repeat);
 const base=currentBillDueDate(bill,now);
 const dueDay=Number(bill?.dueDay)>0?clampDay(bill.dueDay):base.getDate();
 if(repeat==='Weekly')return addDays(base,7);
 if(repeat==='Every 2 weeks')return addDays(base,14);
 if(repeat==='Quarterly')return addMonthsClamped(base,3,dueDay);
 if(repeat==='Yearly')return addMonthsClamped(base,12,dueDay);
 return addMonthsClamped(base,1,dueDay);
}

export function advanceRecurringBill(bill,now=new Date()){
 const original={...(bill||{})};
 const stamp=now.toISOString();
 if(original.recurring!==true){
  return{...original,paid:!original.paid,updatedAt:stamp};
 }
 // Older data can already be stuck in a paid state. Tapping it should simply reopen it,
 // not skip an extra billing cycle.
 if(original.paid===true)return{...original,paid:false,updatedAt:stamp};
 const current=currentBillDueDate(original,now);
 const next=nextBillDueDate(original,now);
 const nextKey=dateKey(next),currentKey=dateKey(current);
 const repeat=normalizeRepeat(original.repeat);
 const dueDay=Number(original.dueDay)>0?clampDay(original.dueDay):current.getDate();
 const updated={
  ...original,
  recurring:true,
  repeat,
  paid:false,
  dueDate:nextKey,
  dueDay,
  lastPaidAt:stamp,
  lastPaidDueDate:currentKey,
  updatedAt:stamp
 };
 if(Object.prototype.hasOwnProperty.call(original,'due'))updated.due=nextKey;
 return updated;
}

export function billDateKey(value){const d=parseDate(value);return d?dateKey(d):''}

export function billDueInMonth(bill,month){
 if(!bill||bill.paid===true)return false;
 const key=text(month).slice(0,7);
 if(!/^\d{4}-\d{2}$/.test(key))return false;
 const explicit=billDateKey(bill.dueDate)||billDateKey(bill.due);
 if(explicit)return explicit.slice(0,7)===key;
 return Number(bill.dueDay)>0;
}

export function unpaidBillsForMonth(bills,month){
 return(Array.isArray(bills)?bills:[]).filter(b=>billDueInMonth(b,month));
}

export function unpaidBillTotalForMonth(bills,month){
 return unpaidBillsForMonth(bills,month).reduce((sum,b)=>sum+(Number(b.amount)||0),0);
}
