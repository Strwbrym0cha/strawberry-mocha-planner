import{selectV5MoneyGig,localDateKey}from'./data.js?v=5.8.5-gig-archive-filter';

const app=document.getElementById('app');
const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));
const money=value=>`$${(Number(value)||0).toFixed(2)}`;
const total=row=>Number(row?.total)||['basePay','promo','tip','bonus','reimbursement','otherPay'].reduce((sum,key)=>sum+(Number(row?.[key])||0),0);
const formatDate=value=>{const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?value:date.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})};
const getView=()=>selectV5MoneyGig(localDateKey());
const shiptPlatform=view=>view.gig.platforms.find(row=>/^shipt$/i.test(text(row?.name)))||view.gig.platforms.find(row=>/shipt/i.test(text(row?.name)))||null;

function shiptOrders(view){
  const platform=shiptPlatform(view);
  if(!platform)return[];
  return list(view.gig.orders).filter(row=>String(row?.platformId)===String(platform.id)&&!row?.archivedAt&&row?.status!=='archived'&&row?.status!=='canceled'&&row?.entryMode!=='shift'&&row?.aggregateShift!==true);
}
function groups(view){
  const grouped=new Map();
  for(const row of shiptOrders(view)){
    const date=text(row.date)||view.today;
    if(!grouped.has(date))grouped.set(date,[]);
    grouped.get(date).push(row);
  }
  return[...grouped.entries()].map(([date,orders])=>({date,orders:orders.sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))),base:orders.reduce((sum,row)=>sum+(Number(row.basePay)||0),0),tips:orders.reduce((sum,row)=>sum+(Number(row.tip)||0),0),gross:orders.reduce((sum,row)=>sum+total(row),0)})).sort((a,b)=>b.date.localeCompare(a.date));
}
function signature(group){return`${group.date}|${group.orders.map(row=>`${row.id}:${total(row)}:${row.tip||0}`).join(',')}`}
function batchCard(group){return`<article class="money-open-card shipt-batch-card" data-shipt-batch="${esc(group.date)}" data-shipt-batch-card="${esc(group.date)}" data-shipt-signature="${esc(signature(group))}" role="button" tabindex="0"><span class="shipt-batch-icon">🛍️</span><div class="shipt-batch-main"><b>Shipt batch</b><span>${esc(formatDate(group.date))} · ${group.orders.length} order${group.orders.length===1?'':'s'}</span><small>base ${money(group.base)} · tips ${money(group.tips)}</small></div><strong>${money(group.gross)}</strong></article>`}
function modal(group){return`<div class="detail-modal-backdrop shipt-batch-modal" data-shipt-batch-modal><section class="detail-modal" role="dialog" aria-modal="true"><div class="detail-modal-head"><div><div class="ey">🛍️ SHIPT BATCH · ${esc(formatDate(group.date))}</div><h2>${group.orders.length} order${group.orders.length===1?'':'s'} together</h2><p>KatOS keeps every Shipt order underneath. This card just stops the main screen from becoming order confetti.</p></div><button type="button" class="detail-modal-close" data-shipt-batch-close aria-label="Close">×</button></div><div class="shipt-batch-stats"><div><small>TOTAL</small><b>${money(group.gross)}</b></div><div><small>BASE PAY</small><b>${money(group.base)}</b></div><div><small>TIPS</small><b>${money(group.tips)}</b></div><div><small>ORDERS</small><b>${group.orders.length}</b></div></div><div class="shipt-batch-list">${group.orders.map((row,index)=>`<button type="button" class="shipt-batch-order" data-shipt-order-open="${esc(row.id)}"><span><b>Order ${index+1}</b><small>base ${money(row.basePay)} · tip ${money(row.tip)}${Number(row.promo||0)+Number(row.bonus||0)>0?` · extras ${money(Number(row.promo||0)+Number(row.bonus||0))}`:''}</small></span><strong>${money(total(row))}</strong><i>Edit</i></button>`).join('')}</div><div class="button-row daily-actions"><button type="button" class="btn primary" data-shipt-add-order="${esc(group.date)}">＋ Add another Shipt order</button><button type="button" class="btn soft" data-shipt-batch-close>Close</button></div></section></div>`}
function closeBatch(){app.querySelector('[data-shipt-batch-modal]')?.remove()}
function openBatch(date){const group=groups(getView()).find(item=>item.date===date);if(!group)return;closeBatch();app.insertAdjacentHTML('beforeend',modal(group))}
function openExistingOrder(id){closeBatch();const existing=app.querySelector(`[data-money-modal="order-${CSS.escape(String(id))}"]`);if(existing){existing.hidden=false;existing.removeAttribute('hidden');existing.querySelector('input,select,textarea')?.focus()}}
function openNewOrder(date){closeBatch();const view=getView(),platform=shiptPlatform(view),existing=app.querySelector('[data-money-modal="new-order"]');if(!existing)return;existing.hidden=false;existing.removeAttribute('hidden');const platformField=existing.querySelector('select[name="platformId"]'),dateField=existing.querySelector('input[name="date"]');if(platformField&&platform)platformField.value=String(platform.id);if(dateField)dateField.value=date;existing.querySelector('input,select,textarea')?.focus()}

