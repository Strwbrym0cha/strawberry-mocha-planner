const list=v=>Array.isArray(v)?v:[];
const rows=v=>Array.isArray(v)?v.filter(Boolean):(v&&typeof v==='object'?Object.entries(v).map(([key,row])=>row&&typeof row==='object'&&!Array.isArray(row)?{id:row.id||key,name:row.name||key,...row}:{id:key,name:key,amount:Number(row)||0}):[]);
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;

function dateOnly(value){const s=text(value),match=s.match(/\d{4}-\d{2}-\d{2}/);return match?.[0]||''}
function newest(values=[]){return values.map(dateOnly).filter(Boolean).sort().at(-1)||''}
function gigSource(row={}){
  const source=text(row.incomeSource||row.gigSource||row.source||row.label||row.platform).toLowerCase().replace(/\s+/g,'-');
  if(source.includes('door'))return'doordash';if(source.includes('shipt'))return'shipt';if(source==='other'||source==='othergig'||source==='other-gig')return'other-gig';return'';
}
function gigAmount(row={}){if(row.platform||row.earnings!=null)return num(row.earnings)+num(row.tips);return num(row.receivedAmount??row.amount??row.actualGross??row.estimatedGross??row.grossEarned)}
function gigDate(row={}){return dateOnly(row.receivedDate||row.date||row.expectedDate||row.createdAt)}
function rootAndNestedRows(state,key){
  const s=obj(state),money=obj(s.money),work=obj(s.work),insights=obj(s.insights);
  if(key==='earnings')return [...rows(money.earnings),...rows(s.earnings),...rows(s.gigEarnings),...rows(money.gigs),...rows(s.gigWork)];
  if(key==='shifts')return [...rows(work.shifts),...rows(s.shifts)];
  if(key==='reviews')return [...rows(insights.dayReviews),...rows(s.dayReviews)];
  return[];
}
function obligationAmount(row={}){return num(row.amount??row.typicalAmount??row.balance??row.current)}

export function inspectRecoveryState(state={}){
  const s=obj(state),money=obj(s.money);
  const gigs=rootAndNestedRows(s,'earnings').filter(row=>row?.kind==='gig'||row?.platform||gigSource(row));
  const shifts=rootAndNestedRows(s,'shifts'),reviews=rootAndNestedRows(s,'reviews');
  const bills=rows(money.bills),subscriptions=rows(money.subscriptions),debts=rows(money.debts),savings=rows(money.savingsGoals).length?rows(money.savingsGoals):rows(money.savings);
  const dayNotes=obj(s.dayNotes),dayNoteEntries=Object.entries(dayNotes),gigDates=gigs.map(gigDate).filter(Boolean);
  const reviewDates=reviews.flatMap(row=>[row?.date,row?.day,row?.savedAt,row?.updatedAt,row?.createdAt,row?.workSnapshot?.capturedAt]);
  const noteDates=dayNoteEntries.flatMap(([date,row])=>[date,row?.savedAt,row?.updatedAt,row?.createdAt]);
  const shiftDates=shifts.flatMap(row=>[row?.date,row?.createdAt,row?.updatedAt]);
  const latestContentActivity=newest([...gigDates,...reviewDates,...noteDates,...shiftDates]);
  const snapshotUpdatedAt=dateOnly(s?.__smUpdatedAt||s?.meta?.updatedAt||s?.meta?.createdAt),latestGig=newest(gigDates);
  const gigTotal=Math.round(gigs.reduce((sum,row)=>sum+gigAmount(row),0)*100)/100;
  const billTotal=Math.round([...bills,...subscriptions].reduce((sum,row)=>sum+obligationAmount(row),0)*100)/100;
  return{
    gigCount:gigs.length,gigTotal,latestGig,shiftCount:shifts.length,dailyNoteCount:reviews.length+dayNoteEntries.length,
    billCount:bills.length,subscriptionCount:subscriptions.length,billTotal,debtCount:debts.length,savingsCount:savings.length,
    latestContentActivity,snapshotUpdatedAt,
    reachesAug28:latestContentActivity>='2026-08-28'||latestGig>='2026-08-28'
  };
}

function money(value){return`$${num(value).toFixed(2)}`}
function annotate(){
  const overlay=document.querySelector('.katos-recovery-overlay'),candidates=list(overlay?.__katosRecoveryCandidates);if(!overlay||!candidates.length)return;
  const cards=[...overlay.querySelectorAll('.katos-recovery-row')];
  cards.forEach((row,index)=>{
    if(row.dataset.recoveryInspected)return;const candidate=candidates[index];if(!candidate)return;
    const d=inspectRecoveryState(candidate.state),meta=row.querySelector('.katos-recovery-meta');if(!meta)return;
    const detail=document.createElement('div');detail.className='katos-recovery-inspector';detail.style.cssText='margin-top:7px;padding:7px 8px;border-radius:11px;background:#fff3f8;color:#76515f;font-size:10px;line-height:1.55';
    detail.innerHTML=`${d.reachesAug28?'<b>🔥 AUG 28+ CONTENT FOUND</b><br>':''}<b>Gig receipts:</b> ${d.gigCount} · ${money(d.gigTotal)}${d.latestGig?` · latest ${d.latestGig}`:''}<br><b>Bills:</b> ${d.billCount} · <b>Subscriptions:</b> ${d.subscriptionCount} · ${money(d.billTotal)} combined<br><b>Debts:</b> ${d.debtCount} · <b>Savings:</b> ${d.savingsCount}<br><b>Work shifts:</b> ${d.shiftCount} · <b>Daily notes/reviews:</b> ${d.dailyNoteCount}${d.latestContentActivity?`<br><b>Newest dated content:</b> ${d.latestContentActivity}`:''}${d.snapshotUpdatedAt?`<br><b>Snapshot last written:</b> ${d.snapshotUpdatedAt}`:''}`;
    meta.after(detail);row.dataset.recoveryInspected='1';
  });
}

if(typeof document!=='undefined'&&typeof MutationObserver!=='undefined'){
  document.addEventListener('click',event=>{if(event.target?.closest?.('[data-katos-recovery-open]'))setTimeout(annotate,0)});
  const observer=new MutationObserver(()=>annotate());observer.observe(document.body,{childList:true,subtree:true});
}
