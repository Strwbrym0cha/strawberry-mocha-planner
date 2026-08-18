import{localDateKey}from'../data.js?v=22.1.21-20260817';
import{openTasksForDate,taskTitle}from'./tasks.js?v=22.1.21-20260817';
import{eventsForDate}from'./events.js?v=22.1.21-20260817';
import{upcomingDeadlines}from'./deadlines.js?v=22.1.21-20260817';

const labels=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const key=date=>localDateKey(date);
const atNoon=value=>new Date(`${value}T12:00:00`);
const same=value=>String(value||'').trim();
export const weekdayNames=Object.fromEntries(labels.map((label,index)=>[label.toLowerCase(),index]));

export function dayReference(input=''){
 const text=String(input).toLowerCase();
 if(/\bthis weekend\b/.test(text)||/\bweekend\b/.test(text))return{kind:'weekend',label:'this weekend'};
 if(/\bthis week\b/.test(text))return{kind:'week',label:'this week'};
 if(/\btomorrow\b/.test(text))return{kind:'tomorrow',label:'tomorrow'};
 if(/\btoday\b/.test(text))return{kind:'today',label:'today'};
 for(const [name,day] of Object.entries(weekdayNames))if(new RegExp(`\\b${name}\\b`).test(text))return{kind:'weekday',day,label:labels[day]};
 return null;
}

export function resolveDayReference(reference,{date=localDateKey()}={}){
 if(!reference)return[];const start=atNoon(date);
 if(reference.kind==='today')return[key(start)];
 if(reference.kind==='tomorrow'){start.setDate(start.getDate()+1);return[key(start)]}
 if(reference.kind==='weekday'){const offset=(reference.day-start.getDay()+7)%7;start.setDate(start.getDate()+offset);return[key(start)]}
 if(reference.kind==='weekend'){const offset=(6-start.getDay()+7)%7;start.setDate(start.getDate()+offset);const sunday=new Date(start);sunday.setDate(sunday.getDate()+1);return[key(start),key(sunday)]}
 if(reference.kind==='week'){const offset=(7-start.getDay())%7;const days=[];for(let index=0;index<7;index+=1){const day=new Date(start);day.setDate(start.getDate()+index);days.push(key(day))}return days}
 return[];
}

export function plannerContextForDates(state,dates=[]){
 const due=upcomingDeadlines(state,{date:dates[0]||localDateKey(),limit:100});
 return dates.map(date=>({date,label:atNoon(date).toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'}),tasks:openTasksForDate(state,date),events:eventsForDate(state,date),deadlines:due.filter(item=>item.date===date)}));
}

const time=value=>value?new Date(`2000-01-01T${value}`).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'any time';
const eventLine=event=>`${event.title||'Scheduled event'}${event.start?` at ${time(event.start)}`:''}`;
export function composePlannerContext(days,reference={label:'that day'}){
 const active=days.filter(day=>day.tasks.length||day.events.length||day.deadlines.length);
 if(!active.length)return{answer:`Nothing is currently scheduled for ${reference.label||'that time'}. 🍡`,evidence:[],empty:true};
 const formatDay=day=>{const parts=[];if(day.tasks.length)parts.push(`${day.tasks.length} task${day.tasks.length===1?'':'s'}: ${day.tasks.slice(0,3).map(taskTitle).join(', ')}${day.tasks.length>3?'…':''}`);if(day.events.length)parts.push(`${day.events.length} fixed event${day.events.length===1?'':'s'}: ${day.events.slice(0,2).map(eventLine).join(', ')}`);if(day.deadlines.length)parts.push(`deadline${day.deadlines.length===1?'':'s'}: ${day.deadlines.slice(0,2).map(item=>item.title).join(', ')}`);return `${day.label} — ${parts.join(' • ')}`};
 return{answer:active.map(formatDay).join('\n'),evidence:active,empty:false};
}
