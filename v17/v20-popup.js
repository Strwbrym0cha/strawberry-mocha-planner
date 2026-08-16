/* V20.17: stable document-flow popups + planner daily-check-in layout.
   No fixed positioning, no viewport math, no body scroll locking. */
(()=>{
  const nativeAppend=Node.prototype.appendChild;
  const nativeRemove=Element.prototype.remove;
  const isModal=node=>node&&node.nodeType===1&&typeof node.className==='string'&&/\bv17-modal\b|\bv18-event-modal\b/.test(node.className);
  const root=()=>document.getElementById('tab-root');

  const style=document.createElement('style');
  style.textContent=`
    /* V20.17 daily check-in: give the mood palette room to breathe. */
    .v17-day-editor{display:grid!important;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr)!important;gap:18px!important;align-items:start!important}
    .v17-day-editor>.v17-card:first-child{min-width:0!important}
    .v17-day-editor>.v17-card:first-child .v17-planner-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;align-items:start!important}
    .v17-day-editor>.v17-card:first-child .v20-mood-field{grid-column:1/-1!important;min-width:0!important}
    .v20-mood-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;width:100%!important;margin-top:7px!important}
    .v20-mood{appearance:none!important;-webkit-appearance:none!important;cursor:pointer!important;min-width:0!important;min-height:44px!important;width:100%!important;padding:8px 6px!important;border:1.5px solid #efc8d7!important;border-radius:16px!important;background:linear-gradient(145deg,#fff,#fff7fb)!important;color:#65463f!important;box-shadow:0 3px 9px rgba(101,70,63,.05)!important;font:inherit!important;font-weight:800!important;transition:transform .12s ease,box-shadow .12s ease,background .12s ease,border-color .12s ease!important}
    .v20-mood:hover{transform:translateY(-1px)!important}
    .v20-mood.selected{background:linear-gradient(105deg,#f2a2c3,#b9d4aa)!important;border-color:#d879a1!important;color:#fff!important;box-shadow:0 7px 16px rgba(201,87,131,.18)!important;transform:translateY(-1px)!important}
    .v20-mood-note{margin:7px 0 0!important;font-size:12px!important;color:#9f8179!important}
    .v17-day-editor>.v17-card:first-child>#saveDayNotes{display:block!important;width:fit-content!important;min-width:150px!important;margin:14px 0 0 auto!important}
    @media(max-width:900px){.v17-day-editor{grid-template-columns:1fr!important}.v17-day-editor>.v17-card:first-child .v17-planner-grid{grid-template-columns:1fr!important}.v17-day-editor>.v17-card:first-child .v20-mood-field{grid-column:auto!important}}
    @media(max-width:560px){.v20-mood-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.v20-mood{min-height:42px!important}}
  `;
  document.head.appendChild(style);

  const normalize=node=>{
    node.classList.add('v20-flow-popup');
    node.style.setProperty('position','relative','important');
    node.style.setProperty('inset','auto','important');
    node.style.setProperty('top','auto','important');
    node.style.setProperty('left','auto','important');
    node.style.setProperty('right','auto','important');
    node.style.setProperty('bottom','auto','important');
    node.style.setProperty('width','100%','important');
    node.style.setProperty('height','auto','important');
    node.style.setProperty('min-height','0','important');
    node.style.setProperty('max-height','none','important');
    node.style.setProperty('margin','0 0 16px 0','important');
    node.style.setProperty('padding','0','important');
    node.style.setProperty('display','block','important');
    node.style.setProperty('transform','none','important');
    node.style.setProperty('z-index','20','important');
    node.style.setProperty('overflow','visible','important');
    node.style.setProperty('background','transparent','important');
    node.style.setProperty('backdrop-filter','none','important');
    node.style.setProperty('-webkit-backdrop-filter','none','important');
    node.style.setProperty('touch-action','auto','important');
    const panel=node.firstElementChild;
    if(panel){
      panel.style.setProperty('position','relative','important');
      panel.style.setProperty('top','auto','important');
      panel.style.setProperty('left','auto','important');
      panel.style.setProperty('right','auto','important');
      panel.style.setProperty('bottom','auto','important');
      panel.style.setProperty('transform','none','important');
      panel.style.setProperty('width','100%','important');
      panel.style.setProperty('max-width','820px','important');
      panel.style.setProperty('max-height','none','important');
      panel.style.setProperty('margin','0 auto','important');
      panel.style.setProperty('overflow','visible','important');
    }
  };

  Node.prototype.appendChild=function(node){
    if(!isModal(node)) return nativeAppend.call(this,node);
    const host=root();
    if(!host) return nativeAppend.call(this,node);
    normalize(node);
    const first=host.firstChild;
    if(first) nativeAppend.call(host,node),host.insertBefore(node,first);
    else nativeAppend.call(host,node);
    node.remove=function(){
      document.body.style.overflow='';
      document.documentElement.style.overflow='';
      return nativeRemove.call(this);
    };
    requestAnimationFrame(()=>{
      document.body.style.overflow='';
      document.documentElement.style.overflow='';
      normalize(node);
      node.scrollIntoView({block:'nearest',behavior:'auto'});
    });
    return node;
  };
})();
