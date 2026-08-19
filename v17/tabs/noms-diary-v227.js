const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const list=value=>Array.isArray(value)?value:[];
const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const dateFromStamp=value=>{const d=new Date(value||Date.now());return Number.isNaN(d.getTime())?todayKey():`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const makeId=()=>`nomlog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const states=new WeakMap();
const subscribed=new WeakSet();

function style(){if(document.getElementById('sm-nom-diary-style'))return;const el=document.createElement('style');el.id='sm-nom-diary-style';el.textContent=`
.sm-nom-diary{margin-top:14px;padding:20px;border:1px solid #ead4dc;border-radius:25px;background:linear-gradient(135deg,#fff8fb,#fffdf9 58%,#f4faef);box-shadow:0 10px 28px rgba(103,73,65,.06)}
.sm-nom-diary-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}.sm-nom-diary h2{margin:3px 0}.sm-nom-diary small{color:#987c76}.sm-nom-diary-date{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.sm-nom-diary-date input{min-height:40px;padding:8px 10px;border:1px solid #e7bfd0;border-radius:13px;background:#fff;color:#674941}.sm-nom-diary-date button{min-height:40px;border-radius:13px}
.sm-nom-timeline{display:grid;gap:9px}.sm-nom-log{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:10px;align-items:center;padding:12px 13px;border:1px solid #eedce4;border-radius:17px;background:rgba(255,255,255,.85)}.sm-nom-log time{font-size:11px;font-weight:900;color:#b46884}.sm-nom-log b{display:block}.sm-nom-log small{display:block;margin-top:3px}.sm-nom-log button{width:32px;height:32px;padding:0;border:1px solid #efd1dd;border-radius:50%;background:#fff;color:#aa6f7f}.sm-nom-diary-empty{padding:16px;border:1px dashed #e8c3d1;border-radius:16px;text-align:center;color:#987c76;background:#fffafd}
@media(max-width:650px){.sm-nom-diary-head{flex-direction:column}.sm-nom-diary-date{width:100%}.sm-nom-diary-date input{flex:1}.sm-nom-log{grid-template-columns:58px minmax(0,1fr) auto}}
`;document.head.appendChild(el)}

function foodLabel(state,entry){const food=list(state?.noms?.foods).find(item=>String(item?.id)===String(entry?.nomId));return String(food?.name||entry?.text||entry?.label||'Nom').trim()||'Nom'}
function history(state){return list(state?.noms?.nomHistory)}

function ensureLogging(store){
 if(subscribed.has(store))return;subscribed.add(store);let writing=false;
 const sync=()=>{
  if(writing)return;const state=store.get?.()||{},noms=state.noms||{},current=noms.today;if(!current?.updatedAt)return;const logs=history(state);if(logs.some(entry=>String(entry?.sourceUpdatedAt||'')===String(current.updatedAt)))return;
  const createdAt=String(current.updatedAt||new Date().toISOString()),entry={id:makeId(),date:dateFromStamp(createdAt),nomId:current.nomId||null,text:String(current.text||''),createdAt,sourceUpdatedAt:createdAt};
  writing=true;store.update(s=>{const n=s.noms||{},existing=list(n.nomHistory);if(existing.some(item=>String(item?.sourceUpdatedAt||'')===String(createdAt)))return s;return{...s,noms:{...n,nomHistory:[...existing,entry]}}});writing=false;
 };
 store.subscribe?.(sync);sync();
}

function render(root,store){
 const host=root.querySelector('.sm-noms');if(!host)return;const model=states.get(root)||{date:todayKey()};states.set(root,model);let panel=root.querySelector('#sm-nom-diary');if(!panel){panel=document.createElement('section');panel.id='sm-nom-diary';panel.className='sm-nom-diary';const fridge=root.querySelector('.sm-noms-fridge');(fridge||host).insertAdjacentElement(fridge?'afterend':'beforeend',panel)}
 const state=store.get?.()||{},entries=history(state).filter(entry=>String(entry?.date||'')===String(model.date)).slice().sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
 const label=model.date===todayKey()?'Today':new Date(`${model.date}T12:00:00`).toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'});
 panel.innerHTML=`<div class="sm-nom-diary-head"><div><div class="v17-eyebrow">🍓 NOM DIARY</div><h2>What I ate ${model.date===todayKey()?'today':'that day'}</h2><small>Changing your current Nom adds a new entry instead of erasing the earlier ones.</small></div><div class="sm-nom-diary-date"><input type="date" data-nom-diary-date value="${esc(model.date)}"><button type="button" data-nom-diary-today>Today</button></div></div><div class="sm-nom-timeline">${entries.map(entry=>{const time=entry.createdAt?new Date(entry.createdAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';return `<article class="sm-nom-log"><time>${esc(time)}</time><span><b>🍱 ${esc(foodLabel(state,entry))}</b><small>${esc(label)}</small></span><button type="button" data-nom-log-delete="${esc(entry.id)}" aria-label="Delete diary entry">×</button></article>`}).join('')||'<div class="sm-nom-diary-empty">Nothing logged for this day yet. Your next Nom change will land here. 🍓</div>'}</div>`;
 panel.querySelector('[data-nom-diary-date]')?.addEventListener('change',event=>{model.date=event.target.value||todayKey();render(root,store)});
 panel.querySelector('[data-nom-diary-today]')?.addEventListener('click',()=>{model.date=todayKey();render(root,store)});
 panel.querySelectorAll('[data-nom-log-delete]').forEach(button=>button.addEventListener('click',()=>{const id=String(button.dataset.nomLogDelete);store.update(s=>({...s,noms:{...(s.noms||{}),nomHistory:list(s.noms?.nomHistory).filter(entry=>String(entry?.id)!==id)}}))}));
}

export function installNomDiary({root,store}){style();ensureLogging(store);let queued=false;const scan=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render(root,store)})};new MutationObserver(scan).observe(root,{childList:true,subtree:true});store.subscribe?.(scan);scan()}
