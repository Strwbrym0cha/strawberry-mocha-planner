const app=document.getElementById('app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let coreReady=false;
try{
  await import('./boss-ui.js?v=3.0.0-alpha.16-wake3');
  coreReady=true;
}catch(error){
  console.error('Boss Bitch core failed to load',error);
  app.innerHTML=`<main class="shell"><section class="card full"><div class="ey">💼 BOSS BITCH · LOAD RECOVERY</div><h2>Boss Bitch hit a loading snag.</h2><p>KatOS stopped the endless loading screen instead of pretending nothing happened.</p><div class="notice"><b>${esc(error?.message||error)}</b></div><button class="btn primary" id="bossRetry" type="button">↻ Retry Boss Bitch</button></section></main>`;
  document.getElementById('bossRetry')?.addEventListener('click',()=>{const u=new URL(location.href);u.searchParams.set('retry',Date.now());location.href=u.href});
}
if(coreReady){try{await import('./boss-alpha9-extras.js?v=3.0.0-alpha.16-wake3')}catch(error){console.warn('Boss Bitch optional extras failed; core remains available.',error)}}