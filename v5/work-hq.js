import{applyDailyAction,selectDailyShit}from'./daily-shit.js?v=5.3.0-study-nook';
import{getDegreeProgressByLevel}from'./study-nook.js?v=5.3.0-study-nook';

export const WORK_DAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
export const CAREER_ROADMAP=[
 {id:'bt-rlt',label:'BT / RLT',kind:'employment'},
 {id:'rbt',label:'RBT',kind:'credential'},
 {id:'lead-rbt',label:'Lead RBT',kind:'employment'},
 {id:'bachelors',label:"Bachelor's Degree",kind:'degree'},
 {id:'bcaba',label:'BCaBA',kind:'credential'},
 {id:'masters',label:"Master's Degree",kind:'degree'},
 {id:'bcba',label:'BCBA',kind:'credential'}
];
export const RBT_JOURNEY=[
 {id:'eligibility',label:'Eligibility'},
 {id:'training',label:'Training'},
 {id:'competency',label:'Competency'},
 {id:'application',label:'Application / authorization'},
 {id:'exam',label:'RBT exam'},
 {id:'certification',label:'Certification'}
];

const list=value=>Array.isArray(value)?value:[];
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const clone=value=>{try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value||{}))}};
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(text(value));
const validTime=value=>/^\d{2}:\d{2}$/.test(text(value));
const makeId=(prefix='work')=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const pathValue=(source,path)=>path.split('.').reduce((value,key)=>value?.[key],source);
const setPath=(source,path,value)=>{const keys=path.split('.');let cursor=source;keys.slice(0,-1).forEach(key=>{cursor[key]=obj(cursor[key]);cursor=cursor[key]});cursor[keys.at(-1)]=value};
const localDate=date=>{const value=new Date(date);return`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`};
const plusDays=(date,amount)=>{const value=new Date(`${date}T12:00:00`);value.setDate(value.getDate()+amount);return localDate(value)};
const mondayOf=date=>{const value=new Date(`${date}T12:00:00`),offset=(value.getDay()+6)%7;value.setDate(value.getDate()-offset);return localDate(value)};
const dayFor=date=>WORK_DAYS[new Date(`${date}T12:00:00`).getDay()];
const csv=value=>(Array.isArray(value)?value:String(value??'').split(',')).map(text).filter(Boolean);
const unique=values=>[...new Set(values.map(text).filter(Boolean))];
const bool=value=>value===true||value==='true'||value==='on'||value==='yes';
const archiveRecord=(state,path,item)=>{const archive=list(pathValue(state,'v4.archive')),record={id:makeId('archive'),kind:path,originalId:item.id,title:text(item.alias||item.code||item.title||item.name)||'Archived work record',data:item,archivedAt:new Date().toISOString()};setPath(state,'v4.archive',[...archive,record]);return record};

