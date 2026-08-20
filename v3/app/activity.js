export const ACTIVITY_VERSION=1;
const list=v=>Array.isArray(v)?v:[];const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};const text=v=>String(v??'').trim();
export function normalizeActivityEvent(value,index=0){const v=object(value);return{id:text(v.id)||`activity-${index}`,type:text(v.type)||'activity',targetId:text(v.targetId),timestamp:text(v.timestamp)||new Date().toISOString(),context:object(v.context),detail:object(v.detail),source:text(v.source)||'katos'}}
export function normalizeActivityLog(value){return list(value).map(normalizeActivityEvent)}
export function contextSnapshot(context={}){const c=object(context);return{brain:text(c.brain),energy:text(c.energy),capacity:text(c.capacity),pressure:text(c.pressure),socialBattery:text(c.socialBattery),mode:text(c.mode),currentActivity:text(c.currentActivity)}}
export function createActivityEvent(type,targetId='',context={},detail={},source='katos'){return normalizeActivityEvent({id:`activity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,type,targetId,timestamp:new Date().toISOString(),context:contextSnapshot(context),detail:object(detail),source})}
export function addActivityEvent(log,type,targetId='',context={},detail={},source='katos'){return[...normalizeActivityLog(log),createActivityEvent(type,targetId,context,detail,source)]}
