self.onmessage=event=>{
  try{
    const raw=String(event.data?.raw||'');
    const mode=event.data?.mode||'record';
    const parsed=JSON.parse(raw);
    if(mode==='history'){
      const root=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?(parsed.data||parsed):parsed;
      const entries=Array.isArray(root)?root:(Array.isArray(root?.entries)?root.entries:[]);
      const cleaned=entries.map(entry=>{
        const source=entry&&typeof entry==='object'?(entry.data&&typeof entry.data==='object'?entry.data:entry):{};
        const createdAt=String(entry?.createdAt||entry?.savedAt||entry?.data?.__smUpdatedAt||entry?.__smUpdatedAt||'');
        return {state:source,createdAt};
      }).filter(entry=>entry.state&&Object.keys(entry.state).length);
      self.postMessage({ok:true,mode:'history',entries:cleaned});
      return;
    }
    const state=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?(parsed.data||parsed):null;
    self.postMessage({ok:true,mode:'record',state});
  }catch(error){
    self.postMessage({ok:false,error:String(error?.message||error||'JSON parse failed')});
  }
};
