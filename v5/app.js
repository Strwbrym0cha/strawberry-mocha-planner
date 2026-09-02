import{loadV5Ui,saveV5Ui,saveV5DailyNote,saveV5RoomDetail,saveV5LedgerEntry,removeV5LedgerEntry,saveV5Workspace,snapshotV4,migrateV4ToV5,restoreCloudV4Data,importV4Export}from'./data.js?v=5.0.13-editable-workspaces';
import{renderBoss}from'./boss.js?v=5.0.13-editable-workspaces';
import{renderRoom}from'./rooms.js?v=5.0.13-editable-workspaces';

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
function render(){const oldSidebar=app.querySelector('.sidebar'),scrollTop=oldSidebar?.scrollTop||0,scrollLeft=oldSidebar?.scrollLeft||0,snapshot=snapshotV4(),content=ui.view==='boss'?renderBoss(snapshot,ui.bossLane):renderRoom(ui.view,snapshot,{scheduleView:ui.scheduleView});document.body.className=`mode-${ui.mode}`;app.className='katos';app.innerHTML=`${sidebar()}${topbar()}<main class="main">${content}</main>`;const newSidebar=app.querySelector('.sidebar');if(newSidebar){newSidebar.scrollTop=scrollTop;newSidebar.scrollLeft=scrollLeft}}
function persist(){saveV5Ui(ui)}
function chooseView(view){if(!LABELS[view])return;ui.view=view;ui.sidebarOpen=false;persist();render()}

app.addEventListener('click',event=>{
  const view=event.target.closest?.('[data-view]');if(view&&app.contains(view)){chooseView(view.dataset.view);return}
  const mode=event.target.closest?.('[data-mode]');if(mode&&app.contains(mode)){ui.mode=mode.dataset.mode;persist();render();return}
  const lane=event.target.closest?.('[data-boss-lane]');if(lane&&app.contains(lane)){ui.bossLane=lane.dataset.bossLane==='gig'?'gig':'rbt';persist();render();return}
  const schedule=event.target.closest?.('[data-schedule-view]');if(schedule&&app.contains(schedule)){ui.scheduleView=['day','week','calendar'].includes(schedule.dataset.scheduleView)?schedule.dataset.scheduleView:'day';persist();render();return}
  const action=event.target.closest?.('[data-action]');if(action&&app.contains(action)){if(action.dataset.action==='toggle-sidebar')ui.sidebarOpen=!ui.sidebarOpen;if(action.dataset.action==='close-sidebar')ui.sidebarOpen=false;if(action.dataset.action==='reimport-v4'){if(window.confirm('Copy the current V4 snapshot into V5 again? Your current V5 data will be backed up first.'))migrateV4ToV5();render();return}if(action.dataset.action==='pick-v4-export'){app.querySelector('[data-v4-export-file]')?.click();return}if(action.dataset.action==='restore-cloud-v4'){action.disabled=true;action.textContent='☁️ Restoring your data…';restoreCloudV4Data().then(result=>{if(result.ok){window.alert('Your cloud planner data is now in V5.');location.reload()}else{window.alert(result.error||'Cloud restore did not finish.');render()}});return}render();return}
  const remove=event.target.closest?.('[data-ledger-remove]');if(remove&&app.contains(remove)){if(window.confirm('Remove this V5 ledger entry?')){removeV5LedgerEntry(remove.dataset.ledgerRemove);render()}return}
  const focus=event.target.closest?.('[data-focus]');if(focus&&app.contains(focus)){const target=focus.dataset.focus==='clients'?app.querySelector('#v5-client-roster'):app.querySelector('#v5-note-queue');target?.scrollIntoView({behavior:'smooth',block:'start'})}
  const detailOpen=event.target.closest?.('[data-detail-open]');if(detailOpen&&app.contains(detailOpen)){const modal=[...app.querySelectorAll('[data-detail-modal]')].find(node=>node.dataset.detailModal===detailOpen.dataset.detailOpen);if(modal){modal.hidden=false;modal.querySelector('select,input,textarea')?.focus()}return}
  const detailClose=event.target.closest?.('[data-detail-close]');if(detailClose&&app.contains(detailClose)){detailClose.closest('[data-detail-modal]')?.setAttribute('hidden','');return}
  if(event.target.matches?.('[data-detail-modal]')){event.target.setAttribute('hidden','');return}
});
app.addEventListener('keydown',event=>{if(event.key==='Escape'){app.querySelectorAll('[data-detail-modal]:not([hidden])').forEach(modal=>modal.setAttribute('hidden',''))}});
app.addEventListener('submit',event=>{const form=event.target.closest?.('[data-daily-note-form]');if(!form||!app.contains(form))return;event.preventDefault();const fields=Object.fromEntries(new FormData(form));saveV5DailyNote(fields);const result=saveV5Workspace('review',fields);if(!result.ok)window.alert(result.error||'Your daily note could not be saved.');render()});
app.addEventListener('submit',event=>{const form=event.target.closest?.('[data-room-detail-form]');if(!form||!app.contains(form))return;event.preventDefault();const fields=Object.fromEntries(new FormData(form));saveV5RoomDetail(form.dataset.roomDetail,fields);const view=form.dataset.roomDetail;const result=view==='money'?saveV5LedgerEntry({label:fields.entry,kind:{Spending:'expense',Income:'income',Transfer:'transfer',Bill:'expense',Savings:'transfer'}[fields.kind]||'expense',amount:fields.amount,date:fields.date,category:fields.category,account:fields.account,toAccount:fields.toAccount,note:fields.moneyNotes}):saveV5Workspace(view,fields);if(!result.ok){window.alert(result.error||'That could not be saved.');return}render()});
app.addEventListener('submit',event=>{const form=event.target.closest?.('[data-money-ledger-form]');if(!form||!app.contains(form))return;event.preventDefault();const result=saveV5LedgerEntry(Object.fromEntries(new FormData(form)));if(result.ok)render();else{const error=form.querySelector('.ledger-error');if(error)error.textContent=result.error}});
app.addEventListener('change',event=>{const input=event.target.closest?.('[data-v4-export-file]');const file=input?.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const result=importV4Export(String(reader.result||''));if(result.ok){window.alert(`Your V4 export is now loaded in V5 (${Number(result.counts?.total)||0} planner records).`);location.reload()}else window.alert(result.error||'That export could not be loaded.');};reader.readAsText(file);input.value=''});
render();
if(!snapshotV4().found)restoreCloudV4Data().then(result=>{if(result.ok)render()}).catch(()=>{});
