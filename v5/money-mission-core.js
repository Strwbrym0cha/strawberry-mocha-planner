const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const number=value=>Number.isFinite(Number(value))?Number(value):0;
export const cents=value=>Math.round(number(value)*100)/100;
const dayNumber=value=>{const time=new Date(`${value}T12:00:00`).getTime();return Number.isNaN(time)?0:Math.floor(time/86400000)};
const isSpentType=value=>['expense','fee','other'].includes(text(value).toLowerCase());
const isPosted=value=>!value||['posted','cleared'].includes(text(value).toLowerCase());

export function isAutomaticGigExpense(row={}){
 if(!isSpentType(row.type||row.kind)||!isPosted(row.status))return false;
 if(row.gigExpense===true||text(row.gigExpense).toLowerCase()==='true')return true;
 const category=text(row.category).toLowerCase().replace(/[\s_-]+/g,' ');
 return ['gas','fuel','toll','tolls','parking','gig expense','gig cost','shift food'].includes(category);
}

export function gigExpensesInRange(transactions=[],from='',to=''){
 const rows=list(transactions).filter(row=>isAutomaticGigExpense(row)&&(!from||text(row.date)>=from)&&(!to||text(row.date)<=to));
 const byCategory={};
 rows.forEach(row=>{const key=text(row.category)||'Gig expense';byCategory[key]=cents((byCategory[key]||0)+number(row.amount))});
 return{rows,total:cents(rows.reduce((sum,row)=>sum+number(row.amount),0)),byCategory};
}

export function buildMoneyMission({runway,transactions=[],completedShifts=[],today='' }={}){
 if(!runway)return null;
 const expenses=gigExpensesInRange(transactions,runway.from,runway.to),grossEarned=cents(runway.earned),netEarned=cents(Math.max(0,grossEarned-expenses.total)),target=cents(runway.target),planned=cents(runway.planned),remaining=cents(Math.max(0,target-netEarned)),unplanned=cents(Math.max(0,target-netEarned-planned)),covered=cents(Math.min(target,netEarned+planned));
 const recent=list(completedShifts).filter(row=>text(row.date)>=runway.from&&text(row.date)<=runway.to),grossForRate=cents(recent.reduce((sum,row)=>sum+number(row.actual??row.actualAmount),0)),hours=recent.reduce((sum,row)=>sum+number(row.actualMinutes||row.durationMinutes)/60,0),netForRate=Math.max(0,grossForRate-expenses.total),netHourly=hours?cents(netForRate/hours):0,estimatedHours=netHourly?Math.ceil(unplanned/netHourly*10)/10:null;
 const daysLeft=Math.max(0,dayNumber(runway.to)-dayNumber(today||runway.from)+1),dailyNeeded=daysLeft?cents(unplanned/daysLeft):unplanned;
 let status='needs-plan',statusLabel='More shifts need planning';
 if(remaining<=0){status='complete';statusLabel='Mission complete';}
 else if(planned>=remaining){status='covered';statusLabel='Scheduled shifts cover the rest';}
 else if(today&&today>runway.to){status='expired';statusLabel='Deadline passed · adjust the mission';}
 return{...runway,grossEarned,expenses,netEarned,target,planned,remaining,unplanned,covered,netHourly,estimatedHours,dailyNeeded,status,statusLabel,coveredPercent:target?Math.min(100,covered/target*100):0,earnedPercent:target?Math.min(100,netEarned/target*100):0,plannedPercent:target?Math.max(0,Math.min(100-netEarned/target*100,planned/target*100)):0};
}

export function weekRange(today){
 const date=new Date(`${today}T12:00:00`),currentStart=new Date(date);currentStart.setDate(date.getDate()-date.getDay());
 const end=new Date(currentStart);end.setDate(end.getDate()-1);const start=new Date(end);start.setDate(start.getDate()-6);
 const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 return{from:key(start),to:key(end),isSunday:date.getDay()===0};
}

export function countCompletions(rows=[],from='',to=''){
 return list(rows).reduce((count,row)=>{
  const dates=[row.completedAt,row.completedDate,row.doneAt,...list(row.completionDates),...list(row.doneDates)].map(value=>text(value).slice(0,10)).filter(Boolean);
  const inRange=dates.some(date=>date>=from&&date<=to),datedDone=['done','complete','completed','taken'].includes(text(row.status).toLowerCase())&&text(row.date)>=from&&text(row.date)<=to;
  return count+(inRange||datedDone?1:0);
 },0);
}

export function buildWeeklyMirror({today,transactions=[],orders=[],shifts=[],tasks=[],routines=[],medicationLogs=[],studySessions=[]}={}){
 const range=weekRange(today),inRange=row=>text(row?.date)>=range.from&&text(row?.date)<=range.to,weekOrders=list(orders).filter(inRange),gross=cents(weekOrders.reduce((sum,row)=>sum+number(row.total||row.actualAmount||row.amount||number(row.basePay)+number(row.tip)+number(row.bonus)),0)),expenses=gigExpensesInRange(transactions,range.from,range.to),weekShifts=list(shifts).filter(inRange),plannedHours=cents(weekShifts.reduce((sum,row)=>sum+number(row.scheduledMinutes||row.plannedMinutes)/60,0)),actualHours=cents(weekShifts.reduce((sum,row)=>sum+number(row.actualMinutes||row.durationMinutes)/60,0)),studyMinutes=list(studySessions).filter(inRange).reduce((sum,row)=>sum+number(row.minutes||row.durationMinutes),0);
 return{range,gross,gigCosts:expenses.total,net:cents(gross-expenses.total),plannedHours,actualHours,tasksDone:countCompletions(tasks,range.from,range.to),routineSteps:countCompletions(routines,range.from,range.to),medsTaken:countCompletions(medicationLogs,range.from,range.to),studyMinutes};
}
