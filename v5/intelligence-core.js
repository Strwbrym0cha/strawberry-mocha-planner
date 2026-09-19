const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const number=value=>Number.isFinite(Number(value))?Number(value):0;
export const cents=value=>Math.round(number(value)*100)/100;
export const dateKey=value=>{const d=value instanceof Date?value:new Date(`${value}T12:00:00`),pad=n=>String(n).padStart(2,'0');return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
export const addDays=(value,days)=>{const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+days);return dateKey(d)};
export const clockMinutes=(start,end)=>{if(!/^\d{1,2}:\d{2}$/.test(text(start))||!/^\d{1,2}:\d{2}$/.test(text(end)))return 0;const[sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);let minutes=eh*60+em-(sh*60+sm);if(minutes<0)minutes+=1440;return minutes};

export function calculateRouteMetrics(input={}){
 const gross=cents(input.gross),expenses=cents(input.expenses),net=cents(gross-expenses),minutes=Math.max(0,number(input.actualMinutes)),miles=Math.max(0,cents(input.mileage)),packages=Math.max(0,Math.round(number(input.packages))),stops=Math.max(0,Math.round(number(input.stops))),hours=minutes/60;
 return{gross,expenses,net,minutes,miles,packages,stops,profitPerHour:hours?cents(net/hours):null,profitPerMile:miles?cents(net/miles):null,packagesPerHour:hours?cents(packages/hours):null,stopsPerHour:hours?cents(stops/hours):null};
}

export function buildAdaptivePlan({remaining=0,from=dateKey(new Date),to=from,scheduledByDate={},overrides={}}={}){
 const days=[];for(let day=from;day&&day<=to;day=addDays(day,1))days.push(day);
 const scheduled=Object.fromEntries(days.map(day=>[day,Math.max(0,cents(scheduledByDate[day]))])),chosen=Object.fromEntries(days.filter(day=>overrides[day]!==undefined&&overrides[day]!==null&&overrides[day]!=='').map(day=>[day,Math.max(0,cents(overrides[day]))]));
 const committed=cents(Object.values(scheduled).reduce((sum,value)=>sum+value,0)+Object.values(chosen).reduce((sum,value)=>sum+value,0)),open=days.filter(day=>chosen[day]===undefined&&scheduled[day]===0),left=Math.max(0,cents(remaining-committed));
 let allocated=0;const rows=days.map((day,index)=>{const isLastOpen=day===open[open.length-1],suggested=chosen[day]??(scheduled[day]>0?0:(isLastOpen?cents(left-allocated):cents(left/Math.max(1,open.length))));if(chosen[day]===undefined&&scheduled[day]===0)allocated=cents(allocated+suggested);return{date:day,scheduled:scheduled[day],suggested,total:cents(scheduled[day]+suggested),editable:scheduled[day]===0}});
 return{remaining:cents(remaining),committed,unallocated:cents(Math.max(0,remaining-rows.reduce((sum,row)=>sum+row.total,0))),rows};
}

export function durationInsight(estimatedMinutes,samples=[]){
 const values=list(samples).map(sample=>number(sample?.actualMinutes??sample)).filter(value=>value>0),average=values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length):0;
 return{estimated:Math.max(0,Math.round(number(estimatedMinutes))),average,samples:values.length,ready:values.length>=3};
}

export function classifyBrainDumpLine(value){
 const line=text(value),lower=line.toLowerCase();
 if(/\b(flex|doordash|dash|delivery shift)\b/.test(lower))return'gig';
 if(/\b(study|quiz|exam|assignment|class|course|definitions?|touchstone|milestone|unit)\b/.test(lower))return'study';
 if(/\b(call|text|email|remind|follow up|follow-up)\b/.test(lower))return'ping';
 if(/\b(mon|tue|wed|thu|fri|sat|sun)(day)?\b|\b\d{1,2}(:\d{2})?\s?(am|pm)\b|\bappointment\b/.test(lower))return'schedule';
 if(/\b(buy|pick up|grocery|groceries|litter|shopping)\b/.test(lower))return'note';
 return'task';
}

export function decomposeTask(value){
 const task=text(value),lower=task.toLowerCase();
 if(!task)return[];
 if(/study|exam|quiz|definitions/.test(lower))return['Open the class or study material','Choose one small section','Work for 10 minutes'];
 if(/clean|laundry|bathroom|room|sheets/.test(lower))return['Gather the supplies','Clear one small surface or load','Do a 10-minute reset'];
 if(/call|dentist|doctor|appointment/.test(lower))return['Find the phone number or booking page','Write the one sentence you need to say','Make the call or request'];
 if(/money|bill|budget|pay/.test(lower))return['Open the account or bill','Check the exact amount and due date','Make or schedule the next safe action'];
 if(/email|message|reply/.test(lower))return['Open the message','Write the first sentence','Send a short useful reply'];
 return[`Open what you need for “${task}”`,'Do the smallest visible piece','Decide the next step after that'];
}

export function nextMaintenanceDate(lastCompleted,frequencyDays){return addDays(lastCompleted,Math.max(1,Math.round(number(frequencyDays)||1)))}

export function unusuallyRelevant(items=[],limit=5){
 return list(items).filter(item=>item&&item.label).sort((a,b)=>(number(b.urgency)-number(a.urgency))||text(a.time).localeCompare(text(b.time))).filter((item,index,all)=>all.findIndex(other=>text(other.key||other.label)===text(item.key||item.label))===index).slice(0,limit);
}
