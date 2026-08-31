const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;

function dateOnly(value){
  const s=text(value);
  const match=s.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0]||'';
}
function newest(values=[]){return values.map(dateOnly).filter(Boolean).sort().at(-1)||''}
function gigSource(row={}){
  const source=text(row.incomeSource||row.gigSource||row.source||row.label).toLowerCase().replace(/\s+/g,'-');
  if(source==='other'||source==='othergig')return'other-gig';
  return['doordash','shipt','other-gig'].includes(source)?source:'';
}
function gigAmount(row={}){return num(row.receivedAmount??row.amount??row.actualGross??row.estimatedGross??row.grossEarned)}
function gigDate(row={}){return dateOnly(row.receivedDate||row.date||row.expectedDate||row.createdAt)}
function rootAndNestedRows(state,key){
  const s=obj(state),money=obj(s.money),work=obj(s.work),insights=obj(s.insights);
  if(key==='earnings')return [...list(money.earnings),...list(s.earnings),...list(s.gigEarnings),...list(money.gigs)];
  if(key==='shifts')return [...list(work.shifts),...list(s.shifts)];
  if(key==='reviews')return [...list(insights.dayReviews),...list(s.dayReviews)];
  return[];
}

export function inspectRecoveryState(state={}){
  const s=obj(state);
  const gigs=rootAndNestedRows(s,'earnings').filter(row=>row?.kind==='gig'||gigSource(row));
  const shifts=rootAndNestedRows(s,'shifts');
  const reviews=rootAndNestedRows(s,'reviews');
  const dayNotes=obj(s.dayNotes);
  const dayNoteEntries=Object.entries(dayNotes);
  const gigDates=gigs.map(gigDate).filter(Boolean);
  const reviewDates=reviews.flatMap(row=>[row?.date,row?.day,row?.savedAt,row?.updatedAt,row?.createdAt,row?.workSnapshot?.capturedAt]);
  const noteDates=dayNoteEntries.flatMap(([date,row])=>[date,row?.savedAt,row?.updatedAt,row?.createdAt]);
  const shiftDates=shifts.flatMap(row=>[row?.date,row?.createdAt,row?.updatedAt]);
  const metaDates=[s?.meta?.updatedAt,s?.meta?.createdAt,s?.__smUpdatedAt];
  const latestActivity=newest([...gigDates,...reviewDates,...noteDates,...shiftDates,...metaDates]);
  const latestGig=newest(gigDates);
  const gigTotal=Math.round(gigs.reduce((sum,row)=>sum+gigAmount(row),0)*100)/100;
  return{
    gigCount:gigs.length,
    gigTotal,
    latestGig,
    shiftCount:shifts.length,
    dailyNoteCount:reviews.length+dayNoteEntries.length,
    latestActivity,
    reachesAug28:latestActivity>='2026-08-28'||latestGig>='2026-08-28'
  };
}

function money(value){return`$${num(value).toFixed(2)}`}
function annotate(){
  const overlay=document.querySelector('.katos-recovery-overlay');
  const candidates=list(overlay?.__katosRecoveryCandidates);
  if(!overlay||!candidates.length)return;
  const rows=[...overlay.querySelectorAll('.katos-recovery-row')];
  rows.forEach((row,index)=>{
    if(row.dataset.recoveryInspected)return;
    const candidate=candidates[index];if(!candidate)return;
    const d=inspectRecoveryState(candidate.state);
    const meta=row.querySelector('.katos-recovery-meta');if(!meta)return;
    const detail=document.createElement('div');detail.className='katos-recovery-inspector';
    detail.style.cssText='margin-top:7px;padding:7px 8px;border-radius:11px;background:#fff3f8;color:#76515f;font-size:10px;line-height:1.55';
    detail.innerHTML=`${d.reachesAug28?'<b>🔥 AUG 28+ ACTIVITY FOUND</b><br>':''}<b>Gig receipts:</b> ${d.gigCount} · ${money(d.gigTotal)}${d.latestGig?` · latest ${d.latestGig}`:''}<br><b>Work shifts:</b> ${d.shiftCount} · <b>Daily notes/reviews:</b> ${d.dailyNoteCount}${d.latestActivity?`<br><b>Newest real activity:</b> ${d.latestActivity}`:''}`;
    meta.after(detail);row.dataset.recoveryInspected='1';
  });
}

if(typeof document!=='undefined'&&typeof MutationObserver!=='undefined'){
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-katos-recovery-open]'))setTimeout(annotate,0);
  });
  const observer=new MutationObserver(()=>annotate());observer.observe(document.body,{childList:true,subtree:true});
}
