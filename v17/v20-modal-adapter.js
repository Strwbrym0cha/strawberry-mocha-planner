/* V20.12: put every legacy modal into the browser's native dialog top layer. */
(()=>{
  const originalAppend=Node.prototype.appendChild;
  const isModal=node=>node instanceof HTMLElement && (node.classList.contains('v17-modal')||node.classList.contains('v18-event-modal'));
  Node.prototype.appendChild=function(node){
    if(this===document.body && isModal(node) && !(node instanceof HTMLDialogElement)){
      const dialog=document.createElement('dialog');
      dialog.className=node.className;
      dialog.id=node.id;
      for(const attr of node.attributes){if(attr.name!=='class'&&attr.name!=='id')dialog.setAttribute(attr.name,attr.value)}
      dialog.innerHTML=node.innerHTML;
      node.replaceWith?.(dialog);
      const result=originalAppend.call(this,dialog);
      try{dialog.showModal()}catch{dialog.setAttribute('open','')}
      return result;
    }
    const result=originalAppend.call(this,node);
    if(this===document.body && node instanceof HTMLDialogElement && (node.classList.contains('v17-modal')||node.classList.contains('v18-event-modal')) && !node.open){
      try{node.showModal()}catch{node.setAttribute('open','')}
    }
    return result;
  };
})();
