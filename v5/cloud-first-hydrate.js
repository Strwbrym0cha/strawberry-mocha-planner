const CLOUD_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
const CLOUD_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';
const SESSION_KEYS=['sm_v16_session','sb-sigjwmgekmrwehylvuvu-auth-token'];
const V5_DATA_KEY='sm_v5_data';
const LEGACY_MARKER_PREFIX='sm_v5_cloud_hydrated_';
const SEEN_PREFIX='sm_v5_cloud_seen_v2_';
const BACKUP_PREFIX='sm_v5_backup_before_cloud_refresh_';

const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const unwrap=value=>{let current=value;for(let i=0;i<3;i++){if(isObject(current?.data))current=current.data;else break}return isObject(current)?current:null};
const normalizeSession=value=>{const session=value?.currentSession||value?.session||value;return session?.access_token&&session?.user?.id?session:null};

function storedSession(){
  for(const key of SESSION_KEYS){
    try{const session=normalizeSession(JSON.parse(localStorage.getItem(key)||'null'));if(session)return session}catch{}
  }
  return null;
}

async function fetchCloud(session){
  const response=await fetch(`${CLOUD_URL}/rest/v1/planner_data?user_id=eq.${encodeURIComponent(session.user.id)}&select=data,updated_at`,{headers:{apikey:CLOUD_KEY,Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
  if(!response.ok)return null;
  const rows=await response.json().catch(()=>null);
  const row=Array.isArray(rows)?rows[0]:null;
  const state=unwrap(row?.data);
  return state?{state,updatedAt:row?.updated_at||''}:null;
}

export async function hydrateCloudBeforePlanner(){
  const session=storedSession();
  if(!session)return{action:'no-session'};

  // v1 used a permanent boolean marker, which meant a phone could hydrate once
  // and then stay frozen on that old snapshot forever. Remove it and track the
  // actual remote revision instead.
  try{localStorage.removeItem(`${LEGACY_MARKER_PREFIX}${session.user.id}`)}catch{}

  const cloud=await fetchCloud(session);
  if(!cloud?.state)return{action:'no-cloud'};

  const seenKey=`${SEEN_PREFIX}${session.user.id}`;
  const seenRevision=localStorage.getItem(seenKey)||'';
  const localRaw=localStorage.getItem(V5_DATA_KEY)||'';
  const remoteRevision=cloud.updatedAt||cloud.state?.__smUpdatedAt||cloud.state?.meta?.updatedAt||'';
  const shouldPull=!localRaw||!seenRevision||seenRevision!==remoteRevision;

  if(!shouldPull)return{action:'current',updatedAt:remoteRevision};

  if(localRaw){
    try{localStorage.setItem(`${BACKUP_PREFIX}${Date.now()}`,localRaw)}catch{}
  }
  localStorage.setItem(V5_DATA_KEY,JSON.stringify(cloud.state));
  localStorage.setItem(seenKey,remoteRevision||String(Date.now()));
  window.dispatchEvent(new CustomEvent('katos:cloud-sync',{detail:{status:'pulled',reason:'cloud-revision-hydrate',updatedAt:remoteRevision}}));
  return{action:'pulled',updatedAt:remoteRevision};
}
