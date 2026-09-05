import{runV5MoneyGigAction,selectV5MoneyGig,updateV5Record,localDateKey}from'./data.js?v=5.8.3-doordash-modal';

const app=document.getElementById('app');
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>`$${(Number(v)||0).toFixed(2)}`;
const mins=(h,m)=>Math.max(0,(Number(h)||0)*60+(Number(m)||0));
const split=v=>({h:Math.floor((Number(v)||0)/60),m:(Number(v)||0)%60});
const total=row=>(Number(row?.basePay)||0)+(Number(row?.tip)||0)+(Number(row?.promo)||0)+(Number(row?.bonus)||0)+(Number(row?.reimbursement)||0)+(Number(row?.otherPay)||0);
const getView=()=>selectV5MoneyGig(localDateKey());
const doorDash=v=>v.gig.platforms.find(row=>/door\s*dash/i.test(row.name||''));
const shifts=v=>v.gig.orders.filter(row=>row?.entryMode==='shift'||row?.aggregateShift===true);

function modal(row={}){
 const v=getView(),platform=doorDash(v),a=split(row.activeMinutes),d=split(row.onlineMinutes);
 return`<div class="detail-modal-backdrop money-modal doordash-shift-modal" data-doordash-shift-modal><section class="detail-modal" role="dialog" aria-modal="true"><div class="detail-modal-head"><div><div class="ey">🚗 DOORDASH SHIFT</div><h2>${row.id?'Edit DoorDash shift':'Add DoorDash shift'}</h2><p>Use the dash summary DoorDash already gives you. No need to enter every delivery.</p></div><button type="button" class="detail-modal-close" data-doordash-shift-close>×</button></div>${platform?`<form data-doordash-shift-form${row.id?` data-id="${esc(row.id)}"`:''}><div class="room-detail-fields"><label class="money-field"><span>Date</span><input name="date" type="date" value="${esc(row.date||localDateKey())}" required></label><label class="money-field"><span>Start time</span><input name="startTime" type="time" value="${esc(row.startTime||'')}"></label><label class="money-field"><span>End time</span><input name="endTime" type="time" value="${esc(row.endTime||'')}"></label><label class="money-field"><span>Completed deliveries</span><input name="deliveryCount" type="number" min="0" step="1" value="${esc(row.deliveryCount||'')}"></label><label class="money-field"><span>DoorDash pay</span><input name="basePay" type="number" min="0" step="0.01" value="${esc(row.basePay||'')}" required></label><label class="money-field"><span>Tips</span><input name="tip" type="number" min="0" step="0.01" value="${esc(row.tip||'')}"></label><label class="money-field"><span>Bonus / promo</span><input name="bonus" type="number" min="0" step="0.01" value="${esc((Number(row.bonus)||0)+(Number(row.promo)||0)||'')}"></label><label class="money-field"><span>Mileage · optional</span><input name="mileage" type="number" min="0" step="0.1" value="${esc(row.mileage||'')}"></label><fieldset class="doordash-time-pair"><legend>Active time</legend><input name="activeHours" type="number" min="0" step="1" placeholder="Hours" value="${a.h||''}"><input name="activeMinutesPart" type="number" min="0" max="59" step="1" placeholder="Minutes" value="${a.m||''}"></fieldset><fieldset class="doordash-time-pair"><legend>Dash time</legend><input name="dashHours" type="number" min="0" step="1" placeholder="Hours" value="${d.h||''}"><input name="dashMinutesPart" type="number" min="0" max="59" step="1" placeholder="Minutes" value="${d.m||''}"></fieldset><label class="money-field wide"><span>Notes · optional</span><textarea name="notes" rows="2">${esc(row.notes||'')}</textarea></label></div><div class="doordash-total"><span>Shift total</span><b data-doordash-total>${money(total(row))}</b></div><div class="doordash-error" data-doordash-error></div><div class="button-row daily-actions"><button class="btn primary">🍓 Save shift</button>${row.id?'<button type="button" class="btn soft" data-doordash-archive>📦 Archive</button>':''}<button type="button" class="btn soft" data-doordash-shift-close>Cancel</button></div></form>`:'<div class="empty">DoorDash is missing from your Gig Work platform list.</div>'}</section></div>`;
}
function open(row={}){app.querySelector('[data-doordash-shift-modal]')?.remove();app.insertAdjacentHTML('beforeend',modal(row));app.querySelector('[data-doordash-shift-modal] input')?.focus()}
function close(){app.querySelector('[data-doordash-shift-modal]')?.remove()}
function rerender(){app.querySelector('[data-boss-lane="gig"]')?.click()}

