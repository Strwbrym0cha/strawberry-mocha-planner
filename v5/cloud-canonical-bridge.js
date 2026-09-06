const V5_DATA_KEY='sm_v5_data';
const V4_KEY='sm_v4_beta';

function parse(raw){
  try{return raw?JSON.parse(raw):null}catch{return null}
}

export function mirrorCanonicalIntoPlanner(){
  const raw=localStorage.getItem(V5_DATA_KEY)||'';
  const state=parse(raw);
  if(!state||typeof state!=='object'||Array.isArray(state))return false;
  try{
    const existingRaw=localStorage.getItem(V4_KEY)||'';
    const existing=parse(existingRaw);
    const envelope=existing&&typeof existing==='object'&&!Array.isArray(existing)&&existing.data&&typeof existing.data==='object'
      ? {...existing,data:state}
      : {data:state};
    localStorage.setItem(V4_KEY,JSON.stringify(envelope));
    return true;
  }catch{return false}
}

window.addEventListener('katos:cloud-sync',event=>{
  if(event?.detail?.status==='pulled')mirrorCanonicalIntoPlanner();
});

mirrorCanonicalIntoPlanner();
