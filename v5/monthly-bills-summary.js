import { snapshotV4, selectV5MoneyGig } from './data.js?v=5.6.0-final-integration';

const money=value=>`${Number(value)<0?'−':''}$${Math.abs(Number(value)||0).toFixed(2)}`;
const activeStatuses=new Set(['upcoming','due','overdue','changed']);
const handledStatuses=new Set(['paid','skipped']);

function monthLabel(today){
  const date=new Date(`${today.slice(0,7)}-01T12:00:00`);
  return date.toLocaleDateString([],{month:'long'});
}

function amountOf(row){
  const value=row?.actualAmount ?? row?.expectedAmount ?? 0;
  return Math.max(0,Number(value)||0);
}

function buildSummary(){
  const snapshot=snapshotV4();
  const view=selectV5MoneyGig(snapshot.today);
  const month=String(view.today||snapshot.today||'').slice(0,7);
  const instances=(view.billHistory||[]).filter(row=>String(row?.dueDate||'').startsWith(month));
  const active=instances.filter(row=>activeStatuses.has(String(row?.status||'upcoming').toLowerCase()));
  const paid=instances.filter(row=>String(row?.status||'').toLowerCase()==='paid');
  const handled=instances.filter(row=>handledStatuses.has(String(row?.status||'').toLowerCase()));
  const remaining=active.reduce((sum,row)=>sum+amountOf(row),0);
  const total=instances.filter(row=>String(row?.status||'').toLowerCase()!=='skipped').reduce((sum,row)=>sum+amountOf(row),0);
  const paidAmount=paid.reduce((sum,row)=>sum+amountOf(row),0);
  const percent=total>0?Math.max(0,Math.min(100,Math.round(paidAmount/total*100))):instances.length&&handled.length===instances.length?100:0;
  const next=active.slice().sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)))[0];
  return {month:monthLabel(view.today),instances,active,paid,handled,remaining,total,paidAmount,percent,next};
}

function cardHtml(summary){
  const totalCount=summary.instances.length;
  const leftCount=summary.active.length;
  const handledCount=summary.handled.length;
  const nextLine=summary.next
    ? `Next: ${summary.next.name||'Bill'} · ${money(amountOf(summary.next))}`
    : totalCount
      ? 'Nothing else is waiting this month. ✨'
      : 'No monthly bills are saved yet.';
  return `<section class="card full bills-month-card" data-monthly-bills-summary>
    <div class="card-head bills-month-head">
      <div>
        <div class="ey">🧾 BILLS DUE THIS MONTH · ${summary.month.toUpperCase()}</div>
        <h2>${money(summary.remaining)} left to cover</h2>
        <p>${leftCount ? `${leftCount} bill${leftCount===1?'':'s'} still waiting.` : 'This month’s active bills are handled.'}</p>
      </div>
      <div class="bills-month-count"><b>${handledCount}/${totalCount}</b><span>handled</span></div>
    </div>
    <div class="bills-month-stats">
      <div><small>REMAINING</small><b>${money(summary.remaining)}</b><span>unpaid this month</span></div>
      <div><small>PAID</small><b>${money(summary.paidAmount)}</b><span>recorded paid</span></div>
      <div><small>MONTH TOTAL</small><b>${money(summary.total)}</b><span>excluding skipped</span></div>
    </div>
    <div class="bills-month-progress" aria-label="${summary.percent}% of this month’s bill amount paid"><i style="width:${summary.percent}%"></i></div>
    <div class="bills-month-next">${nextLine}</div>
  </section>`;
}

function mount(){
  const grid=document.querySelector('.money-compact-grid');
  if(!grid)return;
  grid.querySelector('[data-monthly-bills-summary]')?.remove();
  const ledger=grid.querySelector('.money-ledger-card');
  if(!ledger)return;
  const wrapper=document.createElement('template');
  wrapper.innerHTML=cardHtml(buildSummary()).trim();
  grid.insertBefore(wrapper.content.firstElementChild,ledger);
}

let queued=false;
const queueMount=()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;mount()});
};

const observer=new MutationObserver(queueMount);
observer.observe(document.getElementById('app'),{childList:true,subtree:true});
window.addEventListener('pageshow',queueMount);
queueMount();
