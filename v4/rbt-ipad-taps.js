const BOSS_BUTTON='[data-boss-schedule-hub] button';
const recentTrustedSuppression=new WeakMap();

function buttonFrom(event){
  const target=event.target;
  return target?.closest?.(BOSS_BUTTON)||null;
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

function activateButton(button,event){
  if(!button||button.disabled)return;
  event.preventDefault();
  event.stopPropagation();
  button.click();
  recentTrustedSuppression.set(button,performance.now());
}

function activateFromPointer(event){
  if(event.pointerType==='mouse')return;
  if(event.isPrimary===false)return;
  activateButton(buttonFrom(event),event);
}

if('PointerEvent' in window){
  document.addEventListener('pointerup',activateFromPointer,true);
}else{
  document.addEventListener('touchend',event=>activateButton(buttonFrom(event),event),{capture:true,passive:false});
}

const style=document.createElement('style');
style.id='boss-ipad-tap-style';
style.textContent=`[data-boss-schedule-hub] button{touch-action:manipulation;-webkit-tap-highlight-color:rgba(152,93,119,.12);cursor:pointer}`;
document.head.appendChild(style);
