import{REPEAT_OPTIONS,normalizeRepeat,advanceRecurringBill,unpaidBillsForMonth,unpaidBillTotalForMonth}from'./money-bill-cycle.js?v=4.1.22-current-month-unpaid';

const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const clone=v=>structuredClone(v);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const ordinal=n=>{const mod100=n%100;if(mod100>=11&&mod100<=13)return`${n}th`;return`${n}${{1:'st',2:'nd',3:'rd'}[n%10]||'th'}`};
const currency=v=>rt.currency?rt.currency(v):new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(Number(v)||0);
const monthKey=()=>String(rt.today?rt.today():new Date().toISOString().slice(0,10)).slice(0,7);

function injectStyle(){
 if(document.getElementById('money-bill-controls-style'))return;
 const s=document.createElement('style');s.id='money-bill-controls-style';s.textContent=`
 .record-tools-field select{width:100%;padding:10px 11px;border:1px solid #e6cdd6;border-radius:13px;background:#fff;font:inherit;color:inherit}
 .bill-cycle-hint{grid-column:1/-1;padding:10px 12px;border-radius:13px;background:#fff4f8;color:#795c64;font-size:12px;line-height:1.4}
 .bill-month-breakdown{margin-top:7px;font-size:9px;line-height:1.45;color:#866975}.bill-month-close{margin-top:7px;padding:5px 8px;border:1px solid #e4c8d3;border-radius:999px;background:#fff7fb;color:#7b4c5e;font:inherit;font-size:9px;font-weight:850;cursor:pointer}.bill-month-close:hover{background:#ffedf5}
 `;document.head.appendChild(s)
}

function setLabel(control,label){const host=control?.closest('.record-tools-field,.field');const span=host?.querySelector(':scope > span');if(span)span.textContent=label}
function makeSelect({field,name,value,options}){
 const select=document.createElement('select');
 if(field){select.dataset.recordField=field;select.dataset.valueType='string'}
 if(name)select.name=name;
 const vals=[...options];
 if(value&&!vals.some(([v])=>String(v)===String(value)))vals.unshift([value,value]);
 for(const [v,l]of vals){const o=document.createElement('option');o.value=v;o.textContent=l;if(String(v)===String(value))o.selected=true;select.appendChild(o)}
 return select
}
function repeatOptions(){return REPEAT_OPTIONS.map(v=>[v,v])}
function dueDayOptions(){return[['0','Use the exact due date'],...Array.from({length:31},(_,i)=>[String(i+1),ordinal(i+1)])]}

function decorateEditor(){
 const form=document.querySelector('#record-tools-modal form[data-record-tools-form="edit"][data-kind="bill"]');
 if(!form||form.dataset.billControlsPatched)return;
 form.dataset.billControlsPatched='1';
 const fields=form.querySelector('.record-tools-fields');
 if(!fields)return;

 let repeat=form.querySelector('[data-record-field="repeat"]');
 if(repeat){
  const value=normalizeRepeat(repeat.value);const select=makeSelect({field:'repeat',value,options:repeatOptions()});repeat.replaceWith(select);repeat=select;setLabel(repeat,'Repeats');
 }else{
  const label=document.createElement('label');label.className='record-tools-field';label.innerHTML='<span>Repeats</span>';label.appendChild(makeSelect({field:'repeat',value:'Monthly',options:repeatOptions()}));
  const recurringHost=form.querySelector('[data-record-field="recurring"]')?.closest('.record-tools-field');
  fields.insertBefore(label,recurringHost||null)
 }

 const recurring=form.querySelector('[data-record-field="recurring"]');if(recurring)setLabel(recurring,'Recurring bill?');
 const paid=form.querySelector('[data-record-field="paid"]');if(paid)setLabel(paid,'Paid this cycle?');
 const amount=form.querySelector('[data-record-field="amount"]');if(amount){amount.type='number';amount.min='0';amount.step='0.01';amount.inputMode='decimal';setLabel(amount,'Amount')}

 const dueDate=form.querySelector('[data-record-field="dueDate"]');
 const legacyDue=form.querySelector('[data-record-field="due"]');
 if(dueDate){dueDate.type='date';setLabel(dueDate,'Due date')}
 if(legacyDue&&dueDate){
  legacyDue.value=dueDate.value||legacyDue.value;legacyDue.type='hidden';legacyDue.closest('.record-tools-field').style.display='none';
  dueDate.addEventListener('input',()=>{legacyDue.value=dueDate.value});
 }else if(legacyDue){legacyDue.type='date';setLabel(legacyDue,'Due date')}

 let dueDay=form.querySelector('[data-record-field="dueDay"]');
 if(dueDay){const value=String(Number(dueDay.value)||0),select=makeSelect({field:'dueDay',value,options:dueDayOptions()});select.dataset.valueType='number';dueDay.replaceWith(select);dueDay=select;setLabel(dueDay,'Due day each month')}

 if(!form.querySelector('.bill-cycle-hint')){
  const note=document.createElement('div');note.className='bill-cycle-hint';note.textContent='Recurring bills roll to the next due date as soon as you mark the current cycle paid.';fields.appendChild(note)
 }
}

function decorateAddForm(){
 const form=document.querySelector('form[data-form="bill"]');
 if(!form||form.dataset.billControlsPatched)return;
 form.dataset.billControlsPatched='1';
 const fields=form.querySelector('.fields');if(!fields)return;
 const repeat=document.createElement('label');repeat.className='field';repeat.innerHTML='<span>Repeat</span>';repeat.appendChild(makeSelect({name:'repeat',value:'Monthly',options:repeatOptions()}));
 const recurring=document.createElement('label');recurring.className='field';recurring.innerHTML='<span>Recurring?</span>';recurring.appendChild(makeSelect({name:'recurring',value:'true',options:[['true','Yes, roll it forward'],['false','No, one-time bill']]}));
 fields.append(repeat,recurring)
}