function decorate(){
  const grid=app.querySelector('.money-order-grid');
  if(!grid)return;
  const view=getView(),batchGroups=groups(view),groupedIds=new Set(batchGroups.flatMap(group=>group.orders.map(row=>String(row.id))));

  // Re-apply the hidden child state every time the real Gig Work grid changes.
  // Other V5 enhancers may redraw cards after this script first runs.
  for(const card of grid.querySelectorAll('[data-money-open^="order-"]')){
    const openKey=String(card.dataset.moneyOpen||'');
    const id=openKey.startsWith('order-')?openKey.slice(6):'';
    const grouped=groupedIds.has(id);
    card.classList.toggle('shipt-batched-original',grouped);
    if(grouped){card.setAttribute('aria-hidden','true');card.setAttribute('tabindex','-1')}
    else{card.removeAttribute('aria-hidden');if(card.getAttribute('tabindex')==='-1')card.setAttribute('tabindex','0')}
  }

  const validDates=new Set(batchGroups.map(group=>group.date));
  for(const card of grid.querySelectorAll('[data-shipt-batch-card]'))if(!validDates.has(card.dataset.shiptBatchCard))card.remove();

  for(const group of batchGroups){
    const sig=signature(group);
    let card=grid.querySelector(`[data-shipt-batch-card="${CSS.escape(group.date)}"]`);
    if(card&&card.dataset.shiptSignature!==sig){card.outerHTML=batchCard(group);card=grid.querySelector(`[data-shipt-batch-card="${CSS.escape(group.date)}"]`)}
    if(!card){
      const anchor=[...grid.querySelectorAll('[data-money-open^="order-"]')].find(node=>!node.classList.contains('shipt-batched-original'));
      if(anchor)anchor.insertAdjacentHTML('beforebegin',batchCard(group));else grid.insertAdjacentHTML('beforeend',batchCard(group));
    }
  }

  const section=grid.closest('.money-card');
  const heading=section?.querySelector('h2'),lede=section?.querySelector('p'),add=section?.querySelector('[data-money-open="new-order"]');
  if(heading&&heading.textContent!=='Shipt batches + order details')heading.textContent='Shipt batches + order details';
  const copy='Shipt orders are grouped by day here. Tap a batch to see or edit the individual orders underneath.';
  if(lede&&lede.textContent!==copy)lede.textContent=copy;
  if(add&&add.textContent!=='＋ Add Shipt order')add.textContent='＋ Add Shipt order';
}

app.addEventListener('click',event=>{
  const batch=event.target.closest?.('[data-shipt-batch]');if(batch){openBatch(batch.dataset.shiptBatch);return}
  const close=event.target.closest?.('[data-shipt-batch-close]');if(close||event.target.matches?.('[data-shipt-batch-modal]')){closeBatch();return}
  const order=event.target.closest?.('[data-shipt-order-open]');if(order){openExistingOrder(order.dataset.shiptOrderOpen);return}
  const add=event.target.closest?.('[data-shipt-add-order]');if(add){openNewOrder(add.dataset.shiptAddOrder);return}
});
app.addEventListener('keydown',event=>{if(event.key==='Escape'&&app.querySelector('[data-shipt-batch-modal]'))closeBatch()});

let scheduled=false;
const scheduleDecorate=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate()})};
new MutationObserver(scheduleDecorate).observe(app,{childList:true,subtree:true});
decorate();
