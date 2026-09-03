const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const list=v=>Array.isArray(v)?v:[];

function ordinalDay(value){
 const n=Math.max(1,Math.min(31,Math.round(Number(value)||0)));
 const mod100=n%100;
 const suffix=mod100>=11&&mod100<=13?'th':n%10===1?'st':n%10===2?'nd':n%10===3?'rd':'th';
 return `${n}${suffix}`;
}

function enhanceDebtRows(state){
 const debts=list(state?.money?.debts);
 document.querySelectorAll('button[data-action="edit"][data-kind="debt"][data-id]').forEach(button=>{
  const debt=debts.find(d=>String(d.id)===String(button.dataset.id));
  const day=Number(debt?.dueDay)||0;
  if(!day)return;
  const meta=button.closest('.row')?.querySelector('.meta');
  if(!meta)return;
  meta.textContent=meta.textContent.replace(/ · due \d{1,2}(?= ·|$)/,` · due monthly on the ${ordinalDay(day)}`);
 });
}

function enhanceBillRows(state){
 const bills=list(state?.money?.bills);
 document.querySelectorAll('button[data-action="bill-paid"][data-id]').forEach(button=>{
  const bill=bills.find(b=>String(b.id)===String(button.dataset.id));
  const day=Number(bill?.dueDay)||0;
  if(!day||bill?.dueDate)return;
  const meta=button.closest('.row')?.querySelector('.meta');
  if(!meta)return;
  meta.textContent=meta.textContent.replace(/due day \d{1,2}/,`due monthly on the ${ordinalDay(day)}`);
 });
}

function enhanceDueFields(){
 document.querySelectorAll('.main .page .field').forEach(field=>{
  const input=field.querySelector('input[name="dueDay"]');
  if(!input)return;
  const label=field.querySelector('span');
  if(label)label.textContent='Due day each month · 1–31';
  input.placeholder=input.placeholder||'17';
  input.title='Example: 17 means the 17th of every month';
  if(!field.querySelector('[data-money-due-hint]')){
   const hint=document.createElement('small');
   hint.dataset.moneyDueHint='1';
   hint.className='meta';
   hint.textContent='Example: 17 = the 17th of every month';
   field.appendChild(hint);
  }
 });
}

function refresh(){
 if(!document.querySelector('.nav-btn.active[data-view="money"]'))return;
 const state=rt.getState();
 enhanceDebtRows(state);
 enhanceBillRows(state);
 enhanceDueFields();
}

let queued=false;
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})};
new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});
schedule();
