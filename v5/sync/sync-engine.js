import{getAuthenticatedSession,refreshSession,SYNC_SESSION_KEY,CLOUD_PUBLISHABLE_KEY,CLOUD_URL,publicAuthDiagnostics}from'./sync-auth.js';
import{envelopeFromCloudRow,validateCanonicalEnvelope}from'./sync-envelope.js';
import{recoveryModeOn}from'./sync-storage.js';

export const SYNC_STATES=Object.freeze({
  PAUSED:'PAUSED',LOCAL_MASTER_UNSEEDED:'LOCAL_MASTER_UNSEEDED',UP_TO_DATE:'UP_TO_DATE',REMOTE_NEWER:'REMOTE_NEWER',
  LOCAL_DIRTY:'LOCAL_DIRTY',UPLOADING:'UPLOADING',DOWNLOADING:'DOWNLOADING',CONFLICT:'CONFLICT',OFFLINE:'OFFLINE',
  REAUTH_REQUIRED:'REAUTH_REQUIRED',ERROR:'ERROR'
});

export class SafeSyncEngine{
  constructor({storage=localStorage,fetchFunction=globalThis.fetch}={}){
    this.storage=storage;this.fetchFunction=fetchFunction;this.state=SYNC_STATES.PAUSED;
  }

  isRecoveryProtected(){return recoveryModeOn(this.storage)}
  canReadCloud(){return true}
  canWriteCloud(){return false}

  async authentication(){
    return getAuthenticatedSession({storage:this.storage,fetchFunction:this.fetchFunction});
  }

  async fetchCloudDiagnostics(){
    const authentication=await this.authentication();
    let auth=publicAuthDiagnostics(authentication);
    if(authentication.state!=='AUTHENTICATED')return{ok:false,state:authentication.state,auth,row:null,envelope:null,error:authentication.error||null};
    try{
      let session=authentication.session;
      // content_hash is computed from legacy rows until the review-only migration is approved.
      const endpoint=`${CLOUD_URL}/rest/v1/planner_data_v3?user_id=eq.${encodeURIComponent(session.user.id)}&select=data,schema_version,revision,updated_at,last_device_id&limit=1`;
      const request=()=>this.fetchFunction(endpoint,{headers:{apikey:CLOUD_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`}});
      let response=await request();
      if(response.status===401){
        const refreshed=await refreshSession(session,{fetchFunction:this.fetchFunction,storage:this.storage});
        if(refreshed.state!=='AUTHENTICATED')return{ok:false,state:refreshed.state,auth:publicAuthDiagnostics(refreshed),row:null,envelope:null,error:refreshed.error||'Sign in again to read cloud diagnostics.'};
        session=refreshed.session;auth=publicAuthDiagnostics({...refreshed,sourceKey:SYNC_SESSION_KEY});response=await request();
      }
      const payload=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(payload?.message||payload?.hint||'Cloud diagnostics could not be read.');
      const row=Array.isArray(payload)?payload[0]||null:null;
      const envelope=row?await envelopeFromCloudRow(row):null;
      let snapshots={available:false,count:null,latestRevision:null,latestAt:null};
      try{
        const snapshotEndpoint=`${CLOUD_URL}/rest/v1/planner_data_v3_snapshots?user_id=eq.${encodeURIComponent(session.user.id)}&select=revision,created_at&order=created_at.desc&limit=1`;
        const snapshotResponse=await this.fetchFunction(snapshotEndpoint,{headers:{apikey:CLOUD_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`,Prefer:'count=exact'}});
        const snapshotRows=await snapshotResponse.json().catch(()=>null);
        if(snapshotResponse.ok&&Array.isArray(snapshotRows)){
          const exact=Number(String(snapshotResponse.headers?.get?.('content-range')||'').split('/').at(-1));
          const snapshotCount=Number.isInteger(exact)?exact:snapshotRows.length;
          snapshots={available:snapshotCount>0,count:snapshotCount,latestRevision:snapshotRows[0]?.revision??null,latestAt:snapshotRows[0]?.created_at||null};
        }
      }catch{}
      return{ok:true,state:SYNC_STATES.PAUSED,auth,row,envelope,snapshots,validation:envelope?validateCanonicalEnvelope(envelope):null};
    }catch(error){return{ok:false,state:'OFFLINE',auth,row:null,envelope:null,error:error?.message||'Cloud diagnostics are unavailable.'}}
  }

  async push(){return{ok:false,state:SYNC_STATES.PAUSED,error:'Cloud writes are disabled during the diagnostic phase.'}}
  async pull(){return{ok:false,state:SYNC_STATES.PAUSED,error:'Cloud installation is disabled during the diagnostic phase.'}}
  async seed(){return{ok:false,state:SYNC_STATES.PAUSED,error:'Cloud seeding is disabled until the iPad diagnostic report is approved.'}}
}

export const createSafeSyncEngine=options=>new SafeSyncEngine(options);
