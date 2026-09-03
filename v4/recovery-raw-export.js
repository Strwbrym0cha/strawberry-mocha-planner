const PREFIXES=['sm_v','katos','strawberry'];
const EXACT_KEYS=['sm_v4_beta','sm_v3_beta','sm_v16','sm_v16_backup','sm_v16_backups'];
const SENSITIVE_KEY=/session|auth|token|password|secret|credential/i;
const isRelevantKey=key=>{
  const raw=String(key||''),k=raw.toLowerCase();
  if(SENSITIVE_KEY.test(raw))return false;
  return EXACT_KEYS.includes(raw)||PREFIXES.some(prefix=>k.startsWith(prefix));
};
const collectStorage=(storage,label)=>{
  const records=[];
  if(!storage)return records;
  let length=0;try{length=storage.length}catch{return records}
  for(let i=0;i<length;i++){
    let key='';try{key=storage.key(i)||''}catch{continue}
    if(!isRelevantKey(key))continue;
    let value='';try{value=storage.getItem(key)||''}catch(error){records.push({key,label,error:String(error?.message||error)});continue}
    let parsed=false,rootType='unknown';
    try{const json=JSON.parse(value);parsed=true;rootType=Array.isArray(json)?'array':json===null?'null':typeof json}catch{}
    records.push({key,label,bytes:value.length,parsed,rootType,value});
  }
  return records;
};
function safeHref(){
  try{
    const url=new URL(location.href);url.hash='';
    for(const name of [...url.searchParams.keys()])if(/token|auth|session|code|password|secret/i.test(name))url.searchParams.set(name,'[redacted]');
    return url.toString();
  }catch{return `${location.origin}${location.pathname}`}
}

export function buildRawRecoveryBundle(){
  const records=[];
  try{records.push(...collectStorage(window.localStorage,'localStorage'))}catch{}
  try{records.push(...collectStorage(window.sessionStorage,'sessionStorage'))}catch{}
  return{
    format:'katos-browser-recovery-bundle',
    version:2,
    exportedAt:new Date().toISOString(),
    origin:location.origin,
    href:safeHref(),
    userAgent:navigator.userAgent,
    recordCount:records.length,
    records
  };
}
function downloadBundle(){
  try{
    const bundle=buildRawRecoveryBundle();
    const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`katos-browser-recovery-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
  }catch(error){
    alert(`KatOS could not export the raw browser bundle: ${error?.message||error}`);
  }
}
function summary(){
  const bundle=buildRawRecoveryBundle();
  const keys=bundle.records.map(record=>record.key);
  const v16=keys.filter(key=>key==='sm_v16'||key==='sm_v16_backup'||key==='sm_v16_backups');
  return{count:bundle.recordCount,v16};
}
function inject(){
  const overlay=document.querySelector('.katos-recovery-overlay');
  if(!overlay||overlay.querySelector('[data-katos-raw-export]'))return;
  const note=overlay.querySelector('.katos-recovery-note');if(!note)return;
  const info=summary();
  const wrap=document.createElement('div');
  wrap.style.cssText='margin-top:10px;padding:10px 11px;border:1px solid #edc9d8;border-radius:14px;background:#fff8fb;color:#785061;font-size:11px;line-height:1.5';
  wrap.innerHTML=`<b>🧪 Raw Safari inventory</b><br>${info.count} KatOS-ish storage key${info.count===1?'':'s'} physically present.${info.v16.length?`<br><b>V17 keys found:</b> ${info.v16.join(', ')}`:'<br><b>V17 keys found:</b> none yet'}<br><button type="button" data-katos-raw-export style="margin-top:8px;width:100%;min-height:42px;border:1px solid #e6bfd0;border-radius:12px;background:#fff;color:#7b4258;font:inherit;font-weight:850">📦 Export raw browser recovery bundle</button><small style="display:block;margin-top:6px;color:#9a7483">This only reads planner storage. Sign-in/session/token records are excluded. It does not restore or change KatOS.</small>`;
  note.after(wrap);
}

document.addEventListener('click',event=>{
  const button=event.target?.closest?.('[data-katos-raw-export]');
  if(button){event.preventDefault();event.stopPropagation();downloadBundle();return}
  if(event.target?.closest?.('[data-katos-recovery-open]'))setTimeout(inject,50);
});
const observer=new MutationObserver(mutations=>{
  if(mutations.some(m=>[...m.addedNodes].some(node=>node?.nodeType===1&&(node.matches?.('.katos-recovery-overlay')||node.querySelector?.('.katos-recovery-overlay')))))setTimeout(inject,0);
});
observer.observe(document.body,{childList:true,subtree:true});
