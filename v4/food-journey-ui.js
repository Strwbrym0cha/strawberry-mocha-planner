import{createWorkoutScaffold,normalizeJourney,normalizeMovement}from'./journey.js';

const runtime=window.__KATOS_V4_RUNTIME;
const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const id=prefix=>runtime.makeId(prefix);
const today=()=>runtime.today();
const commit=(state,message)=>runtime.setState(state,message);

function journey(state){
  state.nourish={...(state.nourish||{}),noms:{...(state.nourish?.noms||{})}};
  state.nourish.noms.journey=normalizeJourney(state.nourish.noms.journey);
  state.movement=normalizeMovement(state.movement);
  return state;
}

document.addEventListener('submit',event=>{
  const form=event.target.closest('form[data-form]');
  if(!form||!form.dataset.form.startsWith('journey-'))return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const data=Object.fromEntries(new FormData(form).entries());
  const state=journey(structuredClone(runtime.getState()));
  if(form.dataset.form==='journey-prep'){
    const name=text(data.name); if(!name)return;
    state.nourish.noms.journey.mealPrep.push({id:id('meal-prep'),name,prepMinutes:Math.max(0,Number(data.prepMinutes)||0),effort:data.effort||'low',ready:true,createdAt:new Date().toISOString()});
    commit(state,'Meal prep saved');
  }else if(form.dataset.form==='journey-weight'){
    const weight=Number(data.weight); if(!Number.isFinite(weight)||weight<=0)return;
    state.movement.weighIns.push({id:id('weigh-in'),weight,date:data.date||today(),note:text(data.note),createdAt:new Date().toISOString()});
    state.nourish.noms.journey.goalWeight=Math.max(1,Number(data.goalWeight)||145);
    state.nourish.noms.journey.goalZone=Math.max(0,Number(data.goalZone)||5);
    commit(state,'Personal check-in saved');
  }else if(form.dataset.form==='journey-steps'){
    const steps=Math.max(0,Number(data.steps)||0),date=data.date||today();
    state.movement.roadTo10k.goalSteps=Math.max(1000,Number(data.goalSteps)||10000);
    state.movement.roadTo10k.logs=[...list(state.movement.roadTo10k.logs).filter(item=>item.date!==date),{id:id('steps'),date,steps,createdAt:new Date().toISOString()}];
    commit(state,'Road to 10K updated');
  }else if(form.dataset.form==='journey-workout-feedback'){
    const status=data.status||'completed';
    state.movement.sessions.push({id:id('motion'),type:data.type||'movement',label:text(data.label)||'Workout',minutes:Math.max(0,Number(data.minutes)||0),effort:data.effort||'low',feedback:data.feedback||'',status,date:data.date||today(),loggedAt:new Date().toISOString(),source:'journey'});
    commit(state,status==='rest'?'Rest logged with no guilt math':status==='skipped'?'Skipped without penalty':'Workout feedback saved');
  }
});

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]'); if(!button)return;
  if(button.dataset.action==='journey-create-scaffold'){
    const state=journey(structuredClone(runtime.getState()));
    state.movement.workoutPlan.months=createWorkoutScaffold(state.movement.workoutPlan.months);
    commit(state,'12-month movement scaffold ready');
  }else if(button.dataset.action==='journey-finish-prep'){
    const state=journey(structuredClone(runtime.getState()));
    state.nourish.noms.journey.mealPrep=state.nourish.noms.journey.mealPrep.map(item=>item.id===button.dataset.id?{...item,status:'finished',ready:false,finishedAt:new Date().toISOString()}:item);
    commit(state,'Meal prep marked finished');
  }
});
