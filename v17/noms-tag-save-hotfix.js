const clean=value=>String(value??'').trim();
const parseTags=value=>String(value??'').split(',').map(tag=>clean(tag)).filter(Boolean);
const newestMatchingIndex=(items,name)=>{let best=-1,bestStamp=-1;items.forEach((item,index)=>{if(item?.archived||clean(item?.name)!==name)return;const stamp=Date.parse(item?.updatedAt||item?.createdAt||'')||0;if(stamp>=bestStamp){best=index;bestStamp=stamp}});return best};

function install(){
 if(window.__smNomTagSaveHotfix)return;window.__smNomTagSaveHotfix=true;
 document.addEventListener('submit',event=>{
  const form=event.target?.closest?.('.sm-noms-form[data-form="nom"],.sm-noms-form[data-form="recipe"]');if(!form)return;
  const kind=form.dataset.form,name=clean(form.querySelector('[name="name"]')?.value),tags=parseTags(form.querySelector('[name="tags"]')?.value);if(!name)return;
  setTimeout(()=>{const store=window.__smStore;if(!store?.update)return;store.update(state=>{const noms=state?.noms||{},key=kind==='recipe'?'recipes':'foods',items=Array.isArray(noms[key])?noms[key]:[],index=newestMatchingIndex(items,name);if(index<0)return state;const current=items[index],same=Array.isArray(current.tags)&&current.tags.length===tags.length&&current.tags.every((tag,i)=>tag===tags[i]);if(same)return state;const next=items.slice();next[index]={...current,tags,updatedAt:new Date().toISOString()};return{...state,noms:{...noms,[key]:next}}})},0);
 },true);
}

install();
export{install};