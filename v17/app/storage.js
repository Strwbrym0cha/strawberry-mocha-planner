import{loadLocalData,saveLocalData}from'./data.js?v=22.0.0-20260816';

const CLOUD_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
const CLOUD_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';
const SESSION_KEY='sm_v16_session';
let syncTimer=null,lastPayload='';

function readSession(){try{const host=window.parent&&window.parent!==window?window.parent:window;return JSON.parse(host.localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
function queueCloudSave(data){
 const payload=JSON.stringify({data});if(payload===lastPayload)return;
 lastPayload=payload;clearTimeout(syncTimer);
 syncTimer=setTimeout(async()=>{
  const session=readSession();if(!session?.access_token||!session?.user?.id)return;
  try{
   const response=await fetch(`${CLOUD_URL}/rest/v1/planner_data?on_conflict=user_id`,{method:'POST',headers:{'Content-Type':'application/json','apikey':CLOUD_KEY,'Authorization':`Bearer ${session.access_token}`,'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:session.user.id,data})});
   if(!response.ok)throw new Error('Cloud save failed.');
   window.dispatchEvent(new CustomEvent('sm:cloud-sync',{detail:{ok:true}}));
  }catch{
   lastPayload='';
   window.dispatchEvent(new CustomEvent('sm:cloud-sync',{detail:{ok:false}}));
  }
 },600);
}

export function createStore(){
 let data=loadLocalData();
 const listeners=new Set();
 const persist=next=>{saveLocalData(next);queueCloudSave(next);listeners.forEach(listener=>listener(next))};
 return{
  get(){return data},
  set(next){data=next;persist(data)},
  update(fn){data=fn(data)||data;persist(data)},
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)},
  reload(){data=loadLocalData();listeners.forEach(listener=>listener(data))}
 };
}
export async function cloudSync(){return{ok:!!readSession(),migrated:false}}
