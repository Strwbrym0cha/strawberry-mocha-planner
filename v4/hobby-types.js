const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const TYPES=['creative','interactive','collecting'];

function inferType(h){
  if(TYPES.includes(text(h?.hobbyType)))return text(h.hobbyType);
  const s=`${text(h?.name)} ${text(h?.kind)} ${text(h?.notes)}`.toLowerCase();
  if(/funko|figure|collect|collection|cards?|plush|vinyl|memorabilia|doll/.test(s))return'collecting';
  if(/crochet|bracelet|bead|craft|cosplay|sew|knit|draw|paint|art|write|journal|design|photo|decor|make|diy/.test(s))return'creative';
  return'interactive';
}
function typeMeta(type){return type==='creative'?{icon:'🎨',label:'Creative',lane:'Creative Studio',blurb:'Make, build, decorate, draw, craft.'}:type==='collecting'?{icon:'🧸',label:'Collecting',lane:'Collection Cabinet',blurb:'Find, curate, display, and enjoy your treasures.'}:{icon:'🎮',label:'Interactive',lane:'Playground',blurb:'Play, practice, learn, explore, or participate.'}}
function activeHobbies(state){return list(state?.v4?.hobbies).filter(h=>!store.isArchived(state,'hobby',h.id))}
function hobbyById(state,id){return list(state?.v4?.hobbies).find(h=>String(h.id)===String(id))||null}
function normalizeTypes(){const state=clone(rt.getState());let changed=false;for(const h of list(state.v4?.hobbies)){if(!TYPES.includes(text(h.hobbyType))){h.hobbyType=inferType(h);changed=true}}if(changed){rt.setState(state,'Hobby types sorted 🎨');return true}return false}
function typeSelect(value='interactive'){return`<select name="hobbyType"><option value="creative" ${value==='creative'?'selected':''}>🎨 Creative</option><option value="interactive" ${value==='interactive'?'selected':''}>🎮 Interactive</option><option value="collecting" ${value==='collecting'?'selected':''}>🧸 Collecting</option></select>`}

function injectStyles(){if(document.getElementById('hobby-types-style'))return;const s=document.createElement('style');s.id='hobby-types-style';s.textContent=`
.hobby-type-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:850;margin-left:4px;background:#f6f0f5;color:#755965}.hobby-type-lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.hobby-type-lane{min-width:0;padding:11px;border:1px solid #ead9e1;border-radius:18px;background:#fffafd}.hobby-type-lane-head{margin-bottom:9px}.hobby-type-lane-head strong{display:block;font-family:var(--katos-title,Georgia,serif);font-weight:400;font-size:20px;color:#654650}.hobby-type-lane-head small{display:block;color:#927680;margin-top:2px;line-height:1.35}.hobby-type-lane .hobby-card-grid{grid-template-columns:1fr}.hobby-type-empty{padding:11px;border:1px dashed #e7d5dd;border-radius:13px;color:#9a7b87;background:#fff;font-size:10px}.hobby-card[data-hobby-type="collecting"] .hobby-meter{display:none}.hobby-card[data-hobby-type="collecting"]{background:linear-gradient(135deg,#fff,#fff9f1)}.hobby-card[data-hobby-type="creative"]{background:linear-gradient(135deg,#fff,#fff8fb)}.hobby-card[data-hobby-type="interactive"]{background:linear-gradient(135deg,#fff,#f9f8ff)}@media(max-width:980px){.hobby-type-lanes{grid-template-columns:1fr}}`;
document.head.appendChild(s)}

