const list=value=>Array.isArray(value)?value:[];
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const clone=value=>{try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value||{}))}};
const makeId=()=>`launch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
function atPath(state,path,value){const keys=path.split('.');let cursor=state;keys.slice(0,-1).forEach(key=>{cursor[key]=obj(cursor[key]);cursor=cursor[key]});cursor[keys.at(-1)]=value}
function titleOf(row,fallback='Next thing'){return text(row?.title||row?.text||row?.name||row?.label)||fallback}
function timeOf(row){return text(row?.startTime||row?.time)}
function dateOf(row){return text(row?.date||row?.dueDate||row?.startDate)}
function formatTime(value){if(!/^\d{2}:\d{2}$/.test(text(value)))return'';const[h,m]=value.split(':').map(Number),d=new Date(2000,0,1,h,m);return d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
function minutesUntil(row,now){const value=timeOf(row);if(!/^\d{2}:\d{2}$/.test(value))return Number.POSITIVE_INFINITY;const[h,m]=value.split(':').map(Number);return h*60+m-(now.getHours()*60+now.getMinutes())}
function timeRank(row,now,nearRank,laterRank){const delta=minutesUntil(row,now);return delta<=90?nearRank:laterRank}
function route(kind,row){
  if(kind==='routine')return{view:'daily',open:`edit-routine-${row.id}`,lane:''};
  if(kind==='task'||kind==='ping')return{view:'daily',open:`edit-${kind}-${row.id}`,lane:''};
  if(kind==='gig')return{view:'boss',open:'',lane:'gig'};
  if(kind==='work')return{view:'boss',open:row.id?`session-${row.id}`:'',lane:''};
  if(kind==='study')return{view:'study',open:row.id?`course-${row.id}`:'',lane:''};
  return{view:'time',open:'',lane:''};
}
function candidate(kind,row,{title,meta,firstMove,smallerStep,rank=50}={}){const target=route(kind,row);return{key:`${kind}:${row.id}`,kind,id:String(row.id),title:title||titleOf(row),meta:meta||'',firstMove,smallerStep,...target,rank}}

export function selectLaunchPad(state={},date,canonical={},now=new Date()){
  const daily=canonical.daily||{},work=canonical.work||{},study=canonical.study||{},candidates=[];
  list(state?.work?.gigShifts).filter(row=>dateOf(row)===date&&text(row.status||'planned')==='planned').forEach(row=>candidates.push(candidate('gig',row,{title:'DoorDash shift',meta:[formatTime(timeOf(row)),row.endTime?`to ${formatTime(row.endTime)}`:'',Number(row.targetAmount)>0?`$${Number(row.targetAmount).toFixed(0)} target`:'',text(row.area)].filter(Boolean).join(' · '),firstMove:'Put on your shoes and grab your charger.',smallerStep:'Put your shoes where you can reach them.',rank:timeRank(row,now,10,45)})));
  const session=list(work.todaySessions).find(row=>!['complete','completed','canceled'].includes(text(row.status).toLowerCase()))||list(work.upcoming).find(row=>dateOf(row)===date);
  if(session)candidates.push(candidate('work',session,{title:titleOf(session,session.client||'Work session'),meta:[formatTime(timeOf(session)),text(session.client)].filter(Boolean).join(' · '),firstMove:'Gather the materials you need for this session.',smallerStep:'Put one needed item by the door.',rank:timeRank(session,now,15,35)}));
  const ritual=list(daily.routines).find(row=>!['complete','skipped'].includes(text(row.status).toLowerCase()));
  if(ritual){const statuses=obj(ritual.instance?.steps),next=list(ritual.steps).find(step=>!['complete','skipped'].includes(text(statuses[step.id]).toLowerCase())),move=!ritual.tinyStartDone&&ritual.tinyStart?ritual.tinyStart:next?.label||'Open the routine.';candidates.push(candidate('routine',ritual,{meta:`${ritual.complete||0}/${ritual.total||0} steps counted`,firstMove:move,smallerStep:ritual.tinyStart||`Stand up for ${ritual.title}.`,rank:30}))}
  if(daily.rightNow)candidates.push(candidate(daily.rightNow.kind||'task',daily.rightNow,{meta:[daily.rightNow.time?formatTime(daily.rightNow.time):'',daily.rightNow.duration?`${daily.rightNow.duration} min`:''].filter(Boolean).join(' · '),firstMove:text(daily.rightNow.source?.firstStep)||`Open what you need for ${daily.rightNow.title}.`,smallerStep:text(daily.rightNow.source?.childSteps?.[0]?.label)||`Stand up and look at ${daily.rightNow.title}.`,rank:25}));
  if(study.focus)candidates.push(candidate('study',study.focus,{title:study.focus.title,meta:`${Number(study.focus.progressPercent)||0}% complete`,firstMove:'Open the course page.',smallerStep:'Put the iPad or laptop in front of you.',rank:60}));
  list(state?.life?.events).filter(row=>dateOf(row)===date).forEach(row=>candidates.push(candidate('event',row,{meta:[formatTime(timeOf(row)),text(row.location)].filter(Boolean).join(' · '),firstMove:'Gather what you need before this starts.',smallerStep:'Check where you need to be.',rank:timeRank(row,now,12,42)})));
  const records=list(state?.life?.launches).filter(row=>row?.date===date),byKey=new Map(records.map(row=>[text(row.sourceKey),row])),available=candidates.filter(row=>byKey.get(row.key)?.status!=='not-now').sort((a,b)=>{const aStarted=byKey.get(a.key)?.status==='started',bStarted=byKey.get(b.key)?.status==='started';return Number(bStarted)-Number(aStarted)||a.rank-b.rank||timeOf(a).localeCompare(timeOf(b))});
  const selected=available[0]||null;if(!selected)return{date,item:null,records};
  const record=byKey.get(selected.key)||null,stateName=text(record?.status)||'ready';return{date,item:{...selected,state:stateName,displayMove:stateName==='smaller'?selected.smallerStep:selected.firstMove,startedAt:text(record?.startedAt)},records};
}

export function applyLaunchAction(source,action={},today,newNow=new Date()){
  const state=clone(source),date=/^\d{4}-\d{2}-\d{2}$/.test(text(action.date))?text(action.date):today,key=text(action.key),type=text(action.type),rows=list(state?.life?.launches),index=rows.findIndex(row=>row?.date===date&&text(row.sourceKey)===key),existing=index>=0?rows[index]:{},now=newNow.toISOString();
  if(!key)return{ok:false,error:'That Launch Pad item is no longer available.'};
  const status=type==='launch-start'?'started':type==='launch-smaller'?'smaller':type==='launch-dismiss'?'not-now':'';
  if(!status)return{ok:false,error:'That Launch Pad action is not available yet.'};
  const record={...existing,id:existing.id||makeId(),date,sourceKey:key,sourceKind:text(action.kind),sourceId:text(action.id),status,updatedAt:now,createdAt:existing.createdAt||now};if(status==='started')record.startedAt=now;if(status==='not-now')record.dismissedAt=now;
  atPath(state,'life.launches',index>=0?rows.map((row,rowIndex)=>rowIndex===index?record:row):[...rows,record]);return{ok:true,state,result:record};
}
