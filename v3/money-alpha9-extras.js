let busy=false;
function allowRealBalances(){document.getElementById('accountBalance')?.removeAttribute('min');document.querySelectorAll('[data-account-value]').forEach(input=>input.removeAttribute('min'))}
function sync(){if(busy)return;busy=true;requestAnimationFrame(()=>{busy=false;allowRealBalances()})}
const app=document.getElementById('app');if(app)new MutationObserver(sync).observe(app,{childList:true,subtree:true});sync();
