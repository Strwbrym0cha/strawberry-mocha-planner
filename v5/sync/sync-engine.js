import{getAuthenticatedSession,refreshSession,SYNC_SESSION_KEY,CLOUD_PUBLISHABLE_KEY,CLOUD_URL,publicAuthDiagnostics}from'./sync-auth.js';
import{envelopeFromCloudRow,validateCanonicalEnvelope}from'./sync-envelope.js';
import{browserFetch,resolveFetch}from'./sync-fetch.js';
import{recoveryModeOn}from'./sync-storage.js';

export const SYNC_STATES=Object.freeze({
  PAUSED:'PAUSED',LOCAL_MASTER_UNSEEDED:'LOCAL_MASTER_UNSEEDED',UP_TO_DATE:'UP_TO_DATE',REMOTE_NEWER:'REMOTE_NEWER',
  LOCAL_DIRTY:'LOCAL_DIRTY',UPLOADING:'UPLOADING',DOWNLOADING:'DOWNLOADING',CONFLICT:'CONFLICT',OFFLINE:'OFFLINE',
  REAUTH_REQUIRED:'REAUTH_REQUIRED',ERROR:'ERROR'
});

export class SafeSyncEngine{
  constructor({storage=localStorage,fetchFunction=browserFetch}={}){
    this.storage=storage;this.fetchFunction=resolveFetch(fetchFunction);this.state=SYNC_STATES.PAUSED;
  }

  isRecoveryProtected(){return recoveryModeOn(this.storage)}
  canReadCloud(){return true}
  canWriteCloud(){return false}

  async authentication(){
    return getAuthenticatedSession({storage:this.storage,fetchFunction:this.fetchFunction});
  }

  async readEndpoint(endpoint,session,extraHeaders={}){
    const request=()=>this.fetchFunction(endpoint,{method:'GET',headers:{apikey:CLOUD_PUBLISHABLE_KEY,Authorization:`Bearer ${session.access_token}`,...extraHeaders}});
    let response=await request();
    if(response.status!==401)return{response,session,auth:null,authFailure:null};
    const refreshed=await refreshSession(session,{fetchFunction:this.fetchFunction,storage:this.storage});
    if(refreshed.state!=='AUTHENTICATED')return{response:null,session:null,auth:null,authFailure:refreshed};
    session=refreshed.session;
    response=await request();
    return{response,session,auth:publicAuthDiagnostics({...refreshed,sourceKey:SYNC_SESSION_KEY}),authFailure:null};
  }

  async fetchCloudDiagnostics(){
    const authentication=await this.authentication();
    let auth=publicAuthDiagnostics(authentication);
    if(authentication.state!=='AUTHENTICATED')return{ok:false,state:authentication.state,auth,row:null,envelope:null,error:authentication.error||null};
    try{
      let session=authentication.session;
      // content_hash is computed from legacy rows until the review-only migration is approved.
      const endpoint=`${CLOUD_URL}/rest/v1/planner_data_v3?user_id=eq.${encodeURIComponent(session.user.id)}&select=data,schema_version,revision,updated_at,last_device_id&limit=1`;
      const plannerRead=await this.readEndpoint(endpoint,session);
      if(plannerRead.authFailure)return{ok:false,state:plannerRead.authFailure.state,auth:publicAuthDiagnostics(plannerRead.authFailure),row:null,envelope:null,error:plannerRead.authFailure.error||'Sign in again to read cloud diagnostics.'};
      session=plannerRead.session;if(plannerRead.auth)auth=plannerRead.auth;
      const response=plannerRead.response;
      const payload=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(payload?.message||payload?.hint||'Cloud diagnostics could not be read.');
      const row=Array.isArray(payload)?payload[0]||null:null;
      const envelope=row?await envelopeFromCloudRow(row):null;
      let snapshots={available:false,count:null,latestRevision:null,latestAt:null,error:null};
      try{
        const snapshotEndpoint=`${CLOUD_URL}/rest/v1/planner_data_v3_snapshots?user_id=eq.${encodeURIComponent(session.user.id)}&select=revision,created_at&order=created_at.desc&limit=1`;
        const snapshotRead=await this.readEndpoint(snapshotEndpoint,session,{Prefer:'count=exact'});
        if(snapshotRead.authFailure)return{ok:false,state:snapshotRead.authFailure.state,auth:publicAuthDiagnostics(snapshotRead.authFailure),row,envelope,error:snapshotRead.authFailure.error||'Sign in again to read snapshot diagnostics.'};
        session=snapshotRead.session;if(snapshotRead.auth)auth=snapshotRead.auth;
        const snapshotResponse=snapshotRead.response;
        const snapshotRows=await snapshotResponse.json().catch(()=>null);
        if(snapshotResponse.ok&&Array.isArray(snapshotRows)){
          const exact=Number(String(snapshotResponse.headers?.get?.('content-range')||'').split('/').at(-1));
          const snapshotCount=Number.isInteger(exact)?exact:snapshotRows.length;
          snapshots={available:snapshotCount>0,count:snapshotCount,latestRevision:snapshotRows[0]?.revision??null,latestAt:snapshotRows[0]?.created_at||null,error:null};
        }else snapshots.error=snapshotRows?.message||snapshotRows?.hint||'Server snapshot diagnostics could not be read.';
      }catch(error){snapshots.error=error?.message||'Server snapshot diagnostics are unavailable.'}
      return{ok:true,state:SYNC_STATES.PAUSED,auth,row,envelope,snapshots,validation:envelope?validateCanonicalEnvelope(envelope):null};
    }catch(error){return{ok:false,state:'OFFLINE',auth,row:null,envelope:null,error:error?.message||'Cloud diagnostics are unavailable.'}}
  }

