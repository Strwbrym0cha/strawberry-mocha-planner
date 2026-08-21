import{loadV3State,saveV3State}from'./app/schema.js?v=3.0.0-alpha.16.4-diaryguard';
import{normalizeNoms,logNom,todayNomLogs,deleteNomLog}from'./app/noms.js?v=3.0.0-alpha.16-stockguard';

const app=document.getElementById('app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentNoms=()=>normalizeNoms(loadV3State().nourish?.noms);
function stockLabel(item){if(!item.trackQuantity)return'';if(item.quantity<=0)return'OUT · 0 left';if(item.quantity<=item.lowAt)return`LOW · ${item.quantity} left`;return`${item.quantity} left`}
function setText(node,value){if(node&&node.textContent!==value)node.textContent=value}
function paintSavedFoods(noms=currentNoms()){
  for(const item of noms.foods){
    const toggle=document.querySelector(`[data-food-toggle="${CSS.escape(item.id)}"]`),row=toggle?.closest('.row');
    if(!row)continue;
    const info=row.querySelector('b')?.parentElement,icon=row.firstElementChild;
    let stock=info?.querySelector('.saved-nom-stock');
    if(item.trackQuantity){
      if(!stock&&info){stock=document.createElement('small');stock.className='saved-nom-stock';info.appendChild(stock)}
      setText(stock,`🧊 Stock · ${stockLabel(item)} · low at ${item.lowAt}`);
      stock?.classList.toggle('is-low',item.quantity>0&&item.quantity<=item.lowAt);
      stock?.classList.toggle('is-out',item.quantity<=0);
      setText(icon,item.quantity<=0?'📦':item.quantity<=item.lowAt?'🛒':'🧊');
      if(toggle){toggle.disabled=true;toggle.title='Quantity controls availability. Edit stock in Mini Fridge.';setText(toggle,item.quantity<=0?'OUT':item.quantity<=item.lowAt?`LOW · ${item.quantity}`:`${item.quantity} left`)}
      row.style.opacity=item.quantity<=0?'.62':'1';
    }else{
      stock?.remove();setText(icon,item.available?'🍓':'📦');
      if(toggle){toggle.disabled=false;toggle.title='';setText(toggle,item.available?'Available':'Unavailable')}
      row.style.opacity='';
    }
  }
}
function paintFridge(noms=currentNoms()){
  const card=document.getElementById('nomsMiniFridge');if(!card)return;
  for(const item of noms.foods){
    const input=card.querySelector(`[data-fridge-qty="${CSS.escape(item.id)}"]`),row=input?.closest('.fridge-item');if(!row)continue;
    if(input&&document.activeElement!==input)input.value=item.trackQuantity?item.quantity:'';
    const low=card.querySelector(`[data-fridge-low="${CSS.escape(item.id)}"]`);if(low&&document.activeElement!==low)low.value=item.trackQuantity?item.lowAt:1;
    row.classList.toggle('is-out',!item.available);row.classList.toggle('is-low',item.trackQuantity&&item.quantity>0&&item.quantity<=item.lowAt);
    const small=row.querySelector('b')?.parentElement?.querySelector('small');if(small){const tags=item.tags?.length?` · ${item.tags.join(', ')}`:'';setText(small,`${item.trackQuantity?stockLabel(item):item.available?'In · quantity not tracked':'Out · quantity not tracked'}${tags}`)}
  }
}
function diarySection(){return[...document.querySelectorAll('#app section')].find(section=>(section.querySelector('.ey')?.textContent||'').includes('CURRENT NOM + DIARY'))||null}
function paintDiary(noms=currentNoms()){
  const section=diarySection();if(!section)return;
  const heading=section.querySelector('h2');if(heading)setText(heading,noms.currentNom?`Currently: ${noms.currentNom.name}`:'Nothing marked current');
  const stack=section.querySelector('.stack');if(!stack)return;
  const diary=todayNomLogs(noms).slice().reverse();
  stack.innerHTML=diary.length?diary.map(x=>`<article class="row"><span>🍽</span><div><b>${esc(x.name)}</b><small>${esc(x.sourceType)} · ${esc(x.date)}</small></div><button class="delete" data-diary-delete="${esc(x.id)}">×</button></article>`).join(''):'<div class="empty">No Noms logged today.</div>';
}
function flash(button,label){if(!button)return;const old=button.textContent;button.textContent=label;button.disabled=true;setTimeout(()=>{if(button.isConnected){button.textContent=old;button.disabled=false}},900)}
function saveLiveNoms(noms){const state=loadV3State(),next=normalizeNoms(noms),saved=saveV3State({...state,nourish:{...state.nourish,noms:next}});window.__katOSV3=saved;window.dispatchEvent(new CustomEvent('katos:noms-stock-changed',{detail:{noms:saved.nourish?.noms||next}}));return normalizeNoms(saved.nourish?.noms||next)}
function removeOutRecommendation(id,item){if(item?.available)return;document.querySelectorAll(`[data-log-source="food:${CSS.escape(id)}"]`).forEach(button=>button.closest('.recommend-card')?.remove())}

document.addEventListener('click',event=>{
  const diaryDelete=event.target.closest('[data-diary-delete]');
  if(diaryDelete){
    event.preventDefault();event.stopImmediatePropagation();
    const next=saveLiveNoms(deleteNomLog(currentNoms(),diaryDelete.dataset.diaryDelete));
    paintDiary(next);return;
  }
  const button=event.target.closest('[data-log-source]');if(!button)return;
  const key=button.dataset.logSource||'';if(!key.startsWith('food:'))return;
  const id=key.slice(5),n=currentNoms(),item=n.foods.find(x=>x.id===id);if(!item?.trackQuantity)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(item.quantity<=0){flash(button,'OUT · restock first');return}
  const next=saveLiveNoms(logNom(n,{name:item.name,sourceType:'food',sourceId:item.id,kind:item.kind,tags:item.tags})),fresh=next.foods.find(x=>x.id===id);
  paintSavedFoods(next);paintFridge(next);paintDiary(next);removeOutRecommendation(id,fresh);flash(button,`✓ Logged · ${fresh?.quantity??0} left`);
},true);

window.addEventListener('katos:noms-stock-changed',event=>{const n=normalizeNoms(event.detail?.noms||currentNoms());paintSavedFoods(n);paintFridge(n)});
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paintSavedFoods();paintFridge()})}).observe(app,{childList:true,subtree:true});
paintSavedFoods();paintFridge();paintDiary();