function enhanceForms(){
  const add=document.querySelector('[data-hobby-form="add"]');
  if(add&&!add.querySelector('[name="hobbyType"]')){const kind=[...add.querySelectorAll('.field')].find(x=>(x.querySelector('span')?.textContent||'').trim()==='Kind');const field=document.createElement('label');field.className='field';field.innerHTML=`<span>Hobby type</span>${typeSelect('creative')}`;if(kind)kind.before(field);else add.querySelector('.fields')?.appendChild(field)}
  const edit=document.querySelector('[data-hobby-modal-form="edit-hobby"]');
  if(edit&&!edit.querySelector('[name="hobbyType"]')){const h=hobbyById(rt.getState(),edit.dataset.id),kind=[...edit.querySelectorAll('label')].find(x=>(x.firstChild?.textContent||'').trim()==='Kind');const field=document.createElement('label');field.innerHTML=`Hobby type${typeSelect(inferType(h))}`;if(kind)kind.before(field);else edit.querySelector('.hobby-modal-fields')?.appendChild(field)}
}
function decorateCard(card,h){
  const type=inferType(h),meta=typeMeta(type);card.dataset.hobbyType=type;
  const badgeHost=card.querySelector('.hobby-card-copy');if(badgeHost&&!badgeHost.querySelector('.hobby-type-badge')){const badge=document.createElement('span');badge.className='hobby-type-badge';badge.textContent=`${meta.icon} ${meta.label}`;const status=badgeHost.querySelector('.hobby-badge');status?.insertAdjacentElement('afterend',badge)}
  if(type==='collecting'){
    const start=card.querySelector('[data-hobby-action="start"]');if(start)start.textContent='🧸 Collection time';
    const log=card.querySelector('[data-hobby-action="log"]');if(log)log.textContent='＋ Collection check-in';
    const win=card.querySelector('[data-hobby-action="win"]');if(win)win.textContent='✨ Collection win';
  }
}
function groupRotation(){
  const section=[...document.querySelectorAll('.main .page .card')].find(c=>(c.querySelector('.ey')?.textContent||'').includes('IN ROTATION'));
  if(!section||section.dataset.hobbyTypesGrouped)return;
  const original=section.querySelector(':scope > .hobby-card-grid');if(!original)return;
  const state=rt.getState(),cards=[...original.querySelectorAll(':scope > .hobby-card')];
  if(!cards.length)return;
  const lanes=document.createElement('div');lanes.className='hobby-type-lanes';
  for(const type of TYPES){const meta=typeMeta(type),lane=document.createElement('div');lane.className='hobby-type-lane';lane.dataset.hobbyLane=type;lane.innerHTML=`<div class="hobby-type-lane-head"><strong>${meta.icon} ${meta.lane}</strong><small>${meta.blurb}</small></div><div class="hobby-card-grid"></div>`;lanes.appendChild(lane)}
  for(const card of cards){const id=card.querySelector('[data-hobby-action][data-id]')?.dataset.id,h=hobbyById(state,id);if(!h)continue;decorateCard(card,h);lanes.querySelector(`[data-hobby-lane="${inferType(h)}"] .hobby-card-grid`)?.appendChild(card)}
  for(const lane of lanes.querySelectorAll('.hobby-type-lane')){const grid=lane.querySelector('.hobby-card-grid');if(!grid.children.length)grid.innerHTML='<div class="hobby-type-empty">Nothing living here yet.</div>'}
  original.replaceWith(lanes);section.dataset.hobbyTypesGrouped='1';
}
function decorateOtherCards(){const state=rt.getState();document.querySelectorAll('.hobby-card:not([data-hobby-type])').forEach(card=>{const id=card.querySelector('[data-hobby-action][data-id]')?.dataset.id,h=hobbyById(state,id);if(h)decorateCard(card,h)})}
function enhanceShelf(){injectStyles();if(!document.querySelector('.nav-btn.active[data-view="hobbies"]'))return;if(normalizeTypes())return;enhanceForms();groupRotation();decorateOtherCards()}

function saveAdd(form){const fd=new FormData(form),state=clone(rt.getState());state.v4={...(state.v4||{}),hobbies:list(state.v4?.hobbies)};state.v4.hobbies.push({id:makeId('hobby'),name:text(fd.get('name'))||'Hobby',status:['playing','curious','shelf'].includes(text(fd.get('status')))?text(fd.get('status')):'playing',hobbyType:TYPES.includes(text(fd.get('hobbyType')))?text(fd.get('hobbyType')):'creative',kind:text(fd.get('kind'))||'general',language:text(fd.get('language'))==='true',notes:text(fd.get('notes')),lastTouched:'',createdAt:new Date().toISOString()});rt.setState(state,'Added to Hobby Shelf 🎨')}
function saveEdit(form){const fd=new FormData(form),state=clone(rt.getState()),h=hobbyById(state,form.dataset.id);if(!h)return;h.name=text(fd.get('name'))||h.name;h.status=['playing','curious','shelf'].includes(text(fd.get('status')))?text(fd.get('status')):'playing';h.hobbyType=TYPES.includes(text(fd.get('hobbyType')))?text(fd.get('hobbyType')):inferType(h);h.kind=text(fd.get('kind'));h.language=text(fd.get('language'))==='true';h.notes=text(fd.get('notes'));h.updatedAt=new Date().toISOString();document.getElementById('hobby-modal')?.remove();rt.setState(state,'Hobby updated ✨')}

