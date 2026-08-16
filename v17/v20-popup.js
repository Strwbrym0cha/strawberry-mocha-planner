/* V20.16: replace drifting modal overlays with ordinary document-flow popups.
   No fixed positioning, no absolute viewport math, no body scroll lock.
   The existing modal node and all of its handlers are preserved. */
(()=>{
  const nativeAppend=Node.prototype.appendChild;
  const nativeRemove=Element.prototype.remove;
  const isModal=node=>node&&node.nodeType===1&&typeof node.className==='string'&&/\bv17-modal\b|\bv18-event-modal\b/.test(node.className);
  const root=()=>document.getElementById('tab-root');

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
