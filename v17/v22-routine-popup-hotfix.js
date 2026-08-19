/* V22.6.2: keep routine editors correctly branded and scrollable on iPad/Safari. */
(()=>{
  const STYLE_ID='sm-routine-popup-hotfix-style';
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .sm-routine-editor-backdrop{
        overflow-y:auto!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior:contain!important;
        touch-action:pan-y!important;
      }
      .sm-routine-editor{
        max-height:calc(100dvh - 36px)!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior:contain!important;
        touch-action:pan-y!important;
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

  const patch=panel=>{
    if(!panel?.matches?.('.sm-routine-editor'))return;
    panel.dataset.popupCategory='routines';
    const badge=panel.querySelector(':scope > .sm-popup-category-badge');
    if(badge){
      badge.innerHTML='<span class="sm-popup-category-icon" aria-hidden="true">🎀</span><span class="sm-popup-category-copy"><b>ROUTINE RECIPE</b><span>Build the steps once, then let KatOS carry the rhythm.</span></span>';
    }
  };

  const scan=root=>{
    if(root?.matches?.('.sm-routine-editor'))patch(root);
    root?.querySelectorAll?.('.sm-routine-editor').forEach(patch);
  };

  scan(document);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(scan))).observe(document.documentElement,{childList:true,subtree:true});
})();
