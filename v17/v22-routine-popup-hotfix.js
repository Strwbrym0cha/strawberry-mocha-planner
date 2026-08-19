/* V22.6.3: keep routine editors correctly branded and make iPad/Safari scrolling modal-only. */
(()=>{
  const STYLE_ID='sm-routine-popup-hotfix-style';
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      html.sm-routine-modal-open,
      body.sm-routine-modal-open{
        overflow:hidden!important;
        overscroll-behavior:none!important;
      }
      .sm-routine-editor-backdrop{
        position:fixed!important;
        inset:0!important;
        overflow:hidden!important;
        overscroll-behavior:none!important;
        touch-action:none!important;
      }
      .sm-routine-editor{
        max-height:calc(100dvh - 36px)!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior:contain!important;
        touch-action:pan-y!important;
        scrollbar-gutter:stable;
      }
      .sm-routine-editor-actions{
        position:sticky!important;
        bottom:-1px!important;
        z-index:20!important;
        margin-left:-6px!important;
        margin-right:-6px!important;
        padding:18px 6px 6px!important;
        background:linear-gradient(180deg,rgba(255,253,251,0),rgba(255,253,251,.97) 24%,rgba(248,252,244,.99))!important;
      }
      @media(max-width:760px){
        .sm-routine-editor-backdrop{align-items:flex-start!important;padding:10px!important;}
        .sm-routine-editor{max-height:calc(100dvh - 20px)!important;width:min(620px,100%)!important;}
      }
    `;
    document.head.appendChild(style);
  }

  let locked=false;
  const lockPage=()=>{
    if(locked)return;
    locked=true;
    document.documentElement.classList.add('sm-routine-modal-open');
    document.body.classList.add('sm-routine-modal-open');
  };
  const unlockPage=()=>{
    if(!locked)return;
    locked=false;
    document.documentElement.classList.remove('sm-routine-modal-open');
    document.body.classList.remove('sm-routine-modal-open');
  };

  const patch=panel=>{
    if(!panel?.matches?.('.sm-routine-editor'))return;
    panel.dataset.popupCategory='routines';
    const badge=panel.querySelector(':scope > .sm-popup-category-badge');
    if(badge){
      badge.innerHTML='<span class="sm-popup-category-icon" aria-hidden="true">🎀</span><span class="sm-popup-category-copy"><b>ROUTINE RECIPE</b><span>Build the steps once, then let KatOS carry the rhythm.</span></span>';
    }
  };

  const syncLock=()=>{
    const backdrop=document.querySelector('.sm-routine-editor-backdrop');
    if(backdrop){
      lockPage();
      backdrop.querySelectorAll('.sm-routine-editor').forEach(patch);
    }else unlockPage();
  };

  let startY=0;
  document.addEventListener('touchstart',event=>{
    if(!document.querySelector('.sm-routine-editor-backdrop'))return;
    if(event.touches?.length)startY=event.touches[0].clientY;
  },{capture:true,passive:true});

  document.addEventListener('touchmove',event=>{
    const backdrop=document.querySelector('.sm-routine-editor-backdrop');
    if(!backdrop)return;
    const editor=event.target?.closest?.('.sm-routine-editor');
    if(!editor){event.preventDefault();return;}
    const currentY=event.touches?.[0]?.clientY??startY;
    const delta=currentY-startY;
    const atTop=editor.scrollTop<=0;
    const atBottom=editor.scrollTop+editor.clientHeight>=editor.scrollHeight-1;
    if((atTop&&delta>0)||(atBottom&&delta<0))event.preventDefault();
  },{capture:true,passive:false});

  syncLock();
  new MutationObserver(syncLock).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pagehide',unlockPage,{once:true});
})();