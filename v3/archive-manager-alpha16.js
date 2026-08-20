import{loadV3State,saveV3State,V3_BUILD}from'./app/schema.js?v=3.0.0-alpha.16.2';
import{archiveRefs,isArchived,archiveRecord,restoreRecord}from'./app/archive-policy.js?v=1';
const app=document.getElementById('app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=v=>Array.isArray(v)?v:[];
const title=x=>String(x?.title||x?.name||x?.text||x?.label||'Untitled').trim()||'Untitled';
let query='';
function rows(state){const groups=[
 ['task','📝 Sweet To-Dos',state.life?.tasks],
 ['thread','🧵 Threads / projects',state.life?.threads],
 ['routine','🔁 Routines',state.life?.routines],
 ['event','📅 Berry Busy items',state.life?.events],
 ['program','🎓 Study programs',state.education?.programs],
 ['course','📚 Courses',state.education?.courses],
 ['study-item','📖 Course work',state.education?.items],
 ['goal','🌱 Goals',state.growth?.goals],
 ['experiment','🔬 Experiments',state.growth?.experiments],
 ['win','🏆 Manual wins',state.growth?.wins],
 ['work-item','💼 Work Queue',state.work?.items],
 ['shift','🪪 Shifts',state.work?.shifts],
 ['training','🎓 Work training',state.work?.training],
 ['career','🌿 Career milestones',state.work?.career],
 ['nom-food','🍱 Saved Noms',state.nourish?.noms?.foods],
 ['nom-recipe','🥣 Recipes',state.nourish?.noms?.recipes],
 ['motion-recipe','🎀 Movement recipes',state.movement?.routines],
 ['motion-video','📺 Movement videos',state.movement?.videos]
 ];
 return groups.flatMap(([kind,label,items])=>list(items).map(item=>({kind,label,item,archived:isArchived(state,kind,item.id)})));
}
function applyNativeMirror(state,kind,id,archived){let next=structuredClone(state);if(kind==='thread')next.life.threads=list(next.life?.threads).map(x=>x.id===id?{...x,status:archived?'archived':x.status==='archived'?'active':x.status}:x);if(kind==='routine')next.life.routines=list(next.life?.routines).map(x=>x.id===id?{...x,archived}:x);return next}
function change(kind,id,archived){let state=loadV3State();state=archived?archiveRecord(state,kind,id):restoreRecord(state,kind,id);state=applyNativeMirror(state,kind,id,archived);saveV3State(state);renderManager();}
function renderManager(){const state=loadV3State(),all=rows(state),q=query.trim().toLowerCase(),filtered=q?all.filter(r=>`${r.label} ${title(r.item)}`.toLowerCase().includes(q)):all,active=filtered.filter(r=>!r.archived),archived=filtered.filter(r=>r.archived);let root=document.getElementById('katosArchiveManager');if(!root){root=document.createElement('section');root.id='katosArchiveManager';root.className='card full';const main=app?.querySelector('main');const firstCard=main?.querySelector('.card');if(firstCard)firstCard.before(root);else main?.appendChild(root)}root.innerHTML=`<div class="head"><div><div class="ey">📦 ARCHIVE MANAGER</div><h2>Clear the desk without deleting the history</h2><p>Archive removes an item from active KatOS views. Restore brings it back. Delete stays a separate action.</p></div><div class="count">${archiveRefs(state).length}</div></div><div class="fields"><label class="field wide"><span>Find something</span><input id="archiveManagerSearch" value="${esc(query)}" placeholder="Search tasks, projects, courses, goals..."></label></div><div class="grid" style="margin-top:12px"><section><div class="ey">ACTIVE · ${active.length}</div><div class="stack">${active.slice(0,120).map(r=>`<article class="panel"><b>${esc(r.label)}</b><small>${esc(title(r.item))}</small><div class="actions"><button class="btn tiny" data-archive-kind="${esc(r.kind)}" data-archive-id="${esc(r.item.id)}">📦 Archive</button></div></article>`).join('')||'<div class="empty">Nothing active matches.</div>'}</div></section><section><div class="ey">ARCHIVED · ${archived.length}</div><div class="stack">${archived.slice(0,120).map(r=>`<article class="panel"><b>${esc(r.label)}</b><small>${esc(title(r.item))}</small><div class="actions"><button class="btn tiny" data-restore-kind="${esc(r.kind)}" data-restore-id="${esc(r.item.id)}">↩ Restore</button></div></article>`).join('')||'<div class="empty">📦 Archive is empty.</div>'}</div></section></div><div class="note">Archive registry is part of your V3 state · ${esc(V3_BUILD)}.</div>`;
 root.querySelector('#archiveManagerSearch')?.addEventListener('input',e=>{query=e.target.value;renderManager()});root.querySelectorAll('[data-archive-kind]').forEach(b=>b.onclick=()=>change(b.dataset.archiveKind,b.dataset.archiveId,true));root.querySelectorAll('[data-restore-kind]').forEach(b=>b.onclick=()=>change(b.dataset.restoreKind,b.dataset.restoreId,false));}
let queued=false;const observer=new MutationObserver(()=>{if(document.getElementById('katosArchiveManager')||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(!document.getElementById('katosArchiveManager'))renderManager()})});if(app)observer.observe(app,{childList:true,subtree:true});renderManager();
