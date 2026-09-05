import{selectV5MoneyGig,localDateKey}from'./data.js?v=5.8.5-gig-archive-filter';

const app=document.getElementById('app');
const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]||char));
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
function batchCard(group){return`<article class="money-open-card shipt-batch-card" data-shipt-batch="${esc(group.date)}" role="button" tabindex="0"><span class="shipt-batch-icon">🛍️</span><div class="shipt-batch-main"><b>Shipt batch</b><span>${esc(formatDate(group.date))} · ${group.orders.length} order${group.orders.length===1?'':'s'}</span><small>base ${money(group.base)} · tips ${money(group.tips)}</small></div><strong>${money(group.gross)}</strong></article>`}
function modal(group){return`<div class="detail-modal-backdrop shipt-batch-modal" data-shipt-batch-modal><section class="detail-modal" role="dialog" aria-modal="true"><div class="detail-modal-head"><div><div class="ey">🛍️ SHIPT BATCH · ${esc(formatDate(group.date))}</div><h2>${group.orders.length} order${group.orders.length===1?'':'s'} together</h2><p>KatOS keeps every Shipt order underneath. This card just stops the main screen from becoming order confetti.</p></div><button type="button" class="detail-modal-close" data-shipt-batch-close aria-label="Close">×</button></div><div class="shipt-batch-stats"><div><small>TOTAL</small><b>${money(group.gross)}</b></div><div><small>BASE PAY</small><b>${money(group.base)}</b></div><div><small>TIPS</small><b>${money(group.tips)}</b></div><div><small>ORDERS</small><b>${group.orders.length}</b></div></div><div class="shipt-batch-list">${group.orders.map((row,index)=>`<button type="button" class="shipt-batch-order" data-shipt-order-open="${esc(row.id)}"><span><b>Order ${index+1}</b><small>base ${money(row.basePay)} · tip ${money(row.tip)}${Number(row.promo||0)+Number(row.bonus||0)>0?` · extras ${money(Number(row.promo||0)+Number(row.bonus||0))}`:''}</small></span><strong>${money(total(row))}</strong><i>Edit</i></button>`).join('')}</div><div class="button-row daily-actions"><button type="button" class="btn primary" data-shipt-add-order="${esc(group.date)}">＋ Add another Shipt order</button><button type="button" class="btn soft" data-shipt-batch-close>Close</button></div></section></div>`}
function closeBatch(){app.querySelector('[data-shipt-batch-modal]')?.remove()}
function openBatch(date){const group=groups(getView()).find(item=>item.date===date);if(!group)return;closeBatch();app.insertAdjacentHTML('beforeend',modal(group))}
function openExistingOrder(id){closeBatch();const existing=app.querySelector(`[data-money-modal="order-${CSS.escape(String(id))}"]`);if(existing){existing.hidden=false;existing.removeAttribute('hidden');existing.querySelector('input,select,textarea')?.focus()}}
function openNewOrder(date){closeBatch();const view=getView(),platform=shiptPlatform(view),existing=app.querySelector('[data-money-modal="new-order"]');if(!existing)return;existing.hidden=false;existing.removeAttribute('hidden');const platformField=existing.querySelector('select[name="platformId"]'),dateField=existing.querySelector('input[name="date"]');if(platformField&&platform)platformField.value=String(platform.id);if(dateField)dateField.value=date;existing.querySelector('input,select,textarea')?.focus()}

function decorate(){
  const grid=app.querySelector('.money-order-grid');
  if(!grid)return;
  if(grid.dataset.shiptGrouped==='true')return;
  const view=getView(),batchGroups=groups(view);
  if(!batchGroups.length)return;
  for(const group of batchGroups){
    for(const row of group.orders){
      const card=grid.querySelector(`[data-money-open="order-${CSS.escape(String(row.id))}"]`);
      if(card)card.hidden=true;
    }
  }
  const firstCard=grid.querySelector('[data-money-open^="order-"]');
  const html=batchGroups.map(batchCard).join('');
  if(firstCard)firstCard.insertAdjacentHTML('beforebegin',html);else grid.insertAdjacentHTML('afterbegin',html);
  grid.dataset.shiptGrouped='true';
  const section=grid.closest('.money-card');
  const title=section?.querySelector('h2'),lede=section?.querySelector('p'),add=section?.querySelector('[data-money-open="new-order"]');
  if(title)title.textContent='Shipt batches + order details';
  if(lede)lede.textContent='Shipt orders are grouped by day here. Tap a batch to see or edit the individual orders underneath.';
  if(add) add.textContent='＋ Add Shipt order';
}

app.addEventListener('click',event=>{
  const batch=event.target.closest?.('[data-shipt-batch]');if(batch){openBatch(batch.dataset.shiptBatch);return}
  const close=event.target.closest?.('[data-shipt-batch-close]');if(close||event.target.matches?.('[data-shipt-batch-modal]')){closeBatch();return}
  const order=event.target.closest?.('[data-shipt-order-open]');if(order){openExistingOrder(order.dataset.shiptOrderOpen);return}
  const add=event.target.closest?.('[data-shipt-add-order]');if(add){openNewOrder(add.dataset.shiptAddOrder);return}
});
app.addEventListener('keydown',event=>{if(event.key==='Escape'&&app.querySelector('[data-shipt-batch-modal]'))closeBatch()});

// KatOS replaces app's direct children on a real page render. Watching only that
// level keeps this presentation grouping stable without creating a self-trigger loop.
new MutationObserver(()=>requestAnimationFrame(decorate)).observe(app,{childList:true});
decorate();
