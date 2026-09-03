// Small, deterministic Food + Journey helpers. This module intentionally makes
// no health claims and does not infer goals from body data.
const list=value=>Array.isArray(value)?value:[];
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const number=value=>Number.isFinite(Number(value))?Number(value):0;

export const JOURNEY_DEFAULTS=Object.freeze({goalWeight:145,goalZone:5});

export function normalizeJourney(value){
  const source=obj(value);
  return {
    ...source,
    goalWeight:Number.isFinite(Number(source.goalWeight))?Number(source.goalWeight):JOURNEY_DEFAULTS.goalWeight,
    goalZone:Math.max(0,Number.isFinite(Number(source.goalZone))?Number(source.goalZone):JOURNEY_DEFAULTS.goalZone),
    mealPrep:list(source.mealPrep),
  };
}

export function normalizeMovement(value){
  const source=obj(value);
  return {
    ...source,
    sessions:list(source.sessions), routines:list(source.routines), videos:list(source.videos), weighIns:list(source.weighIns),
    roadTo10k:{goalSteps:10000,logs:[],...obj(source.roadTo10k)},
    workoutPlan:{months:[],...obj(source.workoutPlan),months:list(source.workoutPlan?.months)},
  };
}

export function goalZone(journey){
  const normalized=normalizeJourney(journey),center=normalized.goalWeight,spread=normalized.goalZone;
  return {center,low:center-spread,high:center+spread};
}

export function feedMeRecommendation(state,{lowEnergy=false}={}){
  const noms=obj(state?.nourish?.noms),foods=list(noms.foods).filter(food=>food?.available!==false&&Number(food?.quantity??1)!==0);
  const ready=list(normalizeJourney(noms.journey).mealPrep).filter(item=>item?.status!=='finished'&&item?.ready!==false);
  const candidates=[...ready.map(item=>({...item,name:item.name||item.label,source:'meal-prep',prepMinutes:Number(item.prepMinutes||0),effort:item.effort||'low'})),...foods.map(food=>({...food,source:'nom'}))]
    .filter(item=>text(item.name));
  const low=candidates.filter(item=>['none','low','easy','tiny'].includes(text(item.effort).toLowerCase())||Number(item.prepMinutes||0)<=10);
  const pool=(lowEnergy&&low.length?low:candidates).slice();
  pool.sort((a,b)=>Number(a.prepMinutes||0)-Number(b.prepMinutes||0)||String(a.name).localeCompare(String(b.name)));
  return pool[0]||null;
}

export function roadTo10kStatus(movement,date){
  const road=normalizeMovement(movement).roadTo10k,log=list(road.logs).find(item=>item.date===date);
  const steps=Math.max(0,number(log?.steps));
  const goal=Math.max(1,number(road.goalSteps)||10000);
  return {steps,goal,remaining:Math.max(0,goal-steps),percent:Math.min(100,Math.round(steps/goal*100))};
}

export function progressionFromFeedback(sessions){
  const last=list(sessions).filter(session=>session?.status!=='skipped'&&session?.status!=='rest').slice().sort((a,b)=>String(b.date||b.loggedAt).localeCompare(String(a.date||a.loggedAt)))[0];
  const feedback=text(last?.feedback).toLowerCase();
  if(feedback==='tough'||feedback==='drained')return {action:'repeat-gentler',reason:'Your latest feedback said it felt tough. Repeat a gentler version or rest; no automatic jump.'};
  if(feedback==='easy')return {action:'optional-advance',reason:'Your latest feedback said it felt easy. You can choose a small advance if it still feels right.'};
  if(feedback==='okay')return {action:'repeat',reason:'Your latest feedback said it was okay. Repeat before changing anything.'};
  return {action:'choose-baseline',reason:'No feedback yet. Start with a version that feels doable, then let your feedback guide the next step.'};
}

const MONTH_FOCUSES=['Choose a gentle baseline','Build a repeatable warm-up','Find a comfortable walking rhythm','Practice simple strength basics','Keep options small','Make low-energy versions easy','Notice what helps recovery','Try one optional challenge','Protect consistency without pressure','Refresh favorites','Practice confidence','Review and choose what stays'];
export function createWorkoutScaffold(existing=[]){
  return list(existing).length?list(existing):MONTH_FOCUSES.map((focus,index)=>({id:`workout-month-${index+1}`,month:index+1,title:`Month ${index+1}`,focus,status:'not-started',lowEnergyVersion:'A shorter, gentler version still counts.',createdAt:new Date().toISOString()}));
}
