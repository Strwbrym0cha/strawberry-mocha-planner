/* V20.15: iPad-safe modal portal.
   Existing tab code still creates .v17-modal/.v18-event-modal DIVs.
   We keep that exact node (and its event handlers), but place it inside a
   native <dialog> top-layer host. This avoids Safari's fixed-position drift
   without rewriting every tab at once. */
(()=>{
  const nativeCreate=document.createElement.bind(document);
  const nativeAppend=Node.prototype.appendChild;
  const nativeRemove=Element.prototype.remove;
  const isModal=node=>node&&node.nodeType===1&&typeof node.className==='string'&&/\bv17-modal\b|\bv18-event-modal\b/.test(node.className);

  Node.prototype.appendChild=function(node){
    if(!isModal(node)||node.tagName==='DIALOG') return nativeAppend.call(this,node);

    const dialog=nativeCreate('dialog');
    dialog.className='v20-dialog';
    dialog.setAttribute('aria-modal','true');
    dialog.appendChild(node);
    nativeAppend.call(this,dialog);

    node.classList.add('v20-modal-portal');
    node.remove=function(){
      const host=this.parentElement;
      if(host&&host.tagName==='DIALOG'){
        try{host.close()}catch{}
        return nativeRemove.call(host);
      }
      return nativeRemove.call(this);
    };

    try{dialog.showModal()}catch{dialog.setAttribute('open','')}

    /* Existing modal code briefly sets body overflow:hidden. Native dialogs
       already block interaction, and iPad Safari can jump when overflow is
       toggled, so release that lock on the next frame. */
    requestAnimationFrame(()=>{
      document.body.style.overflow='';
      document.documentElement.style.overflow='';
    });

    return node;
  };
})();
