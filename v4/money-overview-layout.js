const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
await waitRuntime();

function injectStyles(){
  if(document.getElementById('money-overview-layout-style'))return;
  const style=document.createElement('style');
  style.id='money-overview-layout-style';
  style.textContent=`
    [data-source-buckets-overview] .source-buckets-total{display:none!important}
    [data-source-buckets-overview]{margin-top:12px}
    [data-money-forecast]{margin-top:12px}
    [data-source-buckets-overview] + [data-money-forecast]{margin-top:10px}
  `;
  document.head.appendChild(style);
}

function arrange(){
  injectStyles();
  if(!document.querySelector('.nav-btn.active[data-view="money"]'))return;
  if(!document.querySelector('[data-money-tab="overview"].active'))return;
  const buckets=document.querySelector('[data-source-buckets-overview]');
  const forecast=document.querySelector('[data-money-forecast]');
  if(!buckets||!forecast)return;
  if(buckets.nextElementSibling!==forecast)forecast.insertAdjacentElement('beforebegin',buckets);
}

let queued=false;
const schedule=()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;arrange()});
};
new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});
schedule();
