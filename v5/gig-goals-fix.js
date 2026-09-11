import{snapshotV4,selectV5MoneyGig,runV5MoneyGigAction,getGigGoalProgress}from'./data.js?v=7.0.9-phone-bootstrap-quota-safe';

const app=document.getElementById('app');
const text=value=>String(value??'').trim();
const money=value=>`$${(Number(value)||0).toFixed(2)}`;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(text(value));
const localDay=()=>{const d=new Date(),off=d.getTimezoneOffset();return new Date(d.getTime()-off*60000).toISOString().slice(0,10)};
function addDays(value,days){const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
function weekRange(value){const d=new Date(`${value}T12:00:00`),offset=(d.getDay()+6)%7,start=addDays(value,-offset);return[start,addDays(start,6)]}
function monthRange(value){const d=new Date(`${value}T12:00:00`),y=d.getFullYear(),m=d.getMonth();const start=`${y}-${String(m+1).padStart(2,'0')}-01`;const end=new Date(y,m+1,0,12).toISOString().slice(0,10);return[start,end]}
function periodLabel(value){return({day:'Daily',week:'Weekly',month:'Monthly',custom:'Custom'})[value]||'Gig'}
function dateLabel(progress){const {from,to}=progress?.range||{};if(!from)return'';if(from===to)return from;return`${from} → ${to}`}
function goalCard(){return[...app.querySelectorAll('.money-card')].find(card=>/TODAY'S GOAL/i.test(card.querySelector('.ey')?.textContent||''))||null}
function modalFor(id){return app.querySelector(`[data-money-modal="${CSS.escape(id)}"]`)}
function showModal(node){if(!node)return false;app.append(node);node.hidden=false;node.querySelector('input,select,textarea')?.focus();return true}
function normalizeDates(form){const period=form.elements.period?.value||'day',today=localDay(),startInput=form.elements.startDate,endInput=form.elements.endDate;let seed=validDate(startInput?.value)?startInput.value:today,start=seed,end=validDate(endInput?.value)?endInput.value:seed;if(period==='day'){start=seed;end=seed}else if(period==='week'){[start,end]=weekRange(seed)}else if(period==='month'){[start,end]=monthRange(seed)}else if(period==='custom'){if(!validDate(start)||!validDate(end))throw new Error('Choose both a start and end date for a custom goal.');if(end<start)throw new Error('The custom goal end date needs to be on or after the start date.')}if(startInput)startInput.value=start;if(endInput)endInput.value=end;return{period,start,end}}
function syncDates(form){try{normalizeDates(form)}catch{}}
function mountGoalList(){const card=goalCard();if(!card)return;card.querySelector('[data-gig-goal-saved-list]')?.remove();const snap=snapshotV4(),view=selectV5MoneyGig(snap.today),goals=(view.gig?.goals||[]).filter(row=>!row.archivedAt&&row.active!==false);const wrap=document.createElement('div');wrap.dataset.gigGoalSavedList='';wrap.className='gig-goal-saved-list';if(!goals.length){wrap.innerHTML='<p class="gig-goal-empty">No gig goals saved yet. Tap ＋ Goal to make one.</p>'}else{wrap.innerHTML=`<div class="gig-goal-list-title"><b>Saved goals</b><span>${goals.length}</span></div>${goals.map(goal=>{const progress=getGigGoalProgress(snap.state,goal.id,snap.today)||{goal,earned:0,remaining:Number(goal.targetAmount)||0,percent:0,range:{from:goal.startDate,to:goal.endDate}};return`<button type="button" class="gig-goal-row" data-gig-goal-edit="${esc(goal.id)}"><span><b>${esc(goal.name||`${periodLabel(goal.period)} gig goal`)}</b><small>${esc(periodLabel(goal.period))}${goal.platformId?' · one platform':''} · ${esc(dateLabel(progress))}</small></span><span class="gig-goal-row-progress"><strong>${progress.percent||0}%</strong><small>${money(progress.earned)} / ${money(goal.targetAmount)}</small></span></button>`}).join('')}`}
 const progress=card.querySelector('.money-progress.big');if(progress)progress.insertAdjacentElement('afterend',wrap);else card.append(wrap)}
function patchNewGoalForm(){const form=app.querySelector('[data-money-modal="new-gig-goal"] [data-money-form="gig-goal-save"]');if(!form)return;const target=form.elements.targetAmount;if(target&&Number(target.value)===0)target.value='';const name=form.elements.name;if(name&&!name.placeholder)name.placeholder='Ex: Make $100 today';syncDates(form)}

app?.addEventListener('click',event=>{
 const add=event.target.closest?.('[data-money-open="new-gig-goal"]');
 if(add&&app.contains(add)){event.preventDefault();event.stopImmediatePropagation();patchNewGoalForm();showModal(modalFor('new-gig-goal'));return}
 const edit=event.target.closest?.('[data-gig-goal-edit]');
 if(edit&&app.contains(edit)){event.preventDefault();event.stopImmediatePropagation();showModal(modalFor(`gig-goal-${edit.dataset.gigGoalEdit}`));return}
},true);

app?.addEventListener('change',event=>{
 const form=event.target.closest?.('[data-money-form="gig-goal-save"]');if(!form||!app.contains(form))return;
 if(event.target.name==='period'||event.target.name==='startDate')syncDates(form);
},true);

app?.addEventListener('submit',event=>{
 const form=event.target.closest?.('[data-money-form="gig-goal-save"]');if(!form||!app.contains(form))return;
 event.preventDefault();event.stopImmediatePropagation();
 try{
  const {period,start,end}=normalizeDates(form),data=new FormData(form),target=Number(data.get('targetAmount'));
  if(!Number.isFinite(target)||target<=0){window.alert('Give your gig goal a target above $0.');return}
  const name=text(data.get('name'))||`${periodLabel(period)} gig goal`;
  const result=runV5MoneyGigAction({type:'gig-goal-save',id:form.dataset.moneyId,name,period,targetAmount:target,startDate:start,endDate:end,platformId:text(data.get('platformId')),notes:text(data.get('notes'))});
  if(!result.ok){window.alert(result.error||'That gig goal could not be saved.');return}
  form.closest('[data-money-modal]')?.setAttribute('hidden','');
  document.querySelector('[data-view="boss"]')?.click();
  setTimeout(mountGoalList,50);
 }catch(error){window.alert(error?.message||'That gig goal could not be saved.')}
},true);

window.addEventListener('katos:rendered',()=>queueMicrotask(()=>{patchNewGoalForm();mountGoalList()}));
setTimeout(()=>{patchNewGoalForm();mountGoalList()},350);
