const app=document.getElementById('app');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function closeStepModal(){document.querySelector('[data-routine-step-modal]')?.remove()}

function openStepModal(sourceForm){
  if(!sourceForm)return;
  closeStepModal();
  const routineId=sourceForm.dataset.dailyId||'';
  const routineCard=sourceForm.closest('.daily-routine');
  const routineName=routineCard?.querySelector(':scope > div:first-child > b')?.textContent?.trim()||'this routine';
  const modal=document.createElement('div');
  modal.className='detail-modal-backdrop daily-step-create-modal';
  modal.dataset.routineStepModal='';
  modal.innerHTML=`<section class="detail-modal compact-record-modal" role="dialog" aria-modal="true" aria-labelledby="routine-step-title">
    <div class="detail-modal-head">
      <div>
        <div class="ey">🍓 ROUTINE STEP</div>
        <h2 id="routine-step-title">Add a step</h2>
        <p>Add one small step to ${esc(routineName)}.</p>
      </div>
      <button type="button" class="detail-modal-close" data-routine-step-close aria-label="Close">×</button>
    </div>
    <form data-routine-step-create data-routine-id="${esc(routineId)}">
      <div class="room-detail-fields">
        <label class="daily-field daily-field-wide"><span>Step name</span><input name="label" placeholder="What happens in this step?" required autocomplete="off"></label>
      </div>
      <div class="button-row daily-actions">
        <button class="btn primary" type="submit">🍓 Add step</button>
        <button class="btn soft" type="button" data-routine-step-close>Cancel</button>
      </div>
    </form>
  </section>`;
  app.append(modal);
  modal.querySelector('input[name="label"]')?.focus();
}

// Capture before the existing Daily Shit form submit so an empty inline field
// never reaches the engine and never triggers a browser alert.
document.addEventListener('click',event=>{
  const addButton=event.target.closest?.('[data-daily-routine-step] button[type="submit"], [data-daily-routine-step] button:not([type])');
  if(addButton){
    const sourceForm=addButton.closest('[data-daily-routine-step]');
    if(sourceForm){
      event.preventDefault();
      event.stopImmediatePropagation();
      openStepModal(sourceForm);
      return;
    }
  }
  if(event.target.closest?.('[data-routine-step-close]')){
    event.preventDefault();
    closeStepModal();
    return;
  }
  if(event.target.matches?.('[data-routine-step-modal]'))closeStepModal();
},true);

document.addEventListener('submit',event=>{
  const modalForm=event.target.closest?.('[data-routine-step-create]');
  if(!modalForm)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const label=modalForm.querySelector('[name="label"]')?.value?.trim();
  if(!label)return;
  const routineId=modalForm.dataset.routineId;
  const sourceForm=[...document.querySelectorAll('[data-daily-routine-step]')].find(form=>String(form.dataset.dailyId)===String(routineId));
  if(!sourceForm)return;
  const sourceInput=sourceForm.querySelector('[name="label"]');
  if(sourceInput)sourceInput.value=label;
  closeStepModal();
  sourceForm.requestSubmit();
},true);
