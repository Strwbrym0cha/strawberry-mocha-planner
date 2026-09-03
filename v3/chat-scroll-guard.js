/* KatOS V3 Alpha 5.1: keep Mochini anchored while the app rerenders. */
(()=>{
  if(window.__katOSV3ChatScrollGuard)return;
  window.__katOSV3ChatScrollGuard=true;

  let armed=false;
  let anchorTop=0;
  let pageY=0;
  let mutationQueued=false;

  const conversation=()=>document.getElementById('conversation');

  function arm(){
    const box=conversation();
    if(!box)return;
    armed=true;
    anchorTop=box.getBoundingClientRect().top;
    pageY=window.scrollY;
  }

  function settle(){
    if(!armed||mutationQueued)return;
    mutationQueued=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      mutationQueued=false;
      if(!armed)return;
      const box=conversation();
      if(!box){armed=false;return;}

      // Preserve where Mochini was sitting in the viewport even if Home/Context
      // changed height above her during the same render.
      const newTop=box.getBoundingClientRect().top;
      const delta=newTop-anchorTop;
      if(Number.isFinite(delta)&&Math.abs(delta)>.5)window.scrollTo({top:Math.max(0,pageY+delta),left:0,behavior:'auto'});
      else window.scrollTo({top:pageY,left:0,behavior:'auto'});

      // The new answer belongs at the bottom of the inner conversation rail.
      box.scrollTop=box.scrollHeight;
      box.style.overflowAnchor='none';
      armed=false;
    }));
  }

  document.addEventListener('pointerdown',event=>{
    const target=event.target?.closest?.('#askMochini,[data-proposal-approve],[data-proposal-reject],[data-undo-context]');
    if(target)arm();
  },true);

  document.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&event.target?.id==='mochiniInput')arm();
  },true);

  const app=document.getElementById('app');
  if(app)new MutationObserver(()=>settle()).observe(app,{childList:true,subtree:true});

  // Initial load may contain persisted conversation. Put it at the newest turn,
  // but do not move the outer page.
  requestAnimationFrame(()=>{
    const box=conversation();
    if(box){box.scrollTop=box.scrollHeight;box.style.overflowAnchor='none';}
  });
})();
