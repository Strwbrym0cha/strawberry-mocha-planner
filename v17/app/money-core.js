const list=value=>Array.isArray(value)?value:[];
const pad=value=>String(value).padStart(2,'0');
const isFiniteNumber=value=>Number.isFinite(Number(value));
const parseDateKey=value=>{const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));if(!match)return null;const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12);return Number.isNaN(date.getTime())?null:date};
const key=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const clampDay=(year,monthIndex,day)=>Math.min(Math.max(1,Number(day)||1),new Date(year,monthIndex+1,0).getDate());
const daysBetween=(left,right)=>Math.round((left.getTime()-right.getTime())/86400000);

export const moneyOnHandAmount=money=>Number(money?.onHand?.amount??money?.cash?.amount??money?.cash??0)||0;
export const monthKey=(date=new Date())=>`${date.getFullYear()}-${pad(date.getMonth()+1)}`;
export const localDateKey=(date=new Date())=>key(new Date(date));
export const obligationKind=item=>item?.kind==='variable'?'variable':item?.kind==='subscription'?'subscription':'fixed';
export const itemCycles=item=>item?.cycles&&typeof item.cycles==='object'&&!Array.isArray(item.cycles)?item.cycles:{};

function dueAnchor(item){const raw=String(item?.due||item?.nextDue||'').trim(),dated=parseDateKey(raw);if(dated)return{date:dated,day:dated.getDate(),month:dated.getMonth()};const dayMatch=/\b([1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\b/i.exec(raw);return dayMatch?{date:null,day:Number(dayMatch[1]),month:null}:null}

export function occurrenceDatesForMonth(item,reference=new Date()){
 const anchor=dueAnchor(item);if(!anchor)return[];
 const year=reference.getFullYear(),month=reference.getMonth(),start=new Date(year,month,1,12),end=new Date(year,month+1,0,12),repeat=item?.repeat||'Monthly';
 if(repeat==='One-time')return anchor.date&&anchor.date>=start&&anchor.date<=end?[key(anchor.date)]:[];
 if(repeat==='Monthly'){const day=clampDay(year,month,anchor.day);return[key(new Date(year,month,day,12))]}
 if(repeat==='Quarterly'){if(!anchor.date)return[];const delta=(month-anchor.date.getMonth()+12)%12;if(delta%3!==0)return[];const day=clampDay(year,month,anchor.day);return[key(new Date(year,month,day,12))]}
 if(repeat==='Yearly'){if(!anchor.date||month!==anchor.date.getMonth())return[];const day=clampDay(year,month,anchor.day);return[key(new Date(year,month,day,12))]}
 if(repeat==='Weekly'||repeat==='Biweekly'){if(!anchor.date)return[];const every=repeat==='Weekly'?7:14,dates=[];let cursor=new Date(anchor.date);if(cursor<start){const delta=Math.floor((start-cursor)/86400000),jumps=Math.max(0,Math.floor(delta/every));cursor.setDate(cursor.getDate()+jumps*every);while(cursor<start)cursor.setDate(cursor.getDate()+every)}while(cursor<=end){if(cursor>=start)dates.push(key(cursor));cursor.setDate(cursor.getDate()+every)}return dates}
 return[];
}

export function nextOccurrenceDate(item,from=new Date(),monthsAhead=18){const start=new Date(from);start.setHours(12,0,0,0);for(let offset=0;offset<=monthsAhead;offset++){const probe=new Date(start.getFullYear(),start.getMonth()+offset,1,12),dates=occurrenceDatesForMonth(item,probe).map(parseDateKey).filter(Boolean).filter(date=>date>=start).sort((a,b)=>a-b);if(dates.length)return key(dates[0])}return null}

export function occurrenceState(item,dateKey){const cycle=itemCycles(item)[dateKey]||{},kind=obligationKind(item),baseAmount=Number(item?.typicalAmount??item?.amount??0)||0,hasCycleAmount=isFiniteNumber(cycle.amount),amount=hasCycleAmount?Number(cycle.amount):baseAmount,paid=cycle.paid===true||cycle.status==='paid'||((item?.repeat||'Monthly')==='One-time'&&item?.paid===true);return{date:dateKey,amount,paid,kind,hasActualAmount:kind!=='variable'||hasCycleAmount,estimated:kind==='variable'&&!hasCycleAmount,cycle}}

export function obligationsForMonth(money,reference=new Date()){
 const sources=[...list(money?.bills).map(item=>({item,source:'bill'})),...list(money?.subscriptions).map(item=>({item:{...item,kind:'subscription'},source:'subscription'}))];
 return sources.flatMap(({item,source})=>occurrenceDatesForMonth(item,reference).map(date=>({item,source,...occurrenceState(item,date)}))).sort((a,b)=>a.date.localeCompare(b.date)||String(a.item?.name||'').localeCompare(String(b.item?.name||'')));
}

export function obligationsForDate(money,dateKey){const date=parseDateKey(dateKey);if(!date)return[];return obligationsForMonth(money,date).filter(entry=>entry.date===dateKey)}

export function moneySummaryForMonth(money,reference=new Date()){
 const onHand=moneyOnHandAmount(money),occurrences=obligationsForMonth(money,reference),unpaid=occurrences.filter(entry=>!entry.paid),unpaidTotal=unpaid.reduce((sum,entry)=>sum+entry.amount,0),billUnpaid=unpaid.filter(entry=>entry.source==='bill').reduce((sum,entry)=>sum+entry.amount,0),subscriptionUnpaid=unpaid.filter(entry=>entry.source==='subscription').reduce((sum,entry)=>sum+entry.amount,0),estimatedCount=unpaid.filter(entry=>entry.estimated).length;return{onHand,occurrences,unpaid,unpaidTotal,billUnpaid,subscriptionUnpaid,freeAfterBills:onHand-unpaidTotal,estimatedCount,paidCount:occurrences.length-unpaid.length,totalCount:occurrences.length};
}

export function attentionForMonth(money,reference=new Date(),{dueSoonDays=7}={}){const today=new Date(reference);today.setHours(12,0,0,0);return moneySummaryForMonth(money,reference).unpaid.flatMap(entry=>{const due=parseDateKey(entry.date),delta=due?daysBetween(due,today):999,items=[];if(entry.kind==='variable'&&!entry.hasActualAmount)items.push({...entry,attention:'amount_needed',message:`${entry.item?.name||'Variable bill'} needs this cycle's amount.`});if(delta<0)items.push({...entry,attention:'overdue',message:`${entry.item?.name||'Bill'} was due ${Math.abs(delta)} day${Math.abs(delta)===1?'':'s'} ago.`});else if(delta<=dueSoonDays)items.push({...entry,attention:entry.source==='subscription'?'renewal_soon':'due_soon',message:`${entry.item?.name||'Bill'} ${entry.source==='subscription'?'renews':'is due'} ${delta===0?'today':delta===1?'tomorrow':`in ${delta} days`}.`});return items}).sort((a,b)=>a.date.localeCompare(b.date))}

export function updateCycle(item,dateKey,patch={}){return{...item,cycles:{...itemCycles(item),[dateKey]:{...(itemCycles(item)[dateKey]||{}),...patch}}}}
