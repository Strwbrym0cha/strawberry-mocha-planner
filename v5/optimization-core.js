const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const dayDate=value=>new Date(`${value}T12:00:00`);
export const cents=value=>Math.round(number(value)*100)/100;
export const dateKey=date=>{const d=date instanceof Date?date:new Date(date),pad=v=>String(v).padStart(2,'0');return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
export const addDays=(value,amount)=>{const d=dayDate(value);d.setDate(d.getDate()+amount);return dateKey(d)};
export const clockMinutes=(start,end)=>{if(!/^\d{1,2}:\d{2}$/.test(text(start))||!/^\d{1,2}:\d{2}$/.test(text(end)))return 0;const[sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);let value=(eh*60+em)-(sh*60+sm);if(value<0)value+=1440;return value};

function occurs(medication,date){
 const repeat=text(medication?.repeat).toLowerCase()||'daily',day=dayDate(date).getDay();
 if(repeat==='as-needed')return true;
 if(repeat==='weekdays')return day>0&&day<6;
 if(repeat==='weekends')return day===0||day===6;
 return true;
}

export function buildMedicationWeek(medications=[],logs=[],today=dateKey(new Date())){
 const days=Array.from({length:7},(_,index)=>addDays(today,index-6));
 const rows=list(medications).filter(row=>row?.active!==false&&row?.archived!==true).map(medication=>{
  let scheduled=0,taken=0;
  const cells=days.map(date=>{
   const scheduledToday=occurs(medication,date),matches=list(logs).filter(log=>String(log?.medicationId)===String(medication.id)&&log?.date===date),log=matches.sort((a,b)=>text(b.updatedAt||b.createdAt).localeCompare(text(a.updatedAt||a.createdAt)))[0];
   if(scheduledToday&&text(medication.repeat).toLowerCase()!=='as-needed')scheduled++;
   if(log?.status==='taken')taken++;
   return{date,scheduled:scheduledToday,status:log?.status||'unlogged'};
  });
  return{id:String(medication.id),name:text(medication.name)||'Medication',dose:text(medication.dose),time:text(medication.time),repeat:text(medication.repeat)||'daily',taken,scheduled,cells};
 });
 return{today,days,rows};
}

function orderTotal(order={}){return cents(number(order.total)||number(order.basePay)+number(order.tip)+number(order.bonus)+number(order.promo)+number(order.reimbursement)+number(order.otherPay))}
export function buildShiftScorecards(shifts=[],orders=[],transactions=[]){
 const summaries=list(orders),ledger=list(transactions),byId=new Map(summaries.map(row=>[String(row.id),row]));
 return list(shifts).filter(row=>!row?.archivedAt&&(row?.status==='completed'||row?.summaryOrderId||row?.actualEndAt)).map(shift=>{
  const order=byId.get(String(shift.summaryOrderId))||summaries.find(row=>String(row?.plannedShiftId)===String(shift.id))||{},plannedMinutes=number(shift.scheduledMinutes)||clockMinutes(shift.startTime,shift.endTime),actualMinutes=number(shift.actualMinutes)||number(order.onlineMinutes)||number(order.activeMinutes),expected=cents(shift.targetAmount),actual=cents(number(shift.actualAmount)||orderTotal(order)),mileage=cents(number(shift.mileage)||number(order.mileage)||Math.max(0,number(order.endOdometer)-number(order.startOdometer))),units=Math.max(0,number(shift.packageCount)||number(shift.deliveryCount)||number(order.packageCount)||number(order.deliveryCount)),stops=Math.max(0,number(shift.stopCount)||number(order.stopCount)||(!/amazon\s*flex|\bflex\b/i.test(shift.source||shift.platform||shift.label||'')?units:0)),expenses=cents(ledger.filter(row=>!row.archivedAt&&row.gigExpense&&(String(row.gigShiftId||row.plannedShiftId)===String(shift.id)||String(row.externalId||'').startsWith(`flex:${shift.id}:`))).reduce((sum,row)=>sum+number(row.amount),0)),net=cents(actual-expenses),flex=/amazon\s*flex|\bflex\b/i.test(shift.source||shift.platform||shift.label||'');
  return{id:String(shift.id),date:text(shift.date),kind:flex?'Amazon Flex':'DoorDash',icon:flex?'📦':'🚗',expected,actual,expenses,net,plannedMinutes,actualMinutes,mileage,units,stops,unitLabel:flex?'packages':'deliveries',perHour:actualMinutes?cents(net/(actualMinutes/60)):null,perMile:mileage?cents(net/mileage):null,packagesPerHour:flex&&actualMinutes?cents(units/(actualMinutes/60)):null,stopsPerHour:flex&&actualMinutes?cents(stops/(actualMinutes/60)):null,payDelta:cents(actual-expected),timeDelta:actualMinutes&&plannedMinutes?actualMinutes-plannedMinutes:null,summaryComplete:Boolean(shift.summaryOrderId||order.id)};
 }).sort((a,b)=>`${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`));
}

export function calculateSafeToSpend(view={},cutoff){
 const today=text(view.today)||dateKey(new Date()),through=text(cutoff)||addDays(today,14),cash=cents(view?.money?.posted),bills=list(view.bills).filter(row=>!['paid','skipped','canceled'].includes(text(row.status).toLowerCase())&&text(row.dueDate)>=today&&text(row.dueDate)<=through),billTotal=cents(bills.reduce((sum,row)=>sum+number(row.actualAmount??row.expectedAmount??row.amount),0)),safe=cents(cash-billTotal);
 return{today,through,cash,bills,billTotal,safe,shortfall:cents(Math.max(0,-safe))};
}

export function routineFrictionSummary(routines=[],logs=[],today=dateKey(new Date())){
 const cutoff=addDays(today,-27),names=new Map(list(routines).map(row=>[String(row.id),text(row.title||row.name)||'Routine'])),recent=list(logs).filter(row=>text(row.date)>=cutoff&&text(row.date)<=today),groups=new Map;
 recent.forEach(log=>{const id=String(log.routineId),group=groups.get(id)||{id,name:names.get(id)||text(log.routineName)||'Routine',count:0,reasons:{}};group.count++;group.reasons[log.reason]=(group.reasons[log.reason]||0)+1;groups.set(id,group)});
 return[...groups.values()].map(group=>{const top=Object.entries(group.reasons).sort((a,b)=>b[1]-a[1])[0]||['not-today',0];return{...group,topReason:top[0],topCount:top[1]}}).sort((a,b)=>b.count-a.count);
}

export function countPlannerRecords(value){
 let total=0;const seen=new WeakSet;
 function walk(node){if(!node||typeof node!=='object'||seen.has(node))return;seen.add(node);if(Array.isArray(node)){total+=node.length;node.forEach(walk);return}Object.values(node).forEach(walk)}
 walk(value);return total;
}
