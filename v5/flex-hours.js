import{snapshotV4,selectV5MoneyGig}from'./data.js?v=7.0.14-flex-shift-planner';

const app=document.getElementById('app');
const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const durationMinutes=(start,end)=>{if(!/^\d{1,2}:\d{2}$/.test(text(start))||!/^\d{1,2}:\d{2}$/.test(text(end)))return 0;const[sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);let minutes=(eh*60+em)-(sh*60+sm);if(minutes<0)minutes+=1440;return minutes};
const split=value=>({hours:Math.floor((Number(value)||0)/60),minutes:(Number(value)||0)%60});
const format=value=>{const minutes=Math.max(0,Number(value)||0),hours=Math.floor(minutes/60),remainder=minutes%60;if(!minutes)return'Choose a start and end time';if(!remainder)return`${hours} hr`;if(!hours)return`${remainder} min`;return`${hours} hr ${remainder} min`};

function records(form){
 const snapshot=snapshotV4(),plan=list(snapshot?.state?.work?.gigShifts).find(row=>String(row.id)===String(form.dataset.planId));
 const view=selectV5MoneyGig(snapshot.today),summary=list(view.gig?.orders).find(row=>String(row.id)===String(form.dataset.summaryId||plan?.summaryOrderId));
 return{plan,summary};
}

function updateScheduled(form){
 const output=form.querySelector('[data-flex-planned-hours]');if(!output)return;
 const start=form.elements.namedItem('startTime')?.value,end=form.elements.namedItem('endTime')?.value;
 output.textContent=format(durationMinutes(start,end));
}

function enhance(){
 const form=app.querySelector('[data-flex-shift-form]');if(!form)return;
 const planFields=form.querySelector('.flex-stage:not(.flex-summary-stage) .room-detail-fields');
 if(planFields&&!form.querySelector('[data-flex-planned-hours]'))planFields.insertAdjacentHTML('afterend','<div class="flex-hours"><span>Scheduled block</span><b data-flex-planned-hours></b></div>');
 const summaryFields=form.querySelector('.flex-summary-stage .room-detail-fields');
 if(summaryFields&&!form.elements.namedItem('actualHours')){
  const{plan,summary}=records(form),scheduled=durationMinutes(form.elements.namedItem('startTime')?.value,form.elements.namedItem('endTime')?.value),actual=split(summary?.activeMinutes??plan?.actualMinutes??scheduled),notes=summaryFields.querySelector('.money-field.wide');
  const fieldset=document.createElement('fieldset');fieldset.className='flex-time-pair';fieldset.innerHTML=`<legend>Actual duration</legend><input name="actualHours" type="number" min="0" step="1" inputmode="numeric" placeholder="Hours" value="${actual.hours||''}"><input name="actualMinutesPart" type="number" min="0" max="59" step="1" inputmode="numeric" placeholder="Minutes" value="${actual.minutes||''}">`;summaryFields.insertBefore(fieldset,notes||null);
 }
 updateScheduled(form);
}

app.addEventListener('input',event=>{const form=event.target.closest?.('[data-flex-shift-form]');if(form&&['startTime','endTime'].includes(event.target.name))updateScheduled(form)});
new MutationObserver(enhance).observe(app,{childList:true});
enhance();
