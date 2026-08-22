const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const store=window.__KATOS_V4_DEPS.store;
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();

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
function injectStyles(){
 if(document.getElementById('hobby-lanes-view-style'))return;
 const s=document.createElement('style');s.id='hobby-lanes-view-style';s.textContent=`
 .hobby-lanes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}
 .hobby-lane{min-width:0;padding:12px;border:1px solid #ead9e1;border-radius:18px;background:#fffafd}
 .hobby-lane-head{margin-bottom:9px}.hobby-lane-head strong{display:block;font-family:var(--katos-title,Georgia,serif);font-size:20px;font-weight:400;color:#654650}.hobby-lane-head small{display:block;margin-top:2px;color:#927680;line-height:1.35}
 .hobby-lane .hobby-card-grid{grid-template-columns:1fr}.hobby-lane-empty{padding:11px;border:1px dashed #e7d5dd;border-radius:13px;background:#fff;color:#9a7b87;font-size:10px}
 .hobby-type-chip{display:inline-flex;align-items:center;padding:4px 7px;border-radius:999px;margin-left:4px;background:#f6f0f5;color:#755965;font-size:9px;font-weight:850}
 .hobby-card[data-safe-lane="collecting"] .hobby-meter{display:none}.hobby-card[data-safe-lane="collecting"]{background:linear-gradient(135deg,#fff,#fff9f1)}.hobby-card[data-safe-lane="creative"]{background:linear-gradient(135deg,#fff,#fff8fb)}.hobby-card[data-safe-lane="interactive"]{background:linear-gradient(135deg,#fff,#f9f8ff)}
 @media(max-width:980px){.hobby-lanes{grid-template-columns:1fr}}
 `;document.head.appendChild(s);
}
function kindSelect(value){const lane=['creative','interactive','collecting'].includes(value)?value:'creative';return`<select name="kind"><option value="creative" ${lane==='creative'?'selected':''}>🎨 Creative</option><option value="interactive" ${lane==='interactive'?'selected':''}>🎮 Interactive</option><option value="collecting" ${lane==='collecting'?'selected':''}>🧸 Collecting</option></select>`}
function replaceKindFields(){
 const add=document.querySelector('[data-hobby-form="add"]');
 const addInput=add?.querySelector('[name="kind"]');
 if(addInput&&addInput.tagName!=='SELECT'){
  const field=addInput.closest('.field');if(field){const span=field.querySelector('span');if(span)span.textContent='Hobby type';addInput.outerHTML=kindSelect('creative')}
 }
 const edit=document.querySelector('[data-hobby-modal-form="edit-hobby"]');
 const editInput=edit?.querySelector('[name="kind"]');
 if(editInput&&editInput.tagName!=='SELECT'){
  const h=hobbyById(rt.getState(),edit.dataset.id),label=editInput.closest('label');if(label){for(const node of [...label.childNodes])if(node.nodeType===3&&node.textContent.trim()){node.textContent='Hobby type';break}editInput.outerHTML=kindSelect(inferLane(h))}
 }
}
function decorateCard(card,h){
 const lane=inferLane(h),meta=LANES[lane];card.dataset.safeLane=lane;
 const host=card.querySelector('.hobby-card-copy');
 if(host&&!host.querySelector('.hobby-type-chip')){const chip=document.createElement('span');chip.className='hobby-type-chip';chip.textContent=`${meta.icon} ${meta.label}`;const status=host.querySelector('.hobby-badge');status?.insertAdjacentElement('afterend',chip)}
 if(lane==='collecting'){
  const start=card.querySelector('[data-hobby-action="start"]');if(start)start.textContent='🧸 Collection time';
  const log=card.querySelector('[data-hobby-action="log"]');if(log)log.textContent='＋ Collection check-in';
  const win=card.querySelector('[data-hobby-action="win"]');if(win)win.textContent='✨ Collection win';
 }
}
function groupRotation(){
 const section=[...document.querySelectorAll('.main .page .card')].find(c=>(c.querySelector('.ey')?.textContent||'').includes('IN ROTATION'));
 if(!section||section.dataset.safeHobbyLanes)return false;
 const original=section.querySelector(':scope > .hobby-card-grid');if(!original)return false;
 const cards=[...original.querySelectorAll(':scope > .hobby-card')];if(!cards.length)return false;
 const state=rt.getState(),wrap=document.createElement('div');wrap.className='hobby-lanes';
 for(const [key,meta] of Object.entries(LANES)){const lane=document.createElement('div');lane.className='hobby-lane';lane.dataset.lane=key;lane.innerHTML=`<div class="hobby-lane-head"><strong>${meta.icon} ${meta.title}</strong><small>${meta.blurb}</small></div><div class="hobby-card-grid"></div>`;wrap.appendChild(lane)}
 for(const card of cards){const id=card.querySelector('[data-hobby-action][data-id]')?.dataset.id,h=hobbyById(state,id);if(!h)continue;decorateCard(card,h);wrap.querySelector(`[data-lane="${inferLane(h)}"] .hobby-card-grid`)?.appendChild(card)}
 for(const lane of wrap.querySelectorAll('.hobby-lane')){const grid=lane.querySelector('.hobby-card-grid');if(!grid.children.length)grid.innerHTML='<div class="hobby-lane-empty">Nothing living here yet.</div>'}
 original.replaceWith(wrap);section.dataset.safeHobbyLanes='1';return true;
}
function decorateOtherCards(){const state=rt.getState();document.querySelectorAll('.hobby-card:not([data-safe-lane])').forEach(card=>{const id=card.querySelector('[data-hobby-action][data-id]')?.dataset.id,h=hobbyById(state,id);if(h)decorateCard(card,h)})}
function refresh(){
 injectStyles();
 if(!document.querySelector('.nav-btn.active[data-view="hobbies"]'))return false;
 replaceKindFields();
 const grouped=groupRotation();decorateOtherCards();return grouped;
}
let tries=0;const boot=()=>{if(refresh()||tries++>30)return;setTimeout(boot,100)};boot();
const observer=new MutationObserver(()=>{if(document.querySelector('.nav-btn.active[data-view="hobbies"]'))requestAnimationFrame(refresh)});observer.observe(document.getElementById('app'),{childList:true,subtree:true});