function decorate(){
 const hero=app.querySelector('.gig-hero-card');if(!hero)return;
 const orderButton=hero.querySelector('[data-money-open="new-order"]');
 if(orderButton&&orderButton.textContent!=='🍓 ＋ Shipt order')orderButton.textContent='🍓 ＋ Shipt order';
 const buttons=hero.querySelector('.button-row');
 if(buttons&&!buttons.querySelector('[data-doordash-add]'))buttons.insertAdjacentHTML('afterbegin','<button type="button" class="btn primary" data-doordash-add>🚗 ＋ DoorDash shift</button>');
 const v=getView();
 for(const row of shifts(v)){
   const card=app.querySelector(`[data-money-open="order-${CSS.escape(String(row.id))}"]`);if(!card)continue;
   const name=card.querySelector('b'),meta=card.querySelector('small');
   if(name)name.textContent='DoorDash shift';
   if(meta)meta.textContent=`${row.deliveryCount||0} deliveries · DoorDash pay ${money(row.basePay)} · tips ${money(row.tip)}`;
   card.dataset.doordashShiftOpen=String(row.id);
 }
}

app.addEventListener('click',e=>{
 let b=e.target.closest('[data-doordash-add]');if(b){open();return}
 b=e.target.closest('[data-doordash-shift-open]');if(b){const row=shifts(getView()).find(x=>String(x.id)===String(b.dataset.doordashShiftOpen));if(row){e.preventDefault();e.stopPropagation();open(row)}return}
 if(e.target.closest('[data-doordash-shift-close]')||e.target.matches('[data-doordash-shift-modal]')){close();return}
 b=e.target.closest('[data-doordash-archive]');if(b){const f=b.closest('[data-doordash-shift-form]'),id=f?.dataset.id;if(!id)return;const r=runV5MoneyGigAction({type:'archive',kind:'order',id});if(r.ok){close();rerender()}else f.querySelector('[data-doordash-error]').textContent=r.error||'Could not archive shift.'}
},true);
app.addEventListener('input',e=>{const f=e.target.closest('[data-doordash-shift-form]');if(!f)return;const d=new FormData(f),n=(Number(d.get('basePay'))||0)+(Number(d.get('tip'))||0)+(Number(d.get('bonus'))||0),out=f.querySelector('[data-doordash-total]');if(out)out.textContent=money(n)});
app.addEventListener('submit',e=>{const f=e.target.closest('[data-doordash-shift-form]');if(!f)return;e.preventDefault();const v=getView(),platform=doorDash(v),d=Object.fromEntries(new FormData(f));if(!platform)return;const basePay=Number(d.basePay)||0,tip=Number(d.tip)||0,bonus=Number(d.bonus)||0;if(basePay+tip+bonus<=0){f.querySelector('[data-doordash-error]').textContent='Add DoorDash pay, tips, or bonus first.';return}const r=runV5MoneyGigAction({type:'order-save',id:f.dataset.id||'',platformId:platform.id,date:text(d.date)||localDateKey(),basePay,tip,bonus,promo:0,reimbursement:0,otherPay:0,mileage:Number(d.mileage)||0,activeMinutes:mins(d.activeHours,d.activeMinutesPart),onlineMinutes:mins(d.dashHours,d.dashMinutesPart),status:'completed',notes:text(d.notes)});if(!r.ok){f.querySelector('[data-doordash-error]').textContent=r.error||'Could not save shift.';return}const id=r.result?.id||f.dataset.id,p=updateV5Record('work.gig.orders',id,{entryMode:'shift',aggregateShift:true,deliveryCount:Math.max(0,Number(d.deliveryCount)||0),startTime:text(d.startTime),endTime:text(d.endTime),shiftLabel:'DoorDash shift'});if(!p.ok){f.querySelector('[data-doordash-error]').textContent=p.error||'Shift saved, but details could not be attached.';return}close();rerender()});

new MutationObserver(()=>requestAnimationFrame(decorate)).observe(app,{childList:true});
decorate();
