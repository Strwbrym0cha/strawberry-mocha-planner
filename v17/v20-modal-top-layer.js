/* V20.11: legacy modal adapter. Existing modules can keep their markup and handlers,
   while every modal is promoted to the browser's native <dialog> top layer. */
(()=>{
  const nativeCreate=document.createElement.bind(document);
  const nativeAppend=Node.prototype.appendChild;
  const shouldPromote=node=>node&&node.nodeType===1&&typeof node.className==='string'&&/\bv17-modal\b|\bv18-event-modal\b/.test(node.className);
  Node.prototype.appendChild=function(node){
    if(shouldPromote(node)&&node.tagName!=='DIALOG'){
      const dialog=nativeCreate('dialog');
      for(const attr of Array.from(node.attributes||[])) dialog.setAttribute(attr.name,attr.value);
      dialog.innerHTML=node.innerHTML;
      for(const key of ['id','title']) if(node[key]) dialog[key]=node[key];
      return nativeAppend.call(this,dialog);
    }
    return nativeAppend.call(this,node);
  };
})();
