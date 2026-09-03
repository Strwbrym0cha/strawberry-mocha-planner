import{loadV5Ui,saveV5Ui,saveV5DailyNote,saveV5RoomDetail,snapshotV4}from'./data.js?v=5.0.8-all-room-details';
import{renderBoss}from'./boss.js?v=5.0.0-preview.2';
import{renderRoom}from'./rooms.js?v=5.0.8-all-room-details';

const app=document.getElementById('app');
const ui=loadV5Ui();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

const NAV=[['',[
  ['home','🌸','Home'],['time','😎','Plannin'],['tasks','😩','To-dos'],['mochini','🍡','Mochini'],['pings','🚨','Remember'],['review','🪷','Daily note'],
  ['routines','🍓','Routines'],['motion','🌿','Get movin'],['people','💕','My loves'],['hobbies','🎨','Hobby Shelf'],
  ['boss','💼','Boss Bitch'],['money','☕','Money Café'],['study','🎓','Study Nook'],
  ['growth','🌱','Growth'],['dump','🧠','Brain dump'],['archive','📦','Memory Box'],['settings','⚙️','Settings']
]]];
const LABELS=Object.fromEntries(NAV.flatMap(([,items])=>items.map(([id,,label])=>[id,label])));

function sidebar(){const items=NAV.flatMap(([,groupItems])=>groupItems);return`<aside class="sidebar ${ui.sidebarOpen?'open':''}"><div class="brand"><div class="brand-row"><div class="berry">🍓</div><div><h1>KatOS V5</h1><div class="scribble">pretty, smart, and nosy enough</div></div></div><span class="build">PREVIEW · 5.0.8</span></div><nav class="nav">${items.map(([id,icon,label])=>`<button type="button" class="nav-btn ${ui.view===id?'active':''}" data-view="${id}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join('')}</nav><div class="sidebar-foot"><b>V5 Preview</b><br>Minimal rooms. V4 data is read-only here. 🔒</div></aside>${ui.sidebarOpen?'<button type="button" class="sidebar-backdrop" data-action="close-sidebar" aria-label="Close navigation"></button>':''}`}
function topbar(){return`<header class="topbar"><button type="button" class="btn menu" data-action="toggle-sidebar">☰</button><div class="top-title">${esc(LABELS[ui.view]||'KatOS V5')}</div><div class="top-spacer"></div><div class="mode-switch" aria-label="Energy mode"><button type="button" class="mode-btn ${ui.mode==='normal'?'active':''}" data-mode="normal">🍓 <span>Normal</span></button><button type="button" class="mode-btn ${ui.mode==='tiny'?'active':''}" data-mode="tiny">🫧 <span>Tiny</span></button><button type="button" class="mode-btn ${ui.mode==='power'?'active':''}" data-mode="power">⚡ <span>Power</span></button></div></header>`}
function render(){const oldSidebar=app.querySelector('.sidebar'),scrollTop=oldSidebar?.scrollTop||0,scrollLeft=oldSidebar?.scrollLeft||0,snapshot=snapshotV4(),content=ui.view==='boss'?renderBoss(snapshot,ui.bossLane):renderRoom(ui.view,snapshot);document.body.className=`mode-${ui.mode}`;app.className='katos';app.innerHTML=`${sidebar()}${topbar()}<main class="main">${content}</main>`;const newSidebar=app.querySelector('.sidebar');if(newSidebar){newSidebar.scrollTop=scrollTop;newSidebar.scrollLeft=scrollLeft}}
function persist(){saveV5Ui(ui)}
function chooseView(view){if(!LABELS[view])return;ui.view=view;ui.sidebarOpen=false;persist();render()}

app.addEventListener('click',event=>{
  const view=event.target.closest?.('[data-view]');if(view&&app.contains(view)){chooseView(view.dataset.view);return}
  const mode=event.target.closest?.('[data-mode]');if(mode&&app.contains(mode)){ui.mode=mode.dataset.mode;persist();render();return}
  const lane=event.target.closest?.('[data-boss-lane]');if(lane&&app.contains(lane)){ui.bossLane=lane.dataset.bossLane==='gig'?'gig':'rbt';persist();render();return}
  const action=event.target.closest?.('[data-action]');if(action&&app.contains(action)){if(action.dataset.action==='toggle-sidebar')ui.sidebarOpen=!ui.sidebarOpen;if(action.dataset.action==='close-sidebar')ui.sidebarOpen=false;render();return}
  const focus=event.target.closest?.('[data-focus]');if(focus&&app.contains(focus)){const target=focus.dataset.focus==='clients'?app.querySelector('#v5-client-roster'):app.querySelector('#v5-note-queue');target?.scrollIntoView({behavior:'smooth',block:'start'})}
});
app.addEventListener('submit',event=>{const form=event.target.closest?.('[data-daily-note-form]');if(!form||!app.contains(form))return;event.preventDefault();saveV5DailyNote(Object.fromEntries(new FormData(form)));render()});
app.addEventListener('submit',event=>{const form=event.target.closest?.('[data-room-detail-form]');if(!form||!app.contains(form))return;event.preventDefault();saveV5RoomDetail(form.dataset.roomDetail,Object.fromEntries(new FormData(form)));render()});
render();
