const recentTrustedSuppression=new WeakMap();
const INSTALLED='bossTouchScoped';

function install(hub){
  if(!hub||hub.dataset[INSTALLED]==='1')return;
  hub.dataset[INSTALLED]='1';

  const buttonFrom=event=>{
    const target=event.target;
    const button=target?.closest?.('button');
    return button&&hub.contains(button)?button:null;
  };

  hub.addEventListener('click',event=>{
    if(!event.isTrusted)return;
    const button=buttonFrom(event);if(!button)return;
    const stamp=recentTrustedSuppression.get(button)||0;
    if(performance.now()-stamp>750)return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);

  const activate=event=>{
    if(event.type==='pointerup'){
      if(event.pointerType==='mouse')return;
      if(event.isPrimary===false)return;
    }
    const button=buttonFrom(event);if(!button||button.disabled)return;
    event.preventDefault();
    event.stopPropagation();
    recentTrustedSuppression.set(button,performance.now());
    button.click();
  };

  if('PointerEvent' in window)hub.addEventListener('pointerup',activate,true);
  else hub.addEventListener('touchend',activate,{capture:true,passive:false});
}

function scan(){
  document.querySelectorAll('[data-boss-schedule-hub]').forEach(install);
}

const app=document.getElementById('app');
if(app)new MutationObserver(scan).observe(app,{childList:true,subtree:true});
scan();

const style=document.createElement('style');
style.id='boss-ipad-tap-style';
style.textContent=`[data-boss-schedule-hub] button{touch-action:manipulation;-webkit-tap-highlight-color:rgba(152,93,119,.12);cursor:pointer}`;
document.head.appendChild(style);
