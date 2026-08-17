import{createKatOSDataService}from'./katos-data-service.js?v=22.1.18-20260817';

const CLOUD_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
const CLOUD_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';
const SESSION_KEY='sm_v16_session';
let syncTimer=null,lastPayload='';

export function readSession(){try{const host=window.parent&&window.parent!==window?window.parent:window;return JSON.parse(host.localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
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
 const service=createKatOSDataService({onPersist:queueCloudSave});
 return{
  get(){return service.getState()},
  set(next){service.setState(next)},
  update(fn){service.updateState(fn)},
  subscribe(listener){return service.subscribe(listener)},
  reload(){service.reload()},
  // Read APIs establish the selector pattern without requiring tab rewrites.
  getTasksForDate:service.getTasksForDate,
  getEventsForDate:service.getEventsForDate,
  getCurrentTaskbotState:service.getCurrentTaskbotState,
  getRoutines:service.getRoutines,
  getNoms:service.getNoms,
  getFinanceSummary:service.getFinanceSummary,
  evaluateToday:service.evaluateToday,
  listBackups:service.listBackups,
  getBackup:service.getBackup,
  schemaVersion:service.schemaVersion
 };
}
export async function cloudSync(){return{ok:!!readSession(),migrated:false}}
