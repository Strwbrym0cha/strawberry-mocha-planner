const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const pathParts=p=>String(p).split('.');
const getAt=(root,path)=>pathParts(path).reduce((v,k)=>v?.[k],root);
const setAt=(root,path,value)=>{const bits=pathParts(path);let cur=root;for(let i=0;i<bits.length-1;i++){cur[bits[i]]=obj(cur[bits[i]]);cur=cur[bits[i]]}cur[bits.at(-1)]=value};

const DEFS={
 event:{label:'Calendar items',path:'life.events'},
 task:{label:'To-dos',path:'life.tasks'},
 reminder:{label:'Reminders',path:'life.reminders'},
 'day-review':{label:'Daily notes',path:'insights.dayReviews'},
 routine:{label:'Routines',path:'life.routines'},
 food:{label:'Saved Noms',path:'nourish.noms.foods'},
 recipe:{label:'Recipes',path:'nourish.noms.recipes'},
 grocery:{label:'Grocery items',path:'nourish.noms.groceries'},
 meal:{label:'Meal plans',path:'nourish.noms.mealPlan'},
 'nom-log':{label:'Nom diary',path:'nourish.noms.history'},
 sip:{label:'Sip diary',path:'nourish.sips.history'},
 'motion-session':{label:'Movement history',path:'movement.sessions'},
 'motion-recipe':{label:'Saved movement',path:'movement.routines'},
 'motion-video':{label:'Movement videos',path:'movement.videos'},
 'weigh-in':{label:'Weigh-ins',path:'movement.weighIns'},
 person:{label:'My loves',path:'v4.people'},
 hobby:{label:'Hobbies',path:'v4.hobbies'},
 'work-item':{label:'Work items',path:'work.items'},
 shift:{label:'Shifts',path:'work.shifts'},
 training:{label:'Training',path:'work.training'},
 career:{label:'Career goals',path:'work.career'},
 earning:{label:'Income',path:'money.earnings'},
 account:{label:'Accounts',path:'money.accounts'},
 bill:{label:'Bills',path:'money.bills',filter:r=>!r.linkedDebtId},
 debt:{label:'Debt',path:'money.debts'},
 spending:{label:'Spending',path:'money.spending'},
 savings:{label:'Savings goals',path:'money.savingsGoals'},
 wish:{label:'Wishlist',path:'v4.shopping'},
 program:{label:'Programs',path:'education.programs'},
 course:{label:'Courses',path:'education.courses'},
 'study-item':{label:'Study items',path:'education.items'},
 'study-session':{label:'Study sessions',path:'education.sessions'},
 'course-review':{label:'Course reviews',path:'education.reviews'},
 thread:{label:'Threads',path:'life.threads'},
 goal:{label:'Goals',path:'growth.goals'},
 win:{label:'Wins',path:'growth.wins'},
 experiment:{label:'Experiments',path:'growth.experiments'},
 dump:{label:'Brain dumps',path:'v4.brainDump'},
 admin:{label:'Life admin',path:'v4.admin'},
 'reset-session':{label:'Reset history',path:'insights.resetSessions'},
 observation:{label:'Observations',path:'insights.observations'}
};
const ROOMS={
 time:['event'],tasks:['task'],pings:['reminder'],review:['day-review'],routines:['routine'],
 noms:['food','recipe','grocery','meal','nom-log'],sips:['sip'],
 motion:['motion-session','motion-recipe','motion-video','weigh-in'],people:['person'],hobbies:['hobby'],
 boss:['work-item','shift','training','career'],money:['earning','account','bill','debt','spending','savings','wish'],
 study:['program','course','study-item','study-session','course-review'],threads:['thread'],growth:['goal','win','experiment'],
 dump:['dump'],admin:['admin'],reset:['reset-session'],patterns:['observation']
};
const labelFor=(r,i=0)=>text(r?.text||r?.title||r?.name||r?.label||r?.description||r?.date||r?.type)||`Item ${i+1}`;
const keyFor=(r,i)=>text(r?.id)||`@${i}`;
const findIndex=(rows,key)=>String(key).startsWith('@')?Number(String(key).slice(1)):rows.findIndex(r=>String(r?.id)===String(key));
const currentView=()=>document.querySelector('.nav-btn.active[data-view]')?.dataset.view||'';
const visibleRows=(state,kind)=>{const d=DEFS[kind];if(!d)return[];let rows=list(getAt(state,d.path));if(d.filter)rows=rows.filter(d.filter);return rows.filter(r=>!r?.id||!store.isArchived(state,kind,r.id))};

