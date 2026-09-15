import * as base from './work-hq.js?base=7.0.22-odometer-sunday-payout';

export const WORK_DAYS=base.WORK_DAYS;
export const CAREER_ROADMAP=base.CAREER_ROADMAP;
export const RBT_JOURNEY=base.RBT_JOURNEY;
export const workOccurrences=base.workOccurrences;
export const prepStatus=base.prepStatus;

const text=value=>String(value??'').trim();
const bool=value=>value===true||value==='true'||value==='on'||value==='yes';
const list=value=>Array.isArray(value)?value:[];

function careerFlags(career={}){
  const journey=list(career.rbtJourney);
  const examPassed=text(career.exam?.result)==='passed'||journey.some(row=>row?.id==='exam'&&row?.status==='complete');
  const certified=career.certified===true||text(career.currentStage)==='rbt'||journey.some(row=>row?.id==='certification'&&row?.status==='complete');
  return{examPassed,certified};
}

function normalizeCareer(hq){
  const career=hq?.career;if(!career)return hq;
  const now=new Date().toISOString(),flags=careerFlags(career);
  if(flags.examPassed){
    career.exam={...(career.exam||{}),result:'passed'};
    career.rbtJourney=list(career.rbtJourney).map(row=>row.id==='exam'?{...row,status:'complete',completedAt:row.completedAt||career.exam?.updatedAt||now}:row.id==='certification'&&!flags.certified?{...row,status:'current'}:row);
  }
  if(flags.certified){
    career.certified=true;
    career.currentStage='rbt';
    career.targetStage=text(career.targetStage)&&career.targetStage!=='rbt'?career.targetStage:'lead-rbt';
    career.rbtJourney=list(career.rbtJourney).map(row=>row.id==='exam'||row.id==='certification'?{...row,status:'complete',completedAt:row.completedAt||career.certifiedAt||now}:row);
    career.roadmap=list(career.roadmap).map(row=>row.id==='bt-rlt'?{...row,status:'complete'}:row.id==='rbt'?{...row,status:'current'}:row.id===career.targetStage&&row.status==='future'?{...row,status:'target'}:row);
  }
  return hq;
}

export function initializeWorkHQ(source={},today){
  const result=base.initializeWorkHQ(source,today);
  normalizeCareer(result.hq);
  return{...result,hq:result.state?.work?.hq||result.hq};
}

export function selectWorkHQ(source={},today){
  const result=base.selectWorkHQ(source,today);
  const hq=normalizeCareer(result.hq),career=hq?.career||{},flags=careerFlags(career);
  const currentMilestone=flags.certified?list(career.roadmap).find(row=>row.id==='rbt')||{id:'rbt',label:'RBT'}:result.currentMilestone;
  const targetMilestone=list(career.roadmap).find(row=>row.id===career.targetStage)||result.targetMilestone;
  return{...result,hq,currentMilestone,targetMilestone,exam:list(career.rbtJourney).find(row=>row.id==='exam')||result.exam};
}

export function applyWorkAction(source={},action={},today){
  if(text(action.type)==='career-certify'){
    const initialized=base.applyWorkAction(source,{type:'initialize'},today);
    if(!initialized.ok)return initialized;
    const state=initialized.state,hq=state?.work?.hq,career=hq?.career;
    if(!career)return{ok:false,error:'Career Climb is not available yet.'};
    if(!bool(action.confirmed))return{ok:false,error:'Confirm that your RBT certification is active first.'};
    const flags=careerFlags(career);
    if(!flags.examPassed)return{ok:false,error:'Mark the RBT exam as passed before confirming certification.'};
    const now=new Date().toISOString();
    career.certified=true;
    career.certifiedAt=career.certifiedAt||now;
    career.currentStage='rbt';
    career.targetStage='lead-rbt';
    career.rbtJourney=list(career.rbtJourney).map(row=>row.id==='exam'||row.id==='certification'?{...row,status:'complete',completedAt:row.completedAt||now}:row);
    career.roadmap=list(career.roadmap).map(row=>row.id==='bt-rlt'?{...row,status:'complete'}:row.id==='rbt'?{...row,status:'current',completedAt:row.completedAt||now}:row.id==='lead-rbt'&&row.status==='future'?{...row,status:'target'}:row);
    return{ok:true,state,result:{stage:'rbt',certifiedAt:career.certifiedAt}};
  }
  const result=base.applyWorkAction(source,action,today);
  if(result.ok&&result.state?.work?.hq)normalizeCareer(result.state.work.hq);
  return result;
}