  async fetchCloudSnapshot(snapshotRevision=4){
    const revision=Number(snapshotRevision);
    if(!Number.isInteger(revision)||revision<0)return{ok:false,state:SYNC_STATES.ERROR,auth:{state:'UNKNOWN',signedIn:false},row:null,envelope:null,error:'A valid snapshot revision is required.'};
    const authentication=await this.authentication();
    let auth=publicAuthDiagnostics(authentication);
    if(authentication.state!=='AUTHENTICATED')return{ok:false,state:authentication.state,auth,row:null,envelope:null,error:authentication.error||null};
    try{
      const endpoint=`${CLOUD_URL}/rest/v1/planner_data_v3_snapshots?user_id=eq.${encodeURIComponent(authentication.session.user.id)}&revision=eq.${revision}&select=data,revision,created_at,device_id,reason&limit=1`;
      const read=await this.readEndpoint(endpoint,authentication.session);
      if(read.authFailure)return{ok:false,state:read.authFailure.state,auth:publicAuthDiagnostics(read.authFailure),row:null,envelope:null,error:read.authFailure.error||'Sign in again to read snapshot diagnostics.'};
      if(read.auth)auth=read.auth;
      const payload=await read.response.json().catch(()=>null);
      if(!read.response.ok)return{ok:false,state:SYNC_STATES.ERROR,auth,row:null,envelope:null,error:payload?.message||payload?.hint||`Snapshot revision ${revision} could not be read.`};
      const row=Array.isArray(payload)?payload[0]||null:null;
      if(!row)return{ok:false,state:SYNC_STATES.ERROR,auth,row:null,envelope:null,error:`Snapshot revision ${revision} was not found.`};
      if(Number(row.revision)!==revision)return{ok:false,state:SYNC_STATES.ERROR,auth,row:null,envelope:null,error:`Snapshot revision mismatch: requested ${revision}, received ${row.revision}.`};
      const envelope=await envelopeFromCloudRow({...row,updated_at:row.created_at,last_device_id:row.device_id});
      return{ok:true,state:SYNC_STATES.PAUSED,auth,row,envelope,requestedRevision:revision};
    }catch(error){return{ok:false,state:SYNC_STATES.OFFLINE,auth,row:null,envelope:null,error:error?.message||`Snapshot revision ${revision} is unavailable.`}}
  }

  async push(){return{ok:false,state:SYNC_STATES.PAUSED,error:'Cloud writes are disabled during the diagnostic phase.'}}
  async pull(){return{ok:false,state:SYNC_STATES.PAUSED,error:'Cloud installation is disabled during the diagnostic phase.'}}
  async seed(){return{ok:false,state:SYNC_STATES.PAUSED,error:'Cloud seeding is disabled until the iPad diagnostic report is approved.'}}
}

export const createSafeSyncEngine=options=>new SafeSyncEngine(options);
