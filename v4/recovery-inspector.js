const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const collection=v=>Array.isArray(v)?v.filter(Boolean):(v&&typeof v==='object'?Object.entries(v).map(([key,row])=>row&&typeof row==='object'?{...row,id:row.id||key,name:row.name||key}:{id:key,name:key,amount:num(row)}):[]);

function dateOnly(value){
  const s=text(value);
  const match=s.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0]||'';
}
function newest(values=[]){return values.map(dateOnly).filter(Boolean).sort().at(-1)||''}
function gigSource(row={}){
  const source=text(row.incomeSource||row.gigSource||row.source||row.label||row.platform).toLowerCase().replace(/\s+/g,'-');
  if(source.includes('door'))return'doordash';
  if(source.includes('shipt'))return'shipt';
  if(source==='other'||source==='othergig'||source==='other-gig')return'other-gig';
  return'';
}
function gigAmount(row={}){
  if(row.earnings!==undefined||row.tips!==undefined)return num(row.earnings)+num(row.tips);
  return num(row.receivedAmount??row.amount??row.actualGross??row.estimatedGross??row.grossEarned);
}
function gigDate(row={}){return dateOnly(row.receivedDate||row.date||row.expectedDate||row.createdAt)}
function repeatingWorkCount(schedule={}){return Object.values(obj(obj(schedule).weekly)).reduce((sum,rows)=>sum+collection(rows).length,0)}
function rootAndNestedRows(state,key){
  const s=obj(state),money=obj(s.money),work=obj(s.work),insights=obj(s.insights);
  if(key==='earnings')return [...collection(money.earnings),...collection(s.earnings),...collection(s.gigEarnings),...collection(money.gigs),...collection(s.gigWork)];
  if(key==='shifts')return [...collection(work.shifts),...collection(s.shifts)];
  if(key==='reviews')return [...collection(insights.dayReviews),...collection(s.dayReviews)];
  return[];
}

export function inspectRecoveryState(state={}){
  const s=obj(state),m=obj(s.money);
  const gigs=rootAndNestedRows(s,'earnings').filter(row=>row?.kind==='gig'||gigSource(row));
  const shifts=rootAndNestedRows(s,'shifts');
  const reviews=rootAndNestedRows(s,'reviews');
  const dayNotes=obj(s.dayNotes);
  const dayNoteEntries=Object.entries(dayNotes);
  const bills=collection(m.bills),subscriptions=collection(m.subscriptions);
  const gigDates=gigs.map(gigDate).filter(Boolean);
  const reviewDates=reviews.flatMap(row=>[row?.date,row?.day,row?.savedAt,row?.updatedAt,row?.createdAt,row?.workSnapshot?.capturedAt]);
  const noteDates=dayNoteEntries.flatMap(([date,row])=>[date,row?.savedAt,row?.updatedAt,row?.createdAt]);
  const shiftDates=shifts.flatMap(row=>[row?.date,row?.createdAt,row?.updatedAt]);
  const snapshotSaved=newest([s?.__smUpdatedAt,s?.meta?.updatedAt,s?.meta?.createdAt]);
  const latestActivity=newest([...gigDates,...reviewDates,...noteDates,...shiftDates,snapshotSaved]);
  const latestGig=newest(gigDates);
  const gigTotal=Math.round(gigs.reduce((sum,row)=>sum+gigAmount(row),0)*100)/100;
  const scheduledWork=repeatingWorkCount(s.workSchedule);
  return{
    gigCount:gigs.length,
    gigTotal,
    latestGig,
    billCount:bills.length,
    subscriptionCount:subscriptions.length,
    shiftCount:shifts.length+scheduledWork,
    dailyNoteCount:reviews.length+dayNoteEntries.length,
    snapshotSaved,
    latestActivity,
    reachesAug28:snapshotSaved>='2026-08-28'||latestGig>='2026-08-28'
  };
}

function money(value){return`$${num(value).toFixed(2)}`}
let annotateQueued=false;
function annotate(){
  const overlay=document.querySelector('.katos-recovery-overlay');
  const candidates=list(overlay?.__katosRecoveryCandidates);
  if(!overlay||!candidates.length)return;
  const rows=[...overlay.querySelectorAll('.katos-recovery-row')];
  rows.forEach((row,index)=>{
    if(row.dataset.recoveryInspected==='1')return;
    const candidate=candidates[index];if(!candidate)return;
    row.dataset.recoveryInspected='1';
    const d=inspectRecoveryState(candidate.state);
    const meta=row.querySelector('.katos-recovery-meta');if(!meta)return;
    let detail=row.querySelector('.katos-recovery-inspector');
    if(!detail){detail=document.createElement('div');detail.className='katos-recovery-inspector';detail.style.cssText='margin-top:7px;padding:7px 8px;border-radius:11px;background:#fff3f8;color:#76515f;font-size:10px;line-height:1.55';meta.after(detail)}
    const html=`${d.reachesAug28?'<b>🔥 AUG 28+ COPY FOUND</b><br>':''}<b>Gig receipts:</b> ${d.gigCount} · ${money(d.gigTotal)}${d.latestGig?` · latest ${d.latestGig}`:''}<br><b>Bills:</b> ${d.billCount} · <b>Subscriptions:</b> ${d.subscriptionCount}<br><b>Work shifts/schedules:</b> ${d.shiftCount} · <b>Daily notes/reviews:</b> ${d.dailyNoteCount}${d.snapshotSaved?`<br><b>Snapshot saved:</b> ${d.snapshotSaved}`:''}${d.latestActivity&&d.latestActivity!==d.snapshotSaved?`<br><b>Newest dated activity:</b> ${d.latestActivity}`:''}`;
    if(detail.innerHTML!==html)detail.innerHTML=html;
  });
}
function queueAnnotate(){
  if(annotateQueued)return;
  annotateQueued=true;
  setTimeout(()=>{annotateQueued=false;annotate()},0);
}
function closeRecovery(event){
  const close=event?.target?.closest?.('[data-katos-recovery-close]');
  if(!close)return;
  event.preventDefault?.();event.stopImmediatePropagation?.();
  document.querySelector('.katos-recovery-overlay')?.remove();
}

if(typeof document!=='undefined'&&typeof MutationObserver!=='undefined'){
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-katos-recovery-open]'))queueAnnotate();
  });
  document.addEventListener('pointerdown',closeRecovery,true);
  document.addEventListener('touchstart',closeRecovery,{capture:true,passive:false});
  const observer=new MutationObserver(()=>{
    if(document.querySelector('.katos-recovery-row:not([data-recovery-inspected="1"])'))queueAnnotate();
  });
  observer.observe(document.body,{childList:true,subtree:true});
}
