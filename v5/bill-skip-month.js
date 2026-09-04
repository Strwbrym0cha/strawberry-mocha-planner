import{runV5MoneyGigAction,selectV5MoneyGig,localDateKey}from'./data.js?v=5.8.0-bill-skip-month';

const app=document.getElementById('app');
const text=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function currentInstance(id){
  try{
    const view=selectV5MoneyGig(localDateKey());
    return (view.billHistory||view.bills||[]).find(row=>String(row?.id)===String(id))||null;
  }catch{return null}
}
function unskippedStatus(row){
  const today=localDateKey(),due=text(row?.dueDate);
  if(due<today)return'overdue';
  if(due===today)return'due';
  return'upcoming';
}
function noteWithReason(existing,reason){
  const label={mom:'Skipped this month · Mom paid it',notdue:'Skipped this month · Not due this month',other:'Skipped this month · Other'}[reason]||'Skipped this month';
  const clean=text(existing).replace(/(^|\n)Skipped this month[^\n]*/g,'').trim();
  return [clean,label].filter(Boolean).join('\n');
}
function stripSkipNote(existing){return text(existing).replace(/(^|\n)Skipped this month[^\n]*/g,'').trim()}

function enhance(){
  document.querySelectorAll('[data-money-form="bill-instance-save"]').forEach(form=>{
    if(form.querySelector('[data-bill-skip-box]'))return;
    const id=form.dataset.moneyId,row=currentInstance(id),status=text(row?.status)||form.querySelector('select[name="status"]')?.value||'upcoming',skipped=status==='skipped';
    const box=document.createElement('section');
    box.className='money-bill-skip-box';box.dataset.billSkipBox='';
    box.innerHTML=`<div><div class="ey">🌙 THIS MONTH ONLY</div><b>${skipped?'Skipped for this month':'Don’t need to pay this one?'}</b><span>${skipped?'The recurring bill will come back next month.':'Skip only this occurrence. Future months stay untouched.'}</span></div>${skipped?`<button type="button" class="btn soft" data-bill-unskip="${esc(id)}">↩ Undo skip</button>`:`<select data-bill-skip-reason aria-label="Reason for skipping this bill"><option value="mom">Mom paid it</option><option value="notdue">Not due this month</option><option value="other">Other</option></select><button type="button" class="btn soft" data-bill-skip="${esc(id)}">Skip this month</button>`}`;
    const actions=form.querySelector('.button-row');
    if(actions)form.insertBefore(box,actions);else form.append(box);
  });
}
function rerenderMoney(){document.querySelector('[data-view="money"]')?.click()}

app?.addEventListener('click',event=>{
  const skip=event.target.closest?.('[data-bill-skip]');
  if(skip){
    const form=skip.closest('[data-money-form="bill-instance-save"]'),id=skip.dataset.billSkip,row=currentInstance(id),reason=form?.querySelector('[data-bill-skip-reason]')?.value||'other',notes=form?.querySelector('textarea[name="notes"]')?.value||row?.notes||'';
    const result=runV5MoneyGigAction({type:'bill-instance-save',id,status:'skipped',actualAmount:row?.actualAmount??'',notes:noteWithReason(notes,reason)});
    if(result.ok)rerenderMoney();
    return;
  }
  const undo=event.target.closest?.('[data-bill-unskip]');
  if(undo){
    const form=undo.closest('[data-money-form="bill-instance-save"]'),id=undo.dataset.billUnskip,row=currentInstance(id),notes=form?.querySelector('textarea[name="notes"]')?.value||row?.notes||'';
    if(!row)return;
    const result=runV5MoneyGigAction({type:'bill-instance-save',id,status:unskippedStatus(row),actualAmount:row.actualAmount??'',notes:stripSkipNote(notes)});
    if(result.ok)rerenderMoney();
  }
});

new MutationObserver(()=>queueMicrotask(enhance)).observe(app,{childList:true,subtree:true});
enhance();
