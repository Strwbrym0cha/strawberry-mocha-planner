import { snapshotV4 } from './data.js?v=5.6.0-final-integration';

const app=document.getElementById('app');
const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const pad=value=>String(value).padStart(2,'0');
const dateKey=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;

function platformName(row){
  const raw=text(row?.platform||row?.platformName||row?.app||row?.source||row?.service||row?.employer||row?.provider);
  if(/door\s*dash/i.test(raw))return'DoorDash';
  if(/shipt/i.test(raw))return'Shipt';
  if(/instacart/i.test(raw))return'Instacart';
  if(/uber\s*eats/i.test(raw))return'Uber Eats';
  if(/uber/i.test(raw))return'Uber';
  return raw?raw.replace(/\b\w/g,char=>char.toUpperCase()):'Gig';
}
function shiftTitle(row){return`${platformName(row)} shift`}
function shiftDate(row){return text(row?.date||row?.startDate||row?.scheduledDate)}
function shiftTime(row){return text(row?.startTime||row?.time||row?.start)}
function formatTime(value){
  if(!/^\d{1,2}:\d{2}$/.test(value))return value;
  const [h,m]=value.split(':').map(Number),date=new Date();date.setHours(h,m,0,0);
  return date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
}
function gigShifts(){return list(snapshotV4()?.state?.work?.gigShifts)}

function labelWeekly(shifts){
  document.querySelectorAll('.schedule-day').forEach(day=>{
    const weekday=text(day.querySelector('.schedule-day-head b')?.textContent),monthDay=text(day.querySelector('.schedule-day-head span')?.textContent);
    if(!weekday||!monthDay)return;
    const candidates=shifts.filter(row=>{
      const value=shiftDate(row);if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
      const d=new Date(`${value}T12:00:00`);
      return d.toLocaleDateString([],{weekday:'short'})===weekday&&d.toLocaleDateString([],{month:'short',day:'numeric'})===monthDay;
    });
    if(!candidates.length)return;
    const used=new Set;
    day.querySelectorAll('.schedule-item').forEach(item=>{
      const title=item.querySelector('b');if(!title||text(title.textContent)!=='Untitled')return;
      const shownTime=text(item.querySelector('small')?.textContent);
      let index=candidates.findIndex((row,i)=>!used.has(i)&&(!shownTime||formatTime(shiftTime(row))===shownTime));
      if(index<0)index=candidates.findIndex((_,i)=>!used.has(i));
      if(index<0)return;used.add(index);title.textContent=shiftTitle(candidates[index]);
    });
  });
}

function labelCalendar(shifts){
  const today=text(snapshotV4()?.today),year=Number(today.slice(0,4)),month=Number(today.slice(5,7));
  if(!year||!month)return;
  document.querySelectorAll('.schedule-cell:not(.blank)').forEach(cell=>{
    const day=Number(cell.querySelector(':scope > b')?.textContent);if(!day)return;
    const key=`${year}-${pad(month)}-${pad(day)}`,candidates=shifts.filter(row=>shiftDate(row)===key);
    if(!candidates.length)return;
    let index=0;
    cell.querySelectorAll('small').forEach(label=>{if(text(label.textContent)==='Untitled'&&candidates[index])label.textContent=shiftTitle(candidates[index++])});
  });
}

function labelDayRows(shifts){
  document.querySelectorAll('.room-row').forEach(row=>{
    const title=row.querySelector('.room-row-main b');if(!title||text(title.textContent)!=='Untitled')return;
    const meta=text(row.querySelector('.room-row-main span')?.textContent);
    const match=shifts.find(shift=>{
      const d=shiftDate(shift),t=formatTime(shiftTime(shift));
      return d&&meta.includes(new Date(`${d}T12:00:00`).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'}))&&(!t||meta.includes(t));
    });
    if(match)title.textContent=shiftTitle(match);
  });
}

function refresh(){
  if(!app||!document.querySelector('.top-title')?.textContent?.includes('Schedule'))return;
  const shifts=gigShifts();if(!shifts.length)return;
  labelWeekly(shifts);labelCalendar(shifts);labelDayRows(shifts);
}

let queued=false;
const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})};
new MutationObserver(queue).observe(app,{childList:true,subtree:true});
queue();