function parseLegacyDays(value){
 const raw=text(value).toLowerCase();if(!raw)return[];
 if(/m\s*[-–]\s*th|mon\s*[-–]\s*thu/.test(raw))return['monday','tuesday','wednesday','thursday'];
 return WORK_DAYS.filter(day=>raw.includes(day)||raw.includes(day.slice(0,3)));
}
function normalizeServiceDays(client={}){
 const raw=obj(client.serviceDays),days={};
 WORK_DAYS.forEach(day=>{const source=obj(raw[day]),selected=bool(source.selected??raw[day]??list(client.days).includes(day)),start=text(source.start||client.startTime),end=text(source.end||client.endTime);days[day]={selected,start:validTime(start)?start:'',end:validTime(end)?end:''}});
 parseLegacyDays(client.schedule).forEach(day=>{days[day]={...days[day],selected:true}});
 return days;
}
function defaultCareer(existing={}){
 const currentStage='bt-rlt',targetStage='rbt',roadmap=CAREER_ROADMAP.map(item=>{const saved=obj(list(existing.roadmap).find(row=>row?.id===item.id));return{...item,...saved,status:item.id===currentStage?'current':item.id===targetStage?(saved.status==='complete'?'complete':'target'):saved.status||'future'}});
 const rbtJourney=RBT_JOURNEY.map((item,index)=>({...item,status:index<4?'complete':item.id==='exam'?'current':'locked',...obj(list(existing.rbtJourney).find(row=>row?.id===item.id))}));
 return{requirementsVersion:text(existing.requirementsVersion)||'v1-2026-configurable',requirementDefinitions:obj(existing.requirementDefinitions),...existing,currentStage,targetStage,roadmap,rbtJourney,exam:{date:'',time:'',locationNotes:'',studyAction:'',result:'pending',...obj(existing.exam)}};
}
function legacyClient(row,index){const key=`work.rbt.clients:${text(row?.id)||index}`;return{id:text(row?.id)||makeId('client'),migrationKey:key,alias:text(row?.code||row?.alias)||`Client ${index+1}`,icon:text(row?.icon)||'🧩',color:text(row?.color)||'pink',active:row?.active!==false&&text(row?.status).toLowerCase()!=='inactive',setting:text(row?.setting),supervisorId:text(row?.supervisorId),serviceDays:normalizeServiceDays(row),goalCodes:unique(csv(row?.goalCodes||row?.programCodes)),materialIds:unique(csv(row?.materialIds||row?.materials)),createdAt:text(row?.createdAt)||new Date().toISOString()};}
function legacyPlan(row,index){return{id:text(row?.id)||makeId('session-plan'),migrationKey:`work.rbt.sessions:${text(row?.id)||index}`,clientId:text(row?.clientId),date:text(row?.date),startTime:text(row?.startTime),endTime:text(row?.endTime),supervisorId:text(row?.supervisorId),goalCodes:unique(csv(row?.goalCodes||row?.programCodes)),materials:unique(csv(row?.materials||row?.toys)).map(label=>({id:makeId('packed'),label,packed:false})),checklist:{},prepNotes:text(row?.prepNotes),createdAt:text(row?.createdAt)||new Date().toISOString()};}

export function initializeWorkHQ(source={},today=localDate(new Date())){
 const state=clone(source),work=obj(state.work),existing=obj(work.hq),hq={schemaVersion:1,clients:list(existing.clients),supervisors:list(existing.supervisors),sessionPlans:list(existing.sessionPlans),scheduleExceptions:list(existing.scheduleExceptions),goalLibrary:list(existing.goalLibrary),materialLibrary:list(existing.materialLibrary),career:defaultCareer(obj(existing.career)),migration:{version:1,...obj(existing.migration)}};
 const clientKeys=new Set(hq.clients.map(row=>text(row?.migrationKey))),planKeys=new Set(hq.sessionPlans.map(row=>text(row?.migrationKey)));
 list(work?.rbt?.clients).forEach((row,index)=>{const item=legacyClient(row,index);if(!clientKeys.has(item.migrationKey)){hq.clients.push(item);clientKeys.add(item.migrationKey)}});
 list(work?.rbt?.sessions).forEach((row,index)=>{const item=legacyPlan(row,index);if(!planKeys.has(item.migrationKey)){hq.sessionPlans.push(item);planKeys.add(item.migrationKey)}});
 hq.migration={...hq.migration,version:1,initializedAt:hq.migration.initializedAt||new Date().toISOString(),legacyClients:hq.clients.filter(row=>row.migrationKey).length,legacySessions:hq.sessionPlans.filter(row=>row.migrationKey).length};
 state.work={...work,hq};state.life={...obj(state.life),tasks:list(state?.life?.tasks),reminders:list(state?.life?.reminders),routines:list(state?.life?.routines),routineInstances:list(state?.life?.routineInstances)};state.v4={...obj(state.v4),archive:list(state?.v4?.archive)};
 return{state,hq,changed:JSON.stringify(existing)!==JSON.stringify(hq),today};
}

function baseOccurrences(hq,start,end){
 const rows=[];for(let date=start;date<=end;date=plusDays(date,1)){const day=dayFor(date);hq.clients.filter(client=>client.active!==false&&obj(client.serviceDays)[day]?.selected).forEach(client=>{const schedule=obj(client.serviceDays)[day];rows.push({id:`weekly:${client.id}:${date}`,externalId:`work-hq:session:${client.id}:${date}`,clientId:client.id,date,startTime:text(schedule.start),endTime:text(schedule.end),kind:'weekly'})})}return rows;
}
export function workOccurrences(hq,start,end){
 let rows=baseOccurrences(hq,start,end);for(const exception of list(hq.scheduleExceptions)){
  if(exception.archived===true)continue;const originalDate=text(exception.date),clientId=text(exception.clientId),type=text(exception.type);
  if(type==='cancel')rows=rows.filter(row=>!(String(row.clientId)===clientId&&row.date===originalDate));
  if(type==='move'){const original=rows.find(row=>String(row.clientId)===clientId&&row.date===originalDate);rows=rows.filter(row=>!(String(row.clientId)===clientId&&row.date===originalDate));const date=text(exception.movedTo);if(validDate(date)&&date>=start&&date<=end)rows.push({...(original||{}),id:`move:${exception.id}`,externalId:`work-hq:session:${clientId}:${date}:move:${exception.id}`,clientId,date,startTime:text(exception.startTime||original?.startTime),endTime:text(exception.endTime||original?.endTime),kind:'moved',exceptionId:exception.id})}
  if(type==='time'){rows=rows.map(row=>String(row.clientId)===clientId&&row.date===originalDate?{...row,startTime:text(exception.startTime||row.startTime),endTime:text(exception.endTime||row.endTime),kind:'time-override',exceptionId:exception.id}:row)}
  if(type==='extra'&&originalDate>=start&&originalDate<=end)rows.push({id:`extra:${exception.id}`,externalId:`work-hq:session:${clientId}:${originalDate}:extra:${exception.id}`,clientId,date:originalDate,startTime:text(exception.startTime),endTime:text(exception.endTime),kind:'extra',exceptionId:exception.id});
 }
 return rows.sort((a,b)=>`${a.date}T${a.startTime||'99:99'}`.localeCompare(`${b.date}T${b.startTime||'99:99'}`));
}
function planForOccurrence(hq,occurrence){return hq.sessionPlans.find(plan=>text(plan.occurrenceId)===text(occurrence.id)||(!plan.occurrenceId&&String(plan.clientId)===String(occurrence.clientId)&&plan.date===occurrence.date))||null}
export function prepStatus(plan,date,today){if(date<today)return'Past';if(!plan)return'Not planned';const checks=obj(plan.checklist),checkReady=['confirm-time','review-goals','pack-materials'].every(key=>checks[key]===true),materials=list(plan.materials),packed=materials.every(item=>item.packed===true);if(checkReady&&packed)return'Ready';if(plan.prepNotes||list(plan.goalCodes).length||materials.length||Object.values(checks).some(Boolean))return'Started';return'Not planned'}
function clientLabel(hq,id){return hq.clients.find(row=>String(row.id)===String(id))?.alias||'Client code'}

export function selectWorkHQ(source={},today=localDate(new Date())){
 const initialized=initializeWorkHQ(source,today),hq=initialized.hq,weekStart=mondayOf(today),weekEnd=plusDays(weekStart,6),rangeEnd=plusDays(today,35),scheduled=workOccurrences(hq,weekStart,rangeEnd);list(hq.sessionPlans).filter(plan=>validDate(plan.date)&&plan.date>=weekStart&&plan.date<=rangeEnd&&!scheduled.some(row=>String(row.clientId)===String(plan.clientId)&&row.date===plan.date)).forEach(plan=>scheduled.push({id:plan.occurrenceId||`plan:${plan.id}`,externalId:`work-hq:session-plan:${plan.id}`,clientId:plan.clientId,date:plan.date,startTime:plan.startTime,endTime:plan.endTime,kind:'planned'}));const occurrences=scheduled.sort((a,b)=>`${a.date}T${a.startTime||'99:99'}`.localeCompare(`${b.date}T${b.startTime||'99:99'}`)).map(row=>{const plan=planForOccurrence(hq,row);return{...row,client:clientLabel(hq,row.clientId),plan,prepStatus:prepStatus(plan,row.date,today)}}),todaySessions=occurrences.filter(row=>row.date===today),weekSessions=occurrences.filter(row=>row.date>=weekStart&&row.date<=weekEnd),upcoming=occurrences.filter(row=>row.date>=today).slice(0,12),plans=list(hq.sessionPlans).slice().sort((a,b)=>`${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`)),packing=upcoming.filter(row=>row.plan&&list(row.plan.materials).length).slice(0,4),daily=selectDailyShit(initialized.state,today),importantActions=daily.open.filter(item=>text(item.source?.externalId).startsWith('work-hq:'));
 const currentMilestone=hq.career.roadmap.find(row=>row.id===hq.career.currentStage),targetMilestone=hq.career.roadmap.find(row=>row.id===hq.career.targetStage),exam=hq.career.rbtJourney.find(row=>row.id==='exam');
 const degreeProgress={bachelors:getDegreeProgressByLevel(initialized.state,'bachelors'),masters:getDegreeProgressByLevel(initialized.state,'masters')};
 return{...initialized,hq,occurrences,todaySessions,weekSessions,upcoming,plans,packing,importantActions,currentMilestone,targetMilestone,exam,degreeProgress};
}

function replaceById(rows,id,next){const index=rows.findIndex(row=>String(row?.id)===String(id));return index<0?[...rows,next]:rows.map((row,rowIndex)=>rowIndex===index?next:row)}
function cleanTimes(start,end){return{startTime:validTime(start)?start:'',endTime:validTime(end)?end:''}}
function taskLink(state,{externalId,title,date,priority='today',energy='medium',duration=10,sourceId,sourceType}){return applyDailyAction(state,{type:'ensure-linked',kind:'task',externalId,title,date,priority,energy,duration,sourceId,sourceType},date||localDate(new Date()))}
function fail(error){return{ok:false,error}}

export function applyWorkAction(source={},action={},today=localDate(new Date())){
 const initialized=initializeWorkHQ(source,today),state=initialized.state,hq=state.work.hq,type=text(action.type),now=new Date().toISOString();
 if(type==='initialize')return{ok:true,state,result:hq};
 if(type==='client-save'){
  const alias=text(action.alias||action.code);if(!alias)return fail('Use a client alias or code.');const old=hq.clients.find(row=>String(row.id)===String(action.id)),id=old?.id||makeId('client'),same=cleanTimes(action.sameStart,action.sameEnd),days={};WORK_DAYS.forEach(day=>{const selected=bool(action.serviceDays?.[day]??action[day]),own=cleanTimes(action[`${day}Start`],action[`${day}End`]);days[day]={selected,start:own.startTime||same.startTime,end:own.endTime||same.endTime}});const item={...old,id,alias,icon:text(action.icon)||old?.icon||'🧩',color:text(action.color)||old?.color||'pink',active:action.active===undefined?old?.active!==false:bool(action.active),setting:text(action.setting),supervisorId:text(action.supervisorId),serviceDays:days,goalCodes:unique(csv(action.goalCodes)),materialIds:unique(csv(action.materialIds)),createdAt:old?.createdAt||now,updatedAt:now};hq.clients=replaceById(hq.clients,id,item);return{ok:true,state,result:item};
 }
 if(type==='client-archive'){const item=hq.clients.find(row=>String(row.id)===String(action.id));if(!item)return fail('That client code is no longer here.');hq.clients=hq.clients.filter(row=>String(row.id)!==String(item.id));return{ok:true,state,result:archiveRecord(state,'work.hq.clients',item)};}
 if(type==='supervisor-save'){const name=text(action.name||action.alias);if(!name)return fail('Add a supervisor name or alias.');const old=hq.supervisors.find(row=>String(row.id)===String(action.id)),id=old?.id||makeId('supervisor'),item={...old,id,name,credential:text(action.credential),role:text(action.role),active:action.active===undefined?old?.active!==false:bool(action.active),createdAt:old?.createdAt||now,updatedAt:now};hq.supervisors=replaceById(hq.supervisors,id,item);return{ok:true,state,result:item};}
 if(type==='supervisor-archive'){const item=hq.supervisors.find(row=>String(row.id)===String(action.id));if(!item)return fail('That supervisor is no longer here.');hq.supervisors=hq.supervisors.filter(row=>String(row.id)!==String(item.id));hq.clients=hq.clients.map(client=>client.supervisorId===item.id?{...client,supervisorId:''}:client);return{ok:true,state,result:archiveRecord(state,'work.hq.supervisors',item)};}
 if(type==='goal-save'){const code=text(action.code).toUpperCase(),label=text(action.label);if(!code||!label)return fail('Add a de-identified code and short label.');const old=hq.goalLibrary.find(row=>String(row.id)===String(action.id)||text(row.code).toUpperCase()===code),id=old?.id||makeId('program'),item={...old,id,code,label,active:true,createdAt:old?.createdAt||now,updatedAt:now};hq.goalLibrary=replaceById(hq.goalLibrary,id,item);return{ok:true,state,result:item};}
 if(type==='material-save'){const label=text(action.label);if(!label)return fail('Name the material or toy.');const old=hq.materialLibrary.find(row=>String(row.id)===String(action.id)||text(row.label).toLowerCase()===label.toLowerCase()),id=old?.id||makeId('material'),item={...old,id,label,category:text(action.category)||'Session materials',active:true,createdAt:old?.createdAt||now,updatedAt:now};hq.materialLibrary=replaceById(hq.materialLibrary,id,item);return{ok:true,state,result:item};}
 if(type==='library-archive'){const key=action.kind==='goal'?'goalLibrary':'materialLibrary',item=list(hq[key]).find(row=>String(row.id)===String(action.id));if(!item)return fail('That library item is no longer here.');hq[key]=list(hq[key]).filter(row=>String(row.id)!==String(item.id));return{ok:true,state,result:archiveRecord(state,`work.hq.${key}`,item)};}
 if(type==='exception-save'){const exceptionType=['cancel','move','time','extra'].includes(text(action.exceptionType))?text(action.exceptionType):'cancel',clientId=text(action.clientId),date=text(action.date);if(!hq.clients.some(row=>String(row.id)===clientId)||!validDate(date))return fail('Choose a client code and exception date.');if(exceptionType==='move'&&!validDate(action.movedTo))return fail('Choose the moved session date.');const old=hq.scheduleExceptions.find(row=>String(row.id)===String(action.id)),id=old?.id||makeId('exception'),times=cleanTimes(action.startTime,action.endTime),item={...old,id,type:exceptionType,clientId,date,movedTo:exceptionType==='move'?text(action.movedTo):'',...times,note:text(action.note),createdAt:old?.createdAt||now,updatedAt:now};hq.scheduleExceptions=replaceById(hq.scheduleExceptions,id,item);return{ok:true,state,result:item};}
 if(type==='exception-archive'){const item=hq.scheduleExceptions.find(row=>String(row.id)===String(action.id));if(!item)return fail('That schedule exception is no longer here.');hq.scheduleExceptions=hq.scheduleExceptions.filter(row=>String(row.id)!==String(item.id));return{ok:true,state,result:archiveRecord(state,'work.hq.scheduleExceptions',item)};}
 if(type==='plan-save'){const clientId=text(action.clientId),date=text(action.date);if(!hq.clients.some(row=>String(row.id)===clientId)||!validDate(date))return fail('Choose a client code and session date.');const old=hq.sessionPlans.find(row=>String(row.id)===String(action.id)),id=old?.id||makeId('session-plan'),times=cleanTimes(action.startTime,action.endTime),libraryMaterials=unique(csv(action.materialIds)).map(materialId=>hq.materialLibrary.find(row=>String(row.id)===String(materialId))?.label).filter(Boolean),labels=unique([...libraryMaterials,...csv(action.adHocMaterials),...csv(action.materials)]),oldPacked=new Map(list(old?.materials).map(item=>[text(item.label).toLowerCase(),item.packed===true])),item={...old,id,occurrenceId:text(action.occurrenceId),clientId,date,...times,supervisorId:text(action.supervisorId),goalCodes:unique(csv(action.goalCodes)),materials:labels.map(label=>({id:list(old?.materials).find(row=>text(row.label).toLowerCase()===label.toLowerCase())?.id||makeId('packed'),label,packed:oldPacked.get(label.toLowerCase())||false})),checklist:{...obj(old?.checklist),...obj(action.checklist)},prepNotes:text(action.prepNotes),createdAt:old?.createdAt||now,updatedAt:now};hq.sessionPlans=replaceById(hq.sessionPlans,id,item);return{ok:true,state,result:item};}
 if(type==='plan-toggle-packed'){const plan=hq.sessionPlans.find(row=>String(row.id)===String(action.id));if(!plan)return fail('That session plan is no longer here.');const materials=list(plan.materials).map(item=>String(item.id)===String(action.itemId)?{...item,packed:!item.packed}:item),next={...plan,materials,updatedAt:now};hq.sessionPlans=replaceById(hq.sessionPlans,plan.id,next);return{ok:true,state,result:next};}
 if(type==='plan-toggle-check'){const plan=hq.sessionPlans.find(row=>String(row.id)===String(action.id)),key=text(action.key);if(!plan||!['confirm-time','review-goals','pack-materials'].includes(key))return fail('That prep item is no longer here.');const next={...plan,checklist:{...obj(plan.checklist),[key]:!obj(plan.checklist)[key]},updatedAt:now};hq.sessionPlans=replaceById(hq.sessionPlans,plan.id,next);return{ok:true,state,result:next};}
 if(type==='plan-duplicate'){const plan=hq.sessionPlans.find(row=>String(row.id)===String(action.id));if(!plan)return fail('That session plan is no longer here.');const nextOccurrence=workOccurrences(hq,plusDays(plan.date,1),plusDays(plan.date,45)).find(row=>String(row.clientId)===String(plan.clientId));if(!nextOccurrence)return fail('No next recurring session is scheduled in the next 45 days.');const externalId=`duplicate:${plan.id}:${nextOccurrence.id}`,existing=hq.sessionPlans.find(row=>row.externalId===externalId);if(existing)return{ok:true,state,result:existing,reused:true};const next={...plan,id:makeId('session-plan'),externalId,sourcePlanId:plan.id,occurrenceId:nextOccurrence.id,date:nextOccurrence.date,startTime:nextOccurrence.startTime,endTime:nextOccurrence.endTime,materials:list(plan.materials).map(item=>({...item,id:makeId('packed'),packed:false})),checklist:{},createdAt:now,updatedAt:now};hq.sessionPlans.push(next);return{ok:true,state,result:next};}
 if(type==='exam-save'){hq.career.exam={...hq.career.exam,date:validDate(action.date)?text(action.date):'',time:validTime(action.time)?text(action.time):'',locationNotes:text(action.locationNotes),studyAction:text(action.studyAction),result:['pending','scheduled','passed','not-passed'].includes(text(action.result))?text(action.result):hq.career.exam.result,updatedAt:now};return{ok:true,state,result:hq.career.exam};}
 if(type==='exam-pass'){if(action.confirmed!==true)return fail('Confirm the passed exam result first.');hq.career.exam={...hq.career.exam,result:'passed',updatedAt:now};hq.career.rbtJourney=hq.career.rbtJourney.map(row=>row.id==='exam'?{...row,status:'complete',completedAt:now}:row.id==='certification'?{...row,status:'current'}:row);return{ok:true,state,result:hq.career.exam};}
 if(type==='career-milestone'){const milestone=hq.career.roadmap.find(row=>row.id===action.id);if(!milestone)return fail('That career milestone is not available.');hq.career.roadmap=hq.career.roadmap.map(row=>row.id===milestone.id?{...row,status:'complete',completedAt:now}:row);return{ok:true,state,result:milestone};}
 if(type==='link-daily'){let link;if(action.linkKind==='pack'){const plan=hq.sessionPlans.find(row=>String(row.id)===String(action.id));if(!plan)return fail('Create the session plan first.');link={externalId:`work-hq:pack:${plan.id}`,title:`Pack materials for ${clientLabel(hq,plan.clientId)}`,date:plan.date,priority:'today',energy:'low',duration:10,sourceId:plan.id,sourceType:'work-session-plan'}}else if(action.linkKind==='exam'){link={externalId:'work-hq:rbt-exam',title:'Schedule RBT exam',date:validDate(hq.career.exam.date)?hq.career.exam.date:today,priority:'today',energy:'medium',duration:15,sourceId:'rbt-exam',sourceType:'career-milestone'}}else{const occurrence=workOccurrences(hq,today,plusDays(today,45)).find(row=>row.id===action.occurrenceId);if(!occurrence)return fail('That upcoming session is no longer available.');link={externalId:`work-hq:plan:${occurrence.id}`,title:`Plan ${clientLabel(hq,occurrence.clientId)} session`,date:occurrence.date,priority:'today',energy:'medium',duration:15,sourceId:occurrence.id,sourceType:'work-session'}}const result=taskLink(state,link);return result.ok?{...result,workResult:link}:result;}
 return fail('That Work HQ action is not available.');
}
