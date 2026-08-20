export const ARCHIVE_POLICY_VERSION=1;
const list=v=>Array.isArray(v)?v:[];
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();
export function archiveRefs(state={}){return list(object(object(state.profile).preferences).archiveRefs).map(x=>({kind:text(x.kind),id:text(x.id),archivedAt:text(x.archivedAt)})).filter(x=>x.kind&&x.id)}
export function isArchived(state,kind,id){const k=text(kind),target=text(id);return archiveRefs(state).some(x=>x.kind===k&&x.id===target)}
export function activeOnly(state,kind,items=[]){return list(items).filter(item=>!isArchived(state,kind,item?.id))}
export function setArchived(state,kind,id,archived=true){const k=text(kind),target=text(id);if(!k||!target)return state;const prefs=object(object(state.profile).preferences),refs=archiveRefs(state).filter(x=>!(x.kind===k&&x.id===target));if(archived)refs.push({kind:k,id:target,archivedAt:new Date().toISOString()});return{...state,profile:{...object(state.profile),preferences:{...prefs,archiveRefs:refs}}}}
export function archiveRecord(state,kind,id){return setArchived(state,kind,id,true)}
export function restoreRecord(state,kind,id){return setArchived(state,kind,id,false)}
export function archiveCount(state){return archiveRefs(state).length}
