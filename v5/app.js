import{loadV5Ui,saveV5Ui,saveV5DailyNote,saveV5RoomDetail,saveV5LedgerEntry,saveV5Workspace,updateV5Record,archiveV5Record,openV5DayReview,snapshotV4,migrateV4ToV5,restoreCloudV4Data,importV4Export}from'./data.js?v=5.0.18-money-ledger-live';
import{renderBoss}from'./boss.js?v=5.0.18-money-ledger-live';
import{renderRoom}from'./rooms.js?v=5.0.18-money-ledger-live';

const app=document.getElementById('app');
const ui=loadV5Ui();
ui.scheduleView=ui.scheduleView||'day';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

const NAV=[['',[
  ['home','🌸','Home'],['time','🗓️','Schedule'],['boss','💼','Boss Bitch'],['money','☕','Money Café'],['tasks','😩','To-dos'],['mochini','🍡','Mochini'],['pings','🚨','Little Pings'],['review','🪷','Daily note'],
  ['routines','🍓','Routines'],['motion','🌿','Get movin'],['people','💕','My loves'],['hobbies','🎨','Hobby Shelf'],
  ['study','🎓','Study Nook'],
  ['growth','🌱','Growth'],['dump','🧠','Brain dump'],['archive','📦','Memory Box'],['settings','⚙️','Settings']
]]];
const LABELS=Object.fromEntries(NAV.flatMap(([,items])=>items.map(([id,,label])=>[id,label])));