function injectStyle(){if(document.getElementById('record-tools-style'))return;const s=document.createElement('style');s.id='record-tools-style';s.textContent=`
.record-tools-manager{margin-top:2px}.record-tools-manager details>summary{cursor:pointer;font-weight:900;color:#7f5264;list-style:none}.record-tools-manager details>summary::-webkit-details-marker{display:none}.record-tools-manager details>summary:before{content:'🎛️ ';}.record-tools-group{margin-top:12px}.record-tools-group h3{font-family:var(--katos-title,Georgia,serif);font-weight:400;margin:0 0 7px;color:#654650}.record-tools-row{display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid #edd8e0;border-radius:14px;background:#fff}.record-tools-row+.record-tools-row{margin-top:6px}.record-tools-row>div:first-child{flex:1;min-width:0}.record-tools-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.record-tools-actions{display:flex;gap:5px;flex-wrap:wrap}.record-tools-modal{position:fixed;inset:0;z-index:140;background:rgba(38,27,33,.33);display:grid;place-items:center;padding:18px}.record-tools-dialog{width:min(760px,100%);max-height:90vh;overflow:auto;background:#fffdfd;border:1px solid #e7cfd8;border-radius:26px;padding:20px;box-shadow:0 30px 80px rgba(49,25,37,.24)}.record-tools-dialog h2{font-family:var(--katos-title,Georgia,serif);font-weight:400;margin:0 0 10px}.record-tools-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.record-tools-field{display:grid;gap:4px}.record-tools-field.wide{grid-column:1/-1}.record-tools-field>span{font-size:10px;font-weight:850;color:#795c64}.record-tools-field input,.record-tools-field textarea{width:100%;padding:10px 11px;border:1px solid #e6cdd6;border-radius:13px;background:#fff;font:inherit}.record-tools-field textarea{min-height:96px;resize:vertical}.record-tools-inline{display:inline-flex;gap:4px;margin-left:4px}.record-tools-archive-list{display:grid;gap:7px;margin-top:10px}@media(max-width:780px){.record-tools-fields{grid-template-columns:1fr}.record-tools-field.wide{grid-column:auto}.record-tools-row{align-items:flex-start;flex-direction:column}.record-tools-actions{width:100%}}
`;document.head.appendChild(s)}

