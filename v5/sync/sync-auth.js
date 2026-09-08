export const SYNC_SESSION_KEY='sm_v5_sync_session';
export const LEGACY_SESSION_KEYS=Object.freeze([
  'sm_v16_session',
  'sb-sigjwmgekmrwehylvuvu-auth-token',
  'sm_cloud_session'
]);

export const CLOUD_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
export const CLOUD_PUBLISHABLE_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';

const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

export function normalizeSession(value){
  let current=value;
  for(let index=0;index<3;index++){
    if(isObject(current?.currentSession))current=current.currentSession;
    else if(isObject(current?.session))current=current.session;
    else if(isObject(current?.data?.session))current=current.data.session;
    else break;
  }
  return current?.access_token&&current?.user?.id?current:null;
}

export function readSession(storage=localStorage){
  for(const key of[SYNC_SESSION_KEY,...LEGACY_SESSION_KEYS]){
    try{
      const session=normalizeSession(JSON.parse(storage.getItem(key)||'null'));
      if(session)return{session,sourceKey:key};
    }catch{}
  }
  return{session:null,sourceKey:null};
}

export function persistNormalizedSession(session,storage=localStorage){
  const normalized=normalizeSession(session);
  if(!normalized)return false;
  storage.setItem(SYNC_SESSION_KEY,JSON.stringify(normalized));
  return true;
}

export function tokenExpiresAt(session){
  const explicit=Number(session?.expires_at||0)*1000;
  if(explicit>0)return explicit;
  try{
    const payload=JSON.parse(atob(String(session?.access_token||'').split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return Number(payload?.exp||0)*1000;
  }catch{return 0}
}

export const sessionNeedsRefresh=(session,now=Date.now(),leewayMs=120000)=>{
  const expiresAt=tokenExpiresAt(session);
  return expiresAt>0&&expiresAt-now<=leewayMs;
};

export async function refreshSession(session,{fetchFunction=globalThis.fetch,storage=localStorage}={}){
  if(!session?.refresh_token)return{state:'REAUTH_REQUIRED',session:null,error:'The saved sign-in cannot be refreshed.'};
  try{
    const response=await fetchFunction(`${CLOUD_URL}/auth/v1/token?grant_type=refresh_token`,{
      method:'POST',headers:{apikey:CLOUD_PUBLISHABLE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:session.refresh_token})
    });
    const payload=await response.json().catch(()=>null);
    if(!response.ok||!normalizeSession(payload))return{state:'REAUTH_REQUIRED',session:null,error:payload?.error_description||payload?.message||'Sign in again to read cloud diagnostics.'};
    persistNormalizedSession(payload,storage);
    return{state:'AUTHENTICATED',session:normalizeSession(payload),refreshed:true};
  }catch(error){return{state:'OFFLINE',session:null,error:error?.message||'Cloud authentication is unavailable.'}}
}

export async function getAuthenticatedSession({storage=localStorage,fetchFunction=globalThis.fetch,now=Date.now()}={}){
  const found=readSession(storage);
  if(!found.session)return{state:'SIGNED_OUT',session:null,sourceKey:null};
  if(sessionNeedsRefresh(found.session,now)){
    const refreshed=await refreshSession(found.session,{fetchFunction,storage});
    return{...refreshed,sourceKey:found.sourceKey};
  }
  if(found.sourceKey!==SYNC_SESSION_KEY){try{persistNormalizedSession(found.session,storage)}catch{}}
  return{state:'AUTHENTICATED',session:found.session,sourceKey:found.sourceKey,refreshed:false};
}

export const publicAuthDiagnostics=result=>({
  state:result?.state||'SIGNED_OUT',
  signedIn:result?.state==='AUTHENTICATED',
  account:result?.session?.user?.email||null,
  userId:result?.session?.user?.id||null,
  sourceKey:result?.sourceKey||null,
  refreshed:!!result?.refreshed,
  error:result?.error||null
});
