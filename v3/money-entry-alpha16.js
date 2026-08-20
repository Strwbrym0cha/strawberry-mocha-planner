const app=document.getElementById('app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{
  await import('./money-ui.js?v=3.0.0-alpha.16-wake1');
  await import('./money-alpha9-extras.js?v=3.0.0-alpha.16-wake1');
}catch(error){
  console.error('Money Cafe failed to load',error);
  app.innerHTML=`<main class="shell"><section class="card full"><div class="ey">☕ MONEY CAFÉ · LOAD RECOVERY</div><h2>Money Café hit a loading snag.</h2><p>KatOS stopped the endless brewing screen and surfaced the error instead.</p><div class="cafe-note"><b>${esc(error?.message||error)}</b></div><button class="btn primary" id="moneyRetry" type="button">↻ Retry Money Café</button></section></main>`;
  document.getElementById('moneyRetry')?.addEventListener('click',()=>{const u=new URL(location.href);u.searchParams.set('retry',Date.now());location.href=u.href});
}