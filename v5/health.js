const list=value=>Array.isArray(value)?value:[];
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const clone=value=>{try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value||{}))}};
const dateOk=value=>/^\d{4}-\d{2}-\d{2}$/.test(text(value));
const timeOk=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(text(value));
const makeId=(prefix='medication')=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

function atPath(state,path,value){const keys=path.split('.');let cursor=state;keys.slice(0,-1).forEach(key=>{cursor[key]=obj(cursor[key]);cursor=cursor[key]});cursor[keys.at(-1)]=value}
function dayIndex(date){return new Date(`${date}T12:00:00`).getDay()}
function occursToday(medication,date){
  const repeat=text(medication.repeat||'daily').toLowerCase(),day=dayIndex(date);
  if(repeat==='as-needed')return true;
  if(repeat==='weekdays')return day>=1&&day<=5;
  if(repeat==='weekends')return day===0||day===6;
  return true;
}
function minutesOf(value){const match=text(value).match(/^(\d{2}):(\d{2})$/);return match?Number(match[1])*60+Number(match[2]):Number.POSITIVE_INFINITY}
function localMinutes(now){return now.getHours()*60+now.getMinutes()}
function formatClock(value){if(!timeOk(value))return'Any time';const[h,m]=value.split(':').map(Number),d=new Date(2000,0,1,h,m);return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
function latestLog(logs,medicationId,date){return logs.filter(row=>String(row?.medicationId)===String(medicationId)&&row?.date===date).sort((a,b)=>text(b.updatedAt||b.createdAt).localeCompare(text(a.updatedAt||a.createdAt)))[0]||null}
function latestTaken(logs,medicationId){return logs.filter(row=>String(row?.medicationId)===String(medicationId)&&row?.status==='taken').sort((a,b)=>text(b.takenAt||b.updatedAt).localeCompare(text(a.takenAt||a.updatedAt)))[0]||null}
function displayStatus(medication,log,now){
  if(log?.status==='taken')return'taken';
  if(log?.status==='skipped')return'skipped';
  if(log?.status==='snoozed'&&Date.parse(log.snoozedUntil)>now.getTime())return'snoozed';
  if(text(medication.repeat).toLowerCase()==='as-needed')return'as-needed';
  const delta=minutesOf(medication.time)-localMinutes(now);
  if(delta>30)return'upcoming';
  if(delta>0)return'due-soon';
  return'due';
}

export function selectMedicationCabinet(state={},date,{now=new Date()}={}){
  const allMedications=list(state?.health?.medications).filter(row=>row?.archived!==true),medications=allMedications.filter(row=>row?.active!==false&&occursToday(row,date));
  const logs=list(state?.health?.medicationLogs),items=medications.map(medication=>{
    const log=latestLog(logs,medication.id,date),lastTaken=latestTaken(logs,medication.id),status=displayStatus(medication,log,now);
    return{...medication,id:String(medication.id),name:text(medication.name)||'Medication',dose:text(medication.dose),time:timeOk(medication.time)?medication.time:'',timeLabel:formatClock(medication.time),repeat:text(medication.repeat)||'daily',instructions:text(medication.instructions),notes:text(medication.notes),status,log,lastTakenAt:text(lastTaken?.takenAt),snoozedUntil:text(log?.snoozedUntil)};
  }).sort((a,b)=>minutesOf(a.time)-minutesOf(b.time)||a.name.localeCompare(b.name));
  const due=items.filter(row=>['due','due-soon'].includes(row.status)),open=items.filter(row=>!['taken','skipped'].includes(row.status)),taken=items.filter(row=>row.status==='taken');
  const medicationById=new Map(allMedications.map(row=>[String(row.id),row])),history=logs.slice().sort((a,b)=>text(b.takenAt||b.skippedAt||b.snoozedUntil||b.updatedAt).localeCompare(text(a.takenAt||a.skippedAt||a.snoozedUntil||a.updatedAt))).slice(0,14).map(log=>{const medication=medicationById.get(String(log.medicationId))||{};return{...log,name:text(medication.name)||'Archived medication',dose:text(medication.dose)}});
  return{date,items,due,open,taken,allMedications,logs,history};
}

function fail(error){return{ok:false,error}}
function normalizeMedication(action,existing={}){
  const repeat=['daily','weekdays','weekends','as-needed'].includes(text(action.repeat))?text(action.repeat):text(existing.repeat)||'daily';
  return{...existing,name:text(action.name),dose:text(action.dose),time:repeat==='as-needed'?'':text(action.time),repeat,instructions:text(action.instructions),notes:text(action.notes),active:action.active===true||action.active==='on'||action.active==='true'};
}

export function applyHealthAction(source,action={},today,newNow=new Date()){
  const state=clone(source),type=text(action.type),date=dateOk(action.date)?action.date:today,medications=list(state?.health?.medications),logs=list(state?.health?.medicationLogs),id=text(action.id),index=medications.findIndex(row=>String(row?.id)===id),existing=index>=0?medications[index]:null,now=newNow.toISOString();
  if(!dateOk(date))return fail('A local planner date is required.');
  if(type==='medication-add'||type==='medication-update'){
    const entry=normalizeMedication(action,existing||{});
    if(!entry.name)return fail('Give the medication schedule a name.');
    if(entry.repeat!=='as-needed'&&!timeOk(entry.time))return fail('Choose a scheduled time, or mark it as needed.');
    if(type==='medication-update'&&!existing)return fail('That medication schedule is no longer here.');
    const saved={...entry,id:existing?.id||makeId(),createdAt:existing?.createdAt||now,updatedAt:now};
    atPath(state,'health.medications',index>=0?medications.map((row,rowIndex)=>rowIndex===index?saved:row):[...medications,saved]);
    return{ok:true,state,result:saved};
  }
  if(type==='medication-archive'){
    if(!existing)return fail('That medication schedule is no longer here.');
    const archive=list(state?.v4?.archive),record={id:makeId('archive'),kind:'health.medications',originalId:existing.id,title:existing.name||'Medication schedule',data:existing,archivedAt:now};
    atPath(state,'health.medications',medications.filter((_,rowIndex)=>rowIndex!==index));atPath(state,'v4.archive',[...archive,record]);return{ok:true,state,result:record};
  }
  if(type==='medication-log'){
    if(!existing)return fail('That medication schedule is no longer here.');
    const status=['taken','skipped','snoozed','undo'].includes(text(action.status))?text(action.status):'';
    if(!status)return fail('Choose how to log this dose.');
    const kept=logs.filter(row=>!(String(row?.medicationId)===id&&row?.date===date));
    if(status==='undo'){atPath(state,'health.medicationLogs',kept);return{ok:true,state,result:null};}
    const minutes=Math.max(5,Math.min(240,Number(action.minutes)||15)),log={id:`med-log-${id}-${date}`,medicationId:id,date,scheduledTime:existing.time||'',status,createdAt:now,updatedAt:now};
    if(status==='taken')log.takenAt=now;
    if(status==='skipped')log.skippedAt=now;
    if(status==='snoozed')log.snoozedUntil=new Date(newNow.getTime()+minutes*60000).toISOString();
    atPath(state,'health.medicationLogs',[...kept,log]);return{ok:true,state,result:log};
  }
  return fail('That medication action is not available yet.');
}
