const app=document.getElementById('app');

function syncRoutineDayPicker(root=document){
  root.querySelectorAll('.routine-detail-modal form').forEach(form=>{
    const recurrence=form.querySelector('select[name="recurrence"]');
    const days=form.querySelector('.routine-day-field');
    if(!recurrence||!days)return;
    const specific=recurrence.value==='selected';
    days.hidden=!specific;
    days.setAttribute('aria-hidden',specific?'false':'true');
    days.querySelectorAll('input[name="repeatDays"]').forEach(input=>{input.disabled=!specific});
  });
}

app?.addEventListener('change',event=>{
  if(event.target?.matches?.('.routine-detail-modal select[name="recurrence"]'))syncRoutineDayPicker(event.target.closest('.routine-detail-modal'));
});
window.addEventListener('katos:rendered',()=>queueMicrotask(()=>syncRoutineDayPicker(app)));
new MutationObserver(()=>queueMicrotask(()=>syncRoutineDayPicker(app))).observe(app,{childList:true,subtree:true});
syncRoutineDayPicker(app);