function pickerCandidates(state){const active=activeHobbies(state),doable=active.filter(h=>inferType(h)!=='collecting'),playing=doable.filter(h=>h.status==='playing');if(playing.length)return playing;const curious=doable.filter(h=>h.status==='curious');if(curious.length)return curious;const fallback=active.filter(h=>h.status==='playing'||h.status==='curious');return fallback}
function chooseHobby(state,avoid=''){const base=pickerCandidates(state),pool=base.filter(h=>String(h.id)!==String(avoid)),source=pool.length?pool:base;return source.length?source[Math.floor(Math.random()*source.length)]:null}
function pickOne(){const state=clone(rt.getState()),prior=state.v4?.hobbyPick?.hobbyId,h=chooseHobby(state,prior);if(!h){alert('Add at least one hobby to In rotation or Wanna try first.');return}state.v4.hobbyPick={hobbyId:h.id,pickedAt:new Date().toISOString()};rt.setState(state,`The dice picked ${h.name} 🎲`)}
function addConversationTurn(state,role,message,meta={}){state.mochini={...(state.mochini||{}),conversation:[...list(state.mochini?.conversation),{id:makeId('turn'),role,text:message,at:new Date().toISOString(),meta}].slice(-100)};return state}
function boredCommand(raw){return /^(?:i'?m|im|i am)?\s*bored[!.?]*$/i.test(text(raw))||/^(?:pick (?:a )?hobby for me|roll (?:the )?hobby dice|what hobby should i do|give me a hobby|roll again|another hobby|pick another one)[!.?]*$/i.test(text(raw))}
function handleBored(raw){let state=clone(rt.getState()),prior=/roll again|another hobby|pick another/i.test(raw)?state.v4?.hobbyPick?.hobbyId:'',h=chooseHobby(state,prior);state=addConversationTurn(state,'user',raw);if(!h){state=addConversationTurn(state,'assistant','Your Hobby Shelf is empty enough to echo 😭 Add one Creative or Interactive hobby and I can roll the fun dice.',{conversation:true,topic:'hobbies'});rt.setState(state,'Mochini checked Hobby Shelf');return}state.v4.hobbyPick={hobbyId:h.id,pickedAt:new Date().toISOString()};const meta=typeMeta(inferType(h));state=addConversationTurn(state,'assistant',`Hobby dice says ${meta.icon} ${h.name}. That’s in your ${meta.label.toLowerCase()} lane, so it actually counts as something you can go do right now. I put it on Hobby Shelf if you want to start. 🎲`,{conversation:true,topic:'hobbies',hobbyId:h.id});rt.setState(state,`Mochini picked ${h.name} 🎲`)}

document.addEventListener('submit',e=>{const add=e.target.closest?.('[data-hobby-form="add"]');if(add&&add.querySelector('[name="hobbyType"]')){e.preventDefault();e.stopImmediatePropagation();saveAdd(add);return}const edit=e.target.closest?.('[data-hobby-modal-form="edit-hobby"]');if(edit&&edit.querySelector('[name="hobbyType"]')){e.preventDefault();e.stopImmediatePropagation();saveEdit(edit);return}const chat=e.target.closest?.('form[data-form="mochini"]');if(chat){const raw=text(new FormData(chat).get('message'));if(boredCommand(raw)){e.preventDefault();e.stopImmediatePropagation();handleBored(raw)}}},true);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-hobby-action="pick"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();pickOne()},true);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhanceShelf()})};new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});schedule();
