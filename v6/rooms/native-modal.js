const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function openNativeModal({id='palace-action',icon='🌸',eyebrow='PALACE TOOL',title,copy='',body='',wide=false,onOpen}={}){
 closeNativeModal();
 const backdrop=document.createElement('div');
 backdrop.className='detail-modal-backdrop v6-native-action-backdrop';
 backdrop.dataset.v6NativeModal=id;
 backdrop.innerHTML=`<section class="detail-modal v6-native-action-modal${wide?' is-wide':''}" role="dialog" aria-modal="true" aria-labelledby="${esc(id)}-title"><header class="v6-popup-header"><div><div class="ey">${esc(icon)} ${esc(eyebrow)}</div><h2 id="${esc(id)}-title">${esc(title||'Palace action')}</h2>${copy?`<p>${esc(copy)}</p>`:''}</div><button type="button" class="detail-modal-close" data-v6-native-close aria-label="Close">×</button></header><div class="v6-native-action-body">${body}</div></section>`;
 document.body.append(backdrop);
 backdrop.querySelector('input:not([type="hidden"]),select,textarea,button')?.focus();
 onOpen?.(backdrop);
 return backdrop;
}

function releaseInteractionLocks(){
 if(document.querySelector('.detail-modal-backdrop:not([hidden])'))return;
 document.documentElement.style.pointerEvents='';
 document.body.style.pointerEvents='';
 document.body.style.overflow='';
 document.getElementById('app')?.removeAttribute('inert');
 document.getElementById('app')?.removeAttribute('aria-hidden');
}
export function closeNativeModal(){document.querySelectorAll('[data-v6-native-modal]').forEach(node=>node.remove());releaseInteractionLocks()}
export function formValues(form){if(typeof HTMLFormElement!=='undefined'&&form instanceof HTMLFormElement)return Object.fromEntries(new FormData(form).entries());return Object.fromEntries([...form.querySelectorAll('[name]')].map(control=>[control.name,control.type==='checkbox'?control.checked?control.value||'on':'':control.value]))}
export function nativeError(form,message='That could not be saved. Your existing data is still safe.'){
 let node=form.querySelector('[data-v6-native-error]');
 if(!node){node=document.createElement('p');node.className='v6-form-error';node.dataset.v6NativeError='';form.append(node)}
 node.textContent=message;
}
export function requestRoomRefresh(){window.dispatchEvent(new CustomEvent('katos:v6-native-refresh'))}

let installed=false;
export function installNativeModalLifecycle(){
 if(installed)return;installed=true;
 document.addEventListener('click',event=>{
  const backdrop=event.target.closest?.('[data-v6-native-modal]');
  if(event.target.closest?.('[data-v6-native-close]')||(backdrop&&event.target===backdrop)){event.preventDefault();closeNativeModal()}
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape')closeNativeModal()});
}
