const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const clone=v=>structuredClone(v);
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const makeId=p=>rt.makeId?rt.makeId(p):`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

const LANES={
 creative:{icon:'🎨',label:'Creative',title:'Creative Studio',blurb:'Make, build, decorate, craft, draw, design.'},
 interactive:{icon:'🎮',label:'Interactive',title:'Playground',blurb:'Play, practice, learn, explore, participate.'},
 collecting:{icon:'🧸',label:'Collecting',title:'Collection Cabinet',blurb:'Find, curate, display, hunt, and enjoy your treasures.'}
};
function activeHobbies(state){return list(state?.v4?.hobbies).filter(h=>!store.isArchived(state,'hobby',h.id))}
function hobbyById(state,id){return list(state?.v4?.hobbies).find(h=>String(h.id)===String(id))||null}
function inferLane(h){
 const raw=text(h?.kind).toLowerCase();
 if(raw==='creative'||raw==='interactive'||raw==='collecting')return raw;
 const s=`${text(h?.name)} ${raw} ${text(h?.notes)}`.toLowerCase();
 if(/funko|figure|collect|collection|card|plush|vinyl|memorabilia|doll|merch/.test(s))return'collecting';
 if(/crochet|bracelet|bead|craft|cosplay|sew|knit|draw|paint|art|write|journal|design|photo|decor|diy|make/.test(s))return'creative';
 return'interactive';
}
function pickerCandidates(state){
 const active=activeHobbies(state),doable=active.filter(h=>inferLane(h)!=='collecting');
 const playing=doable.filter(h=>h.status==='playing');if(playing.length)return playing;
 const curious=doable.filter(h=>h.status==='curious');if(curious.length)return curious;
 return active.filter(h=>h.status==='playing'||h.status==='curious');
}
function chooseHobby(state,avoid=''){const base=pickerCandidates(state),pool=base.filter(h=>String(h.id)!==String(avoid)),source=pool.length?pool:base;return source.length?source[Math.floor(Math.random()*source.length)]:null}

function injectStyles(){if(document.getElementById('hobby-lanes-style'))return;const s=document.createElement('style');s.id='hobby-lanes-style';s.textContent=`
.hobby-lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.hobby-lane{min-width:0;padding:12px;border:1px solid #ead9e1;border-radius:18px;background:#fffafd}.hobby-lane-head{margin-bottom:9px}.hobby-lane-head strong{display:block;font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400;color:#654650}.hobby-lane-head small{display:block;margin-top:2px;color:#927680;line-height:1.35}.hobby-lane .hobby-card-grid{grid-template-columns:1fr}.hobby-lane-empty{padding:11px;border:1px dashed #e7d5dd;border-radius:13px;background:#fff;color:#9a7b87;font-size:10px}.hobby-type-chip{display:inline-flex;align-items:center;padding:4px 7px;border-radius:999px;margin-left:4px;background:#f6f0f5;color:#755965;font-size:9px;font-weight:850}.hobby-card[data-safe-lane="collecting"] .hobby-meter{display:none}.hobby-card[data-safe-lane="collecting"]{background:linear-gradient(135deg,#fff,#fff9f1)}.hobby-card[data-safe-lane="creative"]{background:linear-gradient(135deg,#fff,#fff8fb)}.hobby-card[data-safe-lane="interactive"]{background:linear-gradient(135deg,#fff,#f9f8ff)}@media(max-width:980px){.hobby-lanes{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
function kindSelect(value){const lane=['creative','interactive','collecting'].includes(value)?value:'creative';return`<select name="kind"><option value="creative" ${lane==='creative'?'selected':''}>🎨 Creative</option><option value="interactive" ${lane==='interactive'?'selected':''}>🎮 Interactive</option><option value="collecting" ${lane==='collecting'?'selected':''}>🧸 Collecting</option></select>`}
function replaceKindField(){
 const add=document.querySelector('[data-hobby-form="add"]');
 if(add){const input=add.querySelector('[name="kind"]');if(input&&input.tagName!=='SELECT'){const field=input.closest('.field');if(field){field.querySelector('span').textContent='Hobby type';input.outerHTML=kindSelect('creative')}}}
 const edit=document.querySelector('[data-hobby-modal-form="edit-hobby"]');
 if(edit){const input=edit.querySelector('[name="kind"]');if(input&&input.tagName!=='SELECT'){const h=hobbyById(rt.getState(),edit.dataset.id),label=input.closest('label');if(label){label.firstChild.textContent='Hobby type';input.outerHTML=kindSelect(inferLane(h))}}}
}
function decorateCard(card,h){const lane=inferLane(h),meta=LANES[lane];card.dataset.safeLane=lane;const host=card.querySelector('.hobby-card-copy');if(host&&!host.querySelector('.hobby-type-chip')){const chip=document.createElement('span');chip.className='hobby-type-chip';chip.textContent=`${meta.icon} ${meta.label}`;host.querySelector('.hobby-badge')?.insertAdjacentElement('afterend',chip)}if(lane==='collecting'){const start=card.querySelector('[data-hobby-action="start"]');if(start)start.textContent='🧸 Collection time';const log=card.querySelector('[data-hobby-action="log"]');if(log)log.textContent='＋ Collection check-in';const win=card.querySelector('[data-hobby-action="win"]');if(win)win.textContent='✨ Collection win'}}
function groupRotation(){
 const section=[...document.querySelectorAll('.main .page .card')].find(c=>(c.querySelector('.ey')?.textContent||'').includes('IN ROTATION'));
 if(!section||section.dataset.safeHobbyLanes)return;
 const original=section.querySelector(':scope > .hobby-card-grid');if(!original)return;
 const cards=[...original.querySelectorAll(':scope > .hobby-card')];if(!cards.length)return;
 const state=rt.getState(),wrap=document.createElement('div');wrap.className='hobby-lanes';
 for(const [key,meta] of Object.entries(LANES)){const lane=document.createElement('div');lane.className='hobby-lane';lane.dataset.lane=key;lane.innerHTML=`<div class="hobby-lane-head"><strong>${meta.icon} ${meta.title}</strong><small>${meta.blurb}</small></div><div class="hobby-card-grid"></div>`;wrap.appendChild(lane)}
 for(const card of cards){const id=card.querySelector('[data-hobby-action][data-id]')?.dataset.id,h=hobbyById(state,id);if(!h)continue;decorateCard(card,h);wrap.querySelector(`[data-lane="${inferLane(h)}"] .hobby-card-grid`)?.appendChild(card)}
 for(const lane of wrap.querySelectorAll('.hobby-lane')){const grid=lane.querySelector('.hobby-card-grid');if(!grid.children.length)grid.innerHTML='<div class="hobby-lane-empty">Nothing living here yet.</div>'}
 original.replaceWith(wrap);section.dataset.safeHobbyLanes='1';
}
function decorateOtherCards(){const state=rt.getState();document.querySelectorAll('.hobby-card:not([data-safe-lane])').forEach(card=>{const id=card.querySelector('[data-hobby-action][data-id]')?.dataset.id,h=hobbyById(state,id);if(h)decorateCard(card,h)})}
function refresh(){injectStyles();if(!document.querySelector('.nav-btn.active[data-view="hobbies"]'))return;replaceKindField();groupRotation();decorateOtherCards()}

function pickOne(){const state=clone(rt.getState()),prior=state.v4?.hobbyPick?.hobbyId,h=chooseHobby(state,prior);if(!h){alert('Add at least one hobby to In rotation or Wanna try first.');return}state.v4.hobbyPick={hobbyId:h.id,pickedAt:new Date().toISOString()};rt.setState(state,`The dice picked ${h.name} 🎲`)}
function addTurn(state,role,message,meta={}){state.mochini={...(state.mochini||{}),conversation:[...list(state.mochini?.conversation),{id:makeId('turn'),role,text:message,at:new Date().toISOString(),meta}].slice(-100)};return state}
function boredCommand(raw){return /^(?:i'?m|im|i am)?\s*bored[!.?]*$/i.test(text(raw))||/^(?:pick (?:a )?hobby for me|roll (?:the )?hobby dice|what hobby should i do|give me a hobby|roll again|another hobby|pick another one)[!.?]*$/i.test(text(raw))}
function handleBored(raw){let state=clone(rt.getState()),prior=/roll again|another hobby|pick another/i.test(raw)?state.v4?.hobbyPick?.hobbyId:'',h=chooseHobby(state,prior);state=addTurn(state,'user',raw);if(!h){state=addTurn(state,'assistant','Your Hobby Shelf needs at least one Creative or Interactive hobby before I can roll the fun dice 😭',{conversation:true,topic:'hobbies'});rt.setState(state,'Mochini checked Hobby Shelf');return}state.v4.hobbyPick={hobbyId:h.id,pickedAt:new Date().toISOString()};const meta=LANES[inferLane(h)];state=addTurn(state,'assistant',`Hobby dice says ${meta.icon} ${h.name}. I picked from your do-something hobbies, so collecting only joins the dice if that is all you have available. 🎲`,{conversation:true,topic:'hobbies',hobbyId:h.id});rt.setState(state,`Mochini picked ${h.name} 🎲`)}

document.addEventListener('click',e=>{const b=e.target.closest?.('[data-hobby-action="pick"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();pickOne()},true);
document.addEventListener('submit',e=>{const chat=e.target.closest?.('form[data-form="mochini"]');if(!chat)return;const raw=text(new FormData(chat).get('message'));if(!boredCommand(raw))return;e.preventDefault();e.stopImmediatePropagation();handleBored(raw)},true);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})};new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});schedule();