const editorSkip=new Set(['id','createdAt','updatedAt','archivedAt','linkedBillId','linkedDebtId']);
const longKeys=/notes|note|summary|likes|gift|ingredients|steps|resources|attempts|milestones|links|snapshot|happened|proud|tomorrow|helped|hard|hypothesis|behavior/i;
const dateKeys=/^(date|dueDate|targetDate|expectedDate|receivedDate|waitUntil|expires|lastTouched|completedAt)$/i;
const timeKeys=/time|start|end/i;
function inputFor(k,v){const type=Array.isArray(v)?'array':v&&typeof v==='object'?'object':typeof v;const serialized=(type==='array'||type==='object')?JSON.stringify(v,null,2):String(v??'');const wide=type==='array'||type==='object'||longKeys.test(k)||serialized.length>70;let input='';if(type==='boolean')input=`<input data-record-field="${esc(k)}" data-value-type="boolean" type="checkbox" ${v?'checked':''}>`;else if(type==='number')input=`<input data-record-field="${esc(k)}" data-value-type="number" type="number" step="any" value="${esc(serialized)}">`;else if(type==='array'||type==='object'||wide)input=`<textarea data-record-field="${esc(k)}" data-value-type="${type}">${esc(serialized)}</textarea>`;else{const htmlType=dateKeys.test(k)?'date':timeKeys.test(k)&&/^\d\d:\d\d/.test(serialized)?'time':'text';input=`<input data-record-field="${esc(k)}" data-value-type="string" type="${htmlType}" value="${esc(serialized)}">`}return`<label class="record-tools-field ${wide?'wide':''}"><span>${esc(k.replace(/([A-Z])/g,' $1'))}</span>${input}</label>`}
function getRecord(state,kind,key){const d=DEFS[kind];const rows=list(getAt(state,d?.path));const i=findIndex(rows,key);return{d,rows,i,record:i>=0?rows[i]:null}}
function openEditor(kind,key){const state=rt.getState(),{record}=getRecord(state,kind,key);if(!record)return;document.getElementById('record-tools-modal')?.remove();const fields=Object.entries(record).filter(([k])=>!editorSkip.has(k)).map(([k,v])=>inputFor(k,v)).join('')||'<div class="note">This record has no editable fields.</div>';const modal=document.createElement('div');modal.id='record-tools-modal';modal.className='record-tools-modal';modal.innerHTML=`<div class="record-tools-dialog"><div class="ey">✏️ UNIVERSAL EDITOR</div><h2>${esc(labelFor(record))}</h2><p class="subtle">This edits the real V4 record. IDs and linkage keys stay protected.</p><form data-record-tools-form="edit" data-kind="${esc(kind)}" data-key="${esc(key)}"><div class="record-tools-fields">${fields}</div><div class="form-actions"><button class="btn primary">Save changes</button><button type="button" class="btn" data-record-tools-action="close">Cancel</button></div></form></div>`;document.body.appendChild(modal)}
function saveEditor(form){let state=clone(rt.getState());const kind=form.dataset.kind,key=form.dataset.key,{d,rows,i,record}=getRecord(state,kind,key);if(!record||i<0)return;const updated=clone(record);try{form.querySelectorAll('[data-record-field]').forEach(input=>{const k=input.dataset.recordField,t=input.dataset.valueType;if(t==='boolean')updated[k]=input.checked;else if(t==='number')updated[k]=Number(input.value)||0;else if(t==='array'||t==='object')updated[k]=input.value.trim()?JSON.parse(input.value):t==='array'?[]:{};else updated[k]=input.value})}catch(err){alert(`That JSON field needs valid JSON before I can save it.\n\n${err.message}`);return}updated.updatedAt=new Date().toISOString();if(kind==='debt')state=store.upsertDebt(state,updated);else if(kind==='bill'&&updated.linkedDebtId)state=store.syncDebtFromBill(state,updated.id,updated);else{rows[i]=updated;setAt(state,d.path,rows)}document.getElementById('record-tools-modal')?.remove();rt.setState(state,`${DEFS[kind]?.label||'Record'} updated`)}

function archiveRecord(kind,key){let state=clone(rt.getState());const {d,rows,i,record}=getRecord(state,kind,key);if(!record||i<0)return;if(kind==='bill'&&record.linkedDebtId){alert('This bill is generated from a debt. Archive or delete the debt record instead so the payment link stays correct.');return}const entry={id:makeId('archived-record'),kind,path:d.path,record:clone(record),archivedAt:new Date().toISOString(),extras:{}};if(kind==='debt'&&record.linkedBillId){const bills=list(state.money?.bills),bi=bills.findIndex(b=>String(b.id)===String(record.linkedBillId));if(bi>=0){entry.extras.linkedBill=clone(bills[bi]);bills.splice(bi,1);state.money.bills=bills}}rows.splice(i,1);setAt(state,d.path,rows);state.v4={...obj(state.v4),archivedRecords:[...list(state.v4?.archivedRecords),entry]};rt.setState(state,`${DEFS[kind]?.label||'Record'} archived`)}
function deleteRecord(kind,key){if(!confirm('Delete this for real? This cannot be restored from the V4 manager.'))return;let state=clone(rt.getState());const {d,rows,i,record}=getRecord(state,kind,key);if(!record||i<0)return;if(kind==='bill'&&record.linkedDebtId){alert('This bill belongs to a debt. Delete the debt instead so KatOS can clean up both records safely.');return}if(kind==='debt')state=store.removeDebt(state,record.id);else{rows.splice(i,1);setAt(state,d.path,rows);if(kind==='routine')state.life.routineInstances=list(state.life?.routineInstances).filter(x=>String(x.routineId)!==String(record.id))}rt.setState(state,`${DEFS[kind]?.label||'Record'} deleted`)}
function restoreMoved(id){const state=clone(rt.getState()),arch=list(state.v4?.archivedRecords),i=arch.findIndex(x=>String(x.id)===String(id));if(i<0)return;const entry=arch[i],d=DEFS[entry.kind]||{path:entry.path};const rows=list(getAt(state,d.path));rows.push(entry.record);setAt(state,d.path,rows);if(entry.kind==='debt'&&entry.extras?.linkedBill)state.money.bills=[...list(state.money?.bills),entry.extras.linkedBill];arch.splice(i,1);state.v4.archivedRecords=arch;rt.setState(state,'Archived record restored')}
function deleteMoved(id){if(!confirm('Delete this archived record forever?'))return;const state=clone(rt.getState());state.v4.archivedRecords=list(state.v4?.archivedRecords).filter(x=>String(x.id)!==String(id));rt.setState(state,'Archived record deleted forever')}

function attachInlineControls(){document.querySelectorAll('.row,.cardlet,.parity-detail').forEach(host=>{if(host.dataset.recordToolsInline)return;const anchor=host.querySelector('[data-kind][data-id]');if(!anchor)return;const kind=anchor.dataset.kind,id=anchor.dataset.id;if(!DEFS[kind]||!id)return;host.dataset.recordToolsInline='1';const holder=document.createElement('span');holder.className='record-tools-inline';if(!host.querySelector('[data-action="edit"],[data-record-tools-action="edit"]'))holder.insertAdjacentHTML('beforeend',`<button type="button" class="btn tiny" data-record-tools-action="edit" data-kind="${esc(kind)}" data-key="${esc(id)}">✏️</button>`);if(!host.querySelector('[data-action="archive"],[data-record-tools-action="archive"]'))holder.insertAdjacentHTML('beforeend',`<button type="button" class="btn tiny" data-record-tools-action="archive" data-kind="${esc(kind)}" data-key="${esc(id)}">📦</button>`);if(!host.querySelector('[data-action="delete"],[data-parity-action^="delete"],[data-record-tools-action="delete"]'))holder.insertAdjacentHTML('beforeend',`<button type="button" class="btn tiny danger" data-record-tools-action="delete" data-kind="${esc(kind)}" data-key="${esc(id)}">×</button>`);if(holder.children.length)host.appendChild(holder)})}
function managerGroup(state,kind){const d=DEFS[kind];if(!d)return'';const source=list(getAt(state,d.path));let rows=visibleRows(state,kind);return`<div class="record-tools-group"><h3>${esc(d.label)} · ${rows.length}</h3>${rows.map(r=>{const originalIndex=source.indexOf(r),key=keyFor(r,originalIndex);return`<div class="record-tools-row"><div><b>${esc(labelFor(r,originalIndex))}</b><span class="meta">${esc(kind)}</span></div><div class="record-tools-actions"><button class="btn tiny" data-record-tools-action="edit" data-kind="${esc(kind)}" data-key="${esc(key)}">✏️ Edit</button><button class="btn tiny" data-record-tools-action="archive" data-kind="${esc(kind)}" data-key="${esc(key)}">📦 Archive</button><button class="btn tiny danger" data-record-tools-action="delete" data-kind="${esc(kind)}" data-key="${esc(key)}">× Delete</button></div></div>`}).join('')||'<div class="subtle">Nothing active here.</div>'}</div>`}
function renderArchiveManager(state){const archived=list(state.v4?.archivedRecords);if(!archived.length)return'<div class="subtle">No universally archived records yet. Native Memory Box items still appear above.</div>';return`<div class="record-tools-archive-list">${archived.slice().reverse().map(a=>`<div class="record-tools-row"><div><b>${esc(labelFor(a.record))}</b><span class="meta">${esc(DEFS[a.kind]?.label||a.kind)} · ${new Date(a.archivedAt).toLocaleDateString()}</span></div><div class="record-tools-actions"><button class="btn tiny" data-record-tools-action="restore-moved" data-archive-id="${esc(a.id)}">↩ Restore</button><button class="btn tiny danger" data-record-tools-action="delete-moved" data-archive-id="${esc(a.id)}">× Delete forever</button></div></div>`).join('')}</div>`}
function renderManager(){attachInlineControls();if(document.querySelector('[data-record-tools-manager]'))return;const view=currentView(),state=rt.getState(),page=document.querySelector('.main .page');if(!page)return;if(view==='archive'){const grid=page.querySelector('.grid')||page;const section=document.createElement('section');section.className='card full record-tools-manager';section.dataset.recordToolsManager='1';section.innerHTML=`<div class="ey">🎛️ UNIVERSAL ARCHIVE</div><h2>Everything else you archived</h2><p>Records archived through the universal manager live here and can be restored.</p>${renderArchiveManager(state)}`;grid.appendChild(section);return}const kinds=ROOMS[view];if(!kinds?.length)return;const section=document.createElement('section');section.className='card full record-tools-manager';section.dataset.recordToolsManager='1';section.innerHTML=`<details><summary>Manage everything in this room</summary><p class="subtle" style="margin-top:6px">Safety net: every real record below has Edit, Archive, and Delete even if its pretty card forgot to include a button.</p>${kinds.map(k=>managerGroup(state,k)).join('')}</details>`;let grid=page.querySelector(':scope > .grid');if(!grid){grid=document.createElement('div');grid.className='grid';page.appendChild(grid)}grid.appendChild(section)}

