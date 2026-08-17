import{localDateKey}from'../data.js?v=22.1.16-20260817';

const list=value=>Array.isArray(value)?value:[];
const timeToMinutes=value=>{const[hours,minutes]=String(value||'').split(':').map(Number);return Number.isFinite(hours)&&Number.isFinite(minutes)?hours*60+minutes:null};

export const eventsForDate=(state,date=localDateKey())=>list(state?.events).filter(event=>event?.date===date).slice().sort((a,b)=>String(a?.start||'').localeCompare(String(b?.start||'')));
export function minutesUntil(time,{now=new Date()}={}){const minutes=timeToMinutes(time);if(minutes===null)return Infinity;const then=new Date(now);then.setHours(Math.floor(minutes/60),minutes%60,0,0);return Math.max(0,Math.floor((then-now)/60000))}
export function nextTimedEvent(state,date=localDateKey(),{now=new Date()}={}){const today=localDateKey(now);const events=eventsForDate(state,date).filter(event=>event?.start);return events.find(event=>date!==today||minutesUntil(event.start,{now})>0)||null}
export const upcomingEvents=(state,{date=localDateKey(),now=new Date(),limit=10}={})=>list(state?.events).filter(event=>event?.date&&event.date>=date).filter(event=>event.date!==date||!event.start||minutesUntil(event.start,{now})>0).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.start||'').localeCompare(String(b.start||''))).slice(0,limit);
export function eventMinutes(event){const start=timeToMinutes(event?.start),end=timeToMinutes(event?.end);return start===null||end===null?0:Math.max(0,end-start)}