function billNames(rows){return rows.map(b=>`${String(b?.name||'Bill').trim()||'Bill'} ${currency(b?.amount)}`)}
function patchCurrentMonthOverview(){
 if(!document.querySelector('.nav-btn.active[data-view="money"]')||!document.querySelector('[data-money-tab="overview"].active'))return;
 const state=rt.getState(),month=monthKey(),dueBills=unpaidBillsForMonth(state?.money?.bills,month),due=unpaidBillTotalForMonth(state?.money?.bills,month);
 let available=NaN;
 try{available=Number(window.__KATOS_V4_MONEY_LEDGER?.summary?.(state)?.available)}catch{}
 if(!Number.isFinite(available))available=(Array.isArray(state?.money?.accounts)?state.money.accounts:[]).reduce((sum,a)=>sum+(Number(a?.balance)||0),0);
 const safe=available-due,names=billNames(dueBills),detail=names.join(' · ');
 document.querySelectorAll('.money-ledger-stat').forEach(stat=>{
  const label=stat.querySelector('small')?.textContent?.trim();
  if(label!=='SAFE AFTER BILLS')return;
  const value=stat.querySelector('b'),meta=stat.querySelector('span');
  if(value)value.textContent=currency(safe);
  if(meta)meta.textContent=`${currency(due)} unpaid this month`;
  let breakdown=stat.querySelector('.bill-month-breakdown');
  if(dueBills.length){
   if(!breakdown){breakdown=document.createElement('div');breakdown.className='bill-month-breakdown';stat.appendChild(breakdown)}
   breakdown.textContent=detail;
   let close=stat.querySelector('[data-close-current-bills]');
   if(!close){close=document.createElement('button');close.type='button';close.className='bill-month-close';close.dataset.closeCurrentBills='1';close.textContent='✓ Month is paid';stat.appendChild(close)}
  }else{
   breakdown?.remove();stat.querySelector('[data-close-current-bills]')?.remove();
  }
  stat.title=dueBills.length?`Counted this month: ${detail}`:'No unpaid bills due in the current calendar month.';
 });
 document.querySelectorAll('.summary-grid .mini-stat').forEach(stat=>{
  const label=stat.querySelector('small')?.textContent?.trim()||'',value=stat.querySelector('b');if(!value)return;
  if(label.includes("SHIT I DON'T WANNA PAY")){value.textContent=currency(due);stat.title=dueBills.length?`Counted this month: ${detail}`:'No unpaid bills due this month.'}
  else if(label.includes('CAN I AFFORD TO BE SILLY?')){value.textContent=currency(safe);stat.title='Available money minus unpaid bills due this calendar month.'}
 });
}

function closeCurrentMonthBills(){
 const state=clone(rt.getState()),month=monthKey(),bills=Array.isArray(state.money?.bills)?state.money.bills:[],dueBills=unpaidBillsForMonth(bills,month);
 if(!dueBills.length)return;
 const names=billNames(dueBills);
 if(!confirm(`Mark the current month settled?\n\nThis will close:\n• ${names.join('\n• ')}\n\nRecurring bills roll forward. One-time bills are marked paid.`))return;
 const dueIds=new Set(dueBills.map(b=>String(b.id)));
 const stamp=new Date().toISOString();
 state.money.bills=bills.map(b=>{
  if(!dueIds.has(String(b.id)))return b;
  if(b.recurring===true)return advanceRecurringBill(b,new Date());
  return{...b,paid:true,lastPaidAt:stamp,updatedAt:stamp};
 });
 rt.setState(state,'Current month bills closed ✓');
}

function decorate(){injectStyle();decorateEditor();decorateAddForm();patchCurrentMonthOverview()}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate()})}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
schedule();

document.addEventListener('submit',event=>{
 const form=event.target.closest('form[data-form="bill"]');if(!form)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 const data=Object.fromEntries(new FormData(form).entries());
 const next=clone(rt.getState());next.money=next.money||{};next.money.bills=Array.isArray(next.money.bills)?next.money.bills:[];
 const recurring=data.recurring!=='false';
 next.money.bills.push({
  id:rt.makeId('bill'),name:String(data.name||'').trim(),amount:Number(data.amount)||0,dueDate:String(data.dueDate||''),dueDay:Number(data.dueDay)||0,
  repeat:normalizeRepeat(data.repeat),recurring,paid:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
 });
 rt.setState(next,'Bill added');
},true);

document.addEventListener('click',event=>{
 const close=event.target.closest('[data-close-current-bills]');
 if(close){event.preventDefault();event.stopPropagation();closeCurrentMonthBills();return}
 const button=event.target.closest('[data-action="bill-paid"]');if(!button)return;
 event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
 const id=button.dataset.id,state=clone(rt.getState()),bills=Array.isArray(state.money?.bills)?state.money.bills:[],index=bills.findIndex(b=>String(b.id)===String(id));if(index<0)return;
 const before=bills[index],after=advanceRecurringBill(before,new Date());bills[index]=after;state.money.bills=bills;
 let message='Bill status updated';
 if(before.recurring===true&&before.paid!==true)message=`Paid ✓ Next due ${after.dueDate||after.due||'next cycle'}`;
 else if(before.recurring===true&&before.paid===true)message='Recurring bill reopened';
 else message=after.paid?'Bill marked paid':'Bill marked unpaid';
 rt.setState(state,message);
},true);