function sidebar(){const items=NAV.flatMap(([,groupItems])=>groupItems);return`<aside class="sidebar ${ui.sidebarOpen?'open':''}"><div class="brand"><div class="brand-row"><div class="berry">🍓</div><div><h1>KatOS V5</h1><div class="scribble">pretty, smart, and nosy enough</div></div></div><span class="build">KatOS V5</span></div><nav class="nav">${items.map(([id,icon,label])=>`<button type="button" class="nav-btn ${ui.view===id?'active':''}" data-view="${id}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join('')}</nav><div class="sidebar-foot"><b>KatOS V5</b><br>Your personal planner. 🍓</div></aside>${ui.sidebarOpen?'<button type="button" class="sidebar-backdrop" data-action="close-sidebar" aria-label="Close navigation"></button>':''}`}
function topbar(){return`<header class="topbar"><button type="button" class="btn menu" data-action="toggle-sidebar">☰</button><div class="top-title">${esc(LABELS[ui.view]||'KatOS V5')}</div><div class="top-spacer"></div><div class="mode-switch" aria-label="Energy mode"><button type="button" class="mode-btn ${ui.mode==='normal'?'active':''}" data-mode="normal">🍓 <span>Normal</span></button><button type="button" class="mode-btn ${ui.mode==='tiny'?'active':''}" data-mode="tiny">🫧 <span>Tiny</span></button><button type="button" class="mode-btn ${ui.mode==='power'?'active':''}" data-mode="power">⚡ <span>Power</span></button></div></header>`}
function render(){const oldSidebar=app.querySelector('.sidebar'),scrollTop=oldSidebar?.scrollTop||0,scrollLeft=oldSidebar?.scrollLeft||0,snapshot=snapshotV4(),content=ui.view==='boss'?renderBoss(snapshot,ui.bossLane):renderRoom(ui.view,snapshot,{scheduleView:ui.scheduleView});document.body.className=`mode-${ui.mode}`;app.className='katos';app.innerHTML=`${sidebar()}${topbar()}<main class="main">${content}</main>`;[...app.querySelectorAll('a[href*="../v4"]')].forEach(link=>{const card=link.closest('.card');if(card&&card.querySelectorAll('a[href*="../v4"]').length===1&&card.querySelectorAll('.btn, a.quick-action').length===1)card.remove();else link.remove()});const newSidebar=app.querySelector('.sidebar');if(newSidebar){newSidebar.scrollTop=scrollTop;newSidebar.scrollLeft=scrollLeft}}
const titleCase=value=>String(value||'').replace(/([A-Z])/g,' $1').replace(/[_-]/g,' ').replace(/^./,letter=>letter.toUpperCase());
function unpackRecord(value){try{return JSON.parse(decodeURIComponent(escape(atob(value||''))))}catch{return null}}
const LIFE_AREAS=['Home','Work','Education','Money','Travel','Cats','Health & wellness','Relationships','Business','Creative projects','Shopping','Hobbies','Other'];
const MONEY_CATEGORIES=['Rent','Utilities','Phone & internet','Insurance','Debt','Subscription','Food','Transportation','Work expenses','Paycheck','Gig work','Savings','Shopping','Fun','Health','Cats','Other'];
function optionsFor(path,key,value){
  const byField={
    'life.tasks.priority':['Today','High','Soon','Normal','Whenever','Idea'],
    'life.tasks.pile':['Need to do today','Should do soon','Whenever','Idea'],
    'life.tasks.area':LIFE_AREAS,'life.events.area':LIFE_AREAS,'life.events.category':['Appointment','Work shift','School','Errand','Personal','Rest','Social','Other'],
    'life.reminders.category':LIFE_AREAS,'life.reminders.urgency':['Right now','Today','This week','Eventually','Just in case'],'life.reminders.timing':['Morning','Afternoon','Evening','A specific date','No preference'],'life.reminders.repeat':['Once','Daily','Weekly','Monthly','Never'],
    'life.routines.category':['Home','Health & wellness','Cats','Work','Education','Haircare','Other'],'life.routines.daypart':['Morning','Midday','Afternoon','Evening','Whenever'],'life.routines.recurrence':['daily','weekdays','selected','weekly','as-needed'],
    'movement.sessions.category':['Recovery','Mobility','Cardio','Strength','Pilates','Outside','Other'],'movement.sessions.effort':['Very gentle','Gentle','Moderate','Challenging','Not sure'],
    'v4.people.relationship':['Family','Friend','Romantic','Coworker','Professional'],'v4.people.category':['Family','Friends','Dating','Work people','Professional','Other'],'v4.people.contactMethod':['Text','Call','In person','Video chat','Ask them'],
    'education.items.category':['Coursework','Exam prep','Reading','Writing','Project','Administrative','Other'],'education.items.type':['Read','Watch','Practice','Write','Review','Study'],
    'growth.goals.area':['Health','Career','Home','Relationships','Self-trust'],'growth.goals.status':['moving','paused','complete'],
    'v4.brainDump.bucket':['Do','Decide','Remember','Feel','Let go','Unsorted'],'v4.brainDump.urgency':['Quiet','Low','Medium','Loud','Emergency'],
    'work.gigShifts.source':['DoorDash','Shipt','Uber Eats','Other gig work'],'work.gigShifts.status':['planned','completed','canceled'],
    'insights.dayReviews.mood':['Great','Good','Okay','Low','Overwhelmed'],'insights.dayReviews.sleepHours':['Under 4 hours','4–5 hours','6–7 hours','7–8 hours','8+ hours','Not sure'],'insights.dayReviews.sleepQuality':['Restless','Meh','Okay','Good','Really good'],'insights.dayReviews.energy':['Very low','Low','Medium','Good','High'],'insights.dayReviews.stress':['None','Low','Medium','High','Very high'],'insights.dayReviews.meds':['Taken','Need to take later','Skipped','Not applicable'],'insights.dayReviews.food':['Ate regularly','Ate something','Need something easy','Not sure yet'],'insights.dayReviews.movement':['Rest day','Gentle movement','Workout','Lots of movement'],'insights.dayReviews.social':['Needed quiet','A little connection','Social day','Social battery low']
  };
  let choices=byField[path+'.'+key]||((path.startsWith('money.')&&key==='category')?MONEY_CATEGORIES:[]);
  const current=String(value??'');if(current&&!choices.includes(current))choices=[current,...choices];
  return choices;
}
function recordField(path,key,value){
  const label=titleCase(key),locked=['id','createdAt','updatedAt','archivedAt','originalId'].includes(key);
  if(value&&typeof value==='object')return`<label class="daily-field daily-field-wide"><span>${esc(label)}</span><textarea name="${esc(key)}" rows="4" data-json ${locked?'readonly':''}>${esc(JSON.stringify(value,null,2))}</textarea></label>`;
  if(typeof value==='boolean')return`<label class="daily-field"><span>${esc(label)}</span><select name="${esc(key)}" ${locked?'disabled':''}><option value="true"${value?' selected':''}>Yes</option><option value="false"${!value?' selected':''}>No</option></select></label>`;
  if(typeof value==='number')return`<label class="daily-field"><span>${esc(label)}</span><input name="${esc(key)}" type="number" step="any" value="${esc(value)}" ${locked?'readonly':''}></label>`;
  const choices=optionsFor(path,key,value);
  if(choices.length&&!locked)return`<label class="daily-field"><span>${esc(label)}</span><select name="${esc(key)}"><option value="">Choose one</option>${choices.map(choice=>`<option value="${esc(choice)}"${String(value??'')===choice?' selected':''}>${esc(choice)}</option>`).join('')}</select></label>`;
  const long=/(notes?|what|helped|hard|win|focus|context|why|proof|boundary|steps|thought|description|plan)/i.test(key)||String(value||'').length>80;
  return long?`<label class="daily-field daily-field-wide"><span>${esc(label)}</span><textarea name="${esc(key)}" rows="3" ${locked?'readonly':''}>${esc(value??'')}</textarea></label>`:`<label class="daily-field"><span>${esc(label)}</span><input name="${esc(key)}" value="${esc(value??'')}" ${locked?'readonly':''}></label>`;
}
function openRecordEditor(path,record){
  if(!record?.id)return;
  app.querySelector('[data-record-modal]')?.remove();
  const title=record.title||record.text||record.name||record.label||'Saved entry';
  const fields=Object.keys(record).sort((a,b)=>a==='id'?-1:b==='id'?1:a.localeCompare(b)).map(key=>recordField(path,key,record[key])).join('');
  app.insertAdjacentHTML('beforeend',`<div class="detail-modal-backdrop" data-record-modal><section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="record-editor-title"><div class="detail-modal-head"><div><div class="ey">🍓 SAVED ENTRY</div><h2 id="record-editor-title">${esc(title)}</h2><p>Edit every detail that was saved with this entry, or archive it when you are done with it.</p></div><button type="button" class="detail-modal-close" data-record-close aria-label="Close editor">×</button></div><form class="room-detail-form" data-record-edit data-record-path="${esc(path)}" data-record-id="${esc(record.id)}"><div class="room-detail-fields">${fields}</div><div class="button-row daily-actions"><button type="submit" class="btn primary">🍓 Save changes</button><button type="button" class="btn soft" data-record-archive>📦 Archive entry</button><button type="button" class="btn soft" data-record-close>Close</button></div></form></section></div>`);
  app.querySelector('[data-record-modal] input:not([readonly]),[data-record-modal] textarea:not([readonly]),[data-record-modal] select:not([disabled])')?.focus();
}
function recordFormValues(form){
  const fields={};
  [...new FormData(form).entries()].forEach(([key,value])=>{
    const control=form.elements.namedItem(key);
    if(control?.dataset?.json){try{fields[key]=JSON.parse(value)}catch{fields[key]=value;return}}
    else if(control?.type==='number')fields[key]=value===''?'':Number(value);
    else if(value==='true'||value==='false')fields[key]=value==='true';
    else fields[key]=value;
  });
  return fields;
}
function persist(){saveV5Ui(ui)}
function chooseView(view){if(!LABELS[view])return;ui.view=view;ui.sidebarOpen=false;persist();render()}

app.addEventListener('click',event=>{
  const view=event.target.closest?.('[data-view]');if(view&&app.contains(view)){chooseView(view.dataset.view);return}
  const mode=event.target.closest?.('[data-mode]');if(mode&&app.contains(mode)){ui.mode=mode.dataset.mode;persist();render();return}
  const lane=event.target.closest?.('[data-boss-lane]');if(lane&&app.contains(lane)){ui.bossLane=lane.dataset.bossLane==='gig'?'gig':'rbt';persist();render();return}
  const schedule=event.target.closest?.('[data-schedule-view]');if(schedule&&app.contains(schedule)){ui.scheduleView=['day','week','calendar'].includes(schedule.dataset.scheduleView)?schedule.dataset.scheduleView:'day';persist();render();return}
  const logLedger=event.target.closest?.('[data-log-ledger]');if(logLedger&&app.contains(logLedger)){const source=unpackRecord(logLedger.dataset.logLedger);if(!source)return;const ledgerSourceId=['money.bills','money.subscriptions'].includes(source.path)?`${source.id}:${source.date}`:source.id;const result=saveV5LedgerEntry({label:source.label,kind:source.kind,amount:source.amount,date:source.date,category:source.category,sourceId:ledgerSourceId,sourceType:source.path});if(!result.ok){window.alert(result.error||'That could not be added to the ledger.');return}const now=new Date().toISOString();if(source.path==='money.bills')updateV5Record(source.path,source.id,{paid:true,lastPaidAt:now,lastPaidDueDate:source.date});if(source.path==='money.subscriptions')updateV5Record(source.path,source.id,{lastChargedAt:now,lastChargedAmount:source.amount});if(source.path==='money.earnings')updateV5Record(source.path,source.id,{status:'received',received:true,receivedAmount:source.amount,actualAmount:source.amount,receivedDate:source.date});if(source.path==='work.gigShifts')updateV5Record(source.path,source.id,{status:'completed',actualAmount:source.amount,completedAt:now});render();return}
  const recordNode=event.target.closest?.('[data-v5-record]');if(recordNode&&app.contains(recordNode)){const record=unpackRecord(recordNode.dataset.v5Record);if(record)openRecordEditor(recordNode.dataset.v5RecordPath,record);return}
  const reviewDay=event.target.closest?.('[data-v5-review-date]');if(reviewDay&&app.contains(reviewDay)){const result=openV5DayReview(reviewDay.dataset.v5ReviewDate);if(result.ok)openRecordEditor('insights.dayReviews',result.record);else window.alert(result.error||'That day review could not be opened.');return}
  const recordClose=event.target.closest?.('[data-record-close]');if(recordClose&&app.contains(recordClose)){recordClose.closest('[data-record-modal]')?.remove();return}
  const archive=event.target.closest?.('[data-record-archive]');if(archive&&app.contains(archive)){const form=archive.closest('[data-record-edit]');if(form&&window.confirm('Archive this entry? It will move to Memory Box, not be deleted.')){const result=archiveV5Record(form.dataset.recordPath,form.dataset.recordId);if(!result.ok)window.alert(result.error||'That entry could not be archived.');render()}return}
  const action=event.target.closest?.('[data-action]');if(action&&app.contains(action)){if(action.dataset.action==='toggle-sidebar')ui.sidebarOpen=!ui.sidebarOpen;if(action.dataset.action==='close-sidebar')ui.sidebarOpen=false;if(action.dataset.action==='reimport-v4'){if(window.confirm('Copy the current V4 snapshot into V5 again? Your current V5 data will be backed up first.'))migrateV4ToV5();render();return}if(action.dataset.action==='pick-v4-export'){app.querySelector('[data-v4-export-file]')?.click();return}if(action.dataset.action==='restore-cloud-v4'){action.disabled=true;action.textContent='☁️ Restoring your data…';restoreCloudV4Data().then(result=>{if(result.ok){window.alert('Your cloud planner data is now in V5.');location.reload()}else{window.alert(result.error||'Cloud restore did not finish.');render()}});return}render();return}
  const remove=event.target.closest?.('[data-ledger-remove]');if(remove&&app.contains(remove)){if(window.confirm('Remove this V5 ledger entry?')){removeV5LedgerEntry(remove.dataset.ledgerRemove);render()}return}
  const focus=event.target.closest?.('[data-focus]');if(focus&&app.contains(focus)){const target=focus.dataset.focus==='clients'?app.querySelector('#v5-client-roster'):app.querySelector('#v5-note-queue');target?.scrollIntoView({behavior:'smooth',block:'start'})}
  const detailOpen=event.target.closest?.('[data-detail-open]');if(detailOpen&&app.contains(detailOpen)){const modal=[...app.querySelectorAll('[data-detail-modal]')].find(node=>node.dataset.detailModal===detailOpen.dataset.detailOpen);if(modal){modal.hidden=false;modal.querySelector('select,input,textarea')?.focus()}return}
  const detailClose=event.target.closest?.('[data-detail-close]');if(detailClose&&app.contains(detailClose)){detailClose.closest('[data-detail-modal]')?.setAttribute('hidden','');return}
  if(event.target.matches?.('[data-detail-modal]')){event.target.setAttribute('hidden','');return}
});
app.addEventListener('keydown',event=>{if(event.key==='Escape'){app.querySelectorAll('[data-detail-modal]:not([hidden])').forEach(modal=>modal.setAttribute('hidden',''))}});
app.addEventListener('submit',event=>{const form=event.target.closest?.('[data-record-edit]');if(!form||!app.contains(form))return;event.preventDefault();const result=updateV5Record(form.dataset.recordPath,form.dataset.recordId,recordFormValues(form));if(!result.ok){window.alert(result.error||'That entry could not be saved.');return}render()});
app.addEventListener('submit',event=>{const form=event.target.closest?.('[data-daily-note-form]');if(!form||!app.contains(form))return;event.preventDefault();const fields=Object.fromEntries(new FormData(form));saveV5DailyNote(fields);const result=saveV5Workspace('review',fields);if(!result.ok)window.alert(result.error||'Your daily note could not be saved.');render()});
app.addEventListener('submit',event=>{const form=event.target.closest?.('[data-room-detail-form]');if(!form||!app.contains(form))return;event.preventDefault();const fields=Object.fromEntries(new FormData(form));saveV5RoomDetail(form.dataset.roomDetail,fields);const view=form.dataset.roomDetail;const result=view==='money'?saveV5LedgerEntry({label:fields.entry,kind:{Spending:'expense',Income:'income',Transfer:'transfer',Bill:'expense',Savings:'transfer'}[fields.kind]||'expense',amount:fields.amount,date:fields.date,category:fields.category,account:fields.account,toAccount:fields.toAccount,note:fields.moneyNotes}):saveV5Workspace(view,fields);if(!result.ok){window.alert(result.error||'That could not be saved.');return}render()});
app.addEventListener('submit',event=>{const form=event.target.closest?.('[data-money-ledger-form]');if(!form||!app.contains(form))return;event.preventDefault();const result=saveV5LedgerEntry(Object.fromEntries(new FormData(form)));if(result.ok)render();else{const error=form.querySelector('.ledger-error');if(error)error.textContent=result.error}});
app.addEventListener('change',event=>{const input=event.target.closest?.('[data-v4-export-file]');const file=input?.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const result=importV4Export(String(reader.result||''));if(result.ok){window.alert(`Your V4 export is now loaded in V5 (${Number(result.counts?.total)||0} planner records).`);location.reload()}else window.alert(result.error||'That export could not be loaded.');};reader.readAsText(file);input.value=''});
render();
if(!snapshotV4().found)restoreCloudV4Data().then(result=>{if(result.ok)render()}).catch(()=>{});
