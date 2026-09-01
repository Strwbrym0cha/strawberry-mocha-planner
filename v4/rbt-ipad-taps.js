const RBT_BUTTON='[data-rbt-workspace] button';
const recentTrustedSuppression=new WeakMap();

function buttonFrom(event){
  const target=event.target;
  return target?.closest?.(RBT_BUTTON)||null;
}

function suppressDuplicateTrustedClick(event){
  if(!event.isTrusted)return;
  const button=buttonFrom(event);if(!button)return;
  const stamp=recentTrustedSuppression.get(button)||0;
  if(performance.now()-stamp>900)return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

document.addEventListener('click',suppressDuplicateTrustedClick,true);

function activateFromPointer(event){
  if(event.pointerType==='mouse')return;
  if(event.isPrimary===false)return;
  const button=buttonFrom(event);if(!button||button.disabled)return;
  event.preventDefault();
  event.stopPropagation();
  button.click();
  recentTrustedSuppression.set(button,performance.now());
}

if('PointerEvent' in window){
  document.addEventListener('pointerup',activateFromPointer,true);
}else{
  document.addEventListener('touchend',event=>{
    const button=buttonFrom(event);if(!button||button.disabled)return;
    event.preventDefault();
    event.stopPropagation();
    button.click();
    recentTrustedSuppression.set(button,performance.now());
  },{capture:true,passive:false});
}

const style=document.createElement('style');
style.id='rbt-ipad-tap-style';
style.textContent=`[data-rbt-workspace] button{touch-action:manipulation;-webkit-tap-highlight-color:rgba(152,93,119,.12);cursor:pointer}`;
document.head.appendChild(style);