// Safari/iPad can reset the viewport when V4 rebuilds #app. Capture the exact
// room-change position and restore it after layout settles instead of forcing 0.
let navSnapshot=null;
function captureNavigation(e){if(!e.target.closest?.('[data-view]'))return;const scroller=document.scrollingElement||document.documentElement;navSnapshot={x:window.scrollX,y:window.scrollY,scrollTop:scroller.scrollTop,navTop:document.querySelector('.nav')?.scrollTop||0,at:Date.now()}}
function restoreNavigation(){if(!navSnapshot)return;const s=navSnapshot,scroller=document.scrollingElement||document.documentElement;const apply=()=>{window.scrollTo(s.x,s.y);scroller.scrollTop=s.scrollTop;const nav=document.querySelector('.nav');if(nav)nav.scrollTop=s.navTop};apply();requestAnimationFrame(apply);setTimeout(apply,40);setTimeout(()=>{apply();if(navSnapshot===s)navSnapshot=null},140)}
document.addEventListener('click',captureNavigation,true);

let scheduled=false;const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;renderManager();restoreNavigation()})};
new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});
schedule();

document.addEventListener('click',e=>{const a=e.target.closest('[data-record-tools-action]');if(!a)return;e.preventDefault();e.stopPropagation();const action=a.dataset.recordToolsAction,kind=a.dataset.kind,key=a.dataset.key;if(action==='edit')openEditor(kind,key);else if(action==='archive')archiveRecord(kind,key);else if(action==='delete')deleteRecord(kind,key);else if(action==='close')document.getElementById('record-tools-modal')?.remove();else if(action==='restore-moved')restoreMoved(a.dataset.archiveId);else if(action==='delete-moved')deleteMoved(a.dataset.archiveId)});
document.addEventListener('submit',e=>{const form=e.target.closest('[data-record-tools-form="edit"]');if(!form)return;e.preventDefault();e.stopPropagation();saveEditor(form)});
