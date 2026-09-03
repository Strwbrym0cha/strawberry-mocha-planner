import assert from'node:assert/strict';
import{applyLifestyleAction,getGrowthNextStep,getHobbies,getHobbyRecommendation,getMovementActivities,getMovementSummary,getRecommendedMovement,initializeLifestyle,selectLifestyle}from'./lifestyle.js';

const today='2026-09-03';
let source={life:{tasks:[]},movement:{sessions:[{id:'walk-old',label:'Old walk',date:'2026-09-01',minutes:10}],routines:[{id:'gentle',name:'Gentle stretch',minutes:8,energy:'tiny'}]},growth:{goals:[{id:'trust',title:'Build self trust',nextStep:'Write one kind sentence'}],wins:[{id:'win-old',title:'Finished training',date:'2026-08-30'}]},v4:{hobbies:[{id:'anime',name:'Anime',status:'playing'}],people:[{id:'sentimental',name:'Mom',relationship:'Family',important:'Keep this memory'},{id:'dream',name:'Learn Chinese someday',notes:'A future dream'}],archive:[]}};
let initialized=initializeLifestyle(source,today),state=initialized.state;
assert.equal(initialized.changed,true);
assert.equal(getMovementActivities(state).length,1,'legacy movement history is preserved');
assert.equal(getHobbies(state).some(row=>row.legacyId==='anime'),true,'legacy hobbies move into the shelf additively');
assert.equal(state.v4.people.length,2,'My Loves source data remains untouched');
assert.equal(state.v4.archive.some(row=>row.id==='my-loves-preserved:sentimental'),true,'sentimental My Loves data archives safely');
assert.equal(state.lifestyle.growth.goals.some(row=>row.id==='myloves-growth:dream'),true,'clear aspiration may bridge to Growth');
const again=initializeLifestyle(state,today);
assert.equal(again.changed,false,'lifestyle migration is idempotent');
assert.equal(again.state.v4.archive.filter(row=>row.id==='my-loves-preserved:sentimental').length,1,'preserved notes never duplicate');
state=again.state;

const run=action=>{const result=applyLifestyleAction(state,action,today);assert.equal(result.ok,true,result.error);state=result.state;return result.result};
const plan=run({type:'movement-plan-save',title:'Five minute stretch',movementType:'stretching',minutes:5,intensity:'very-gentle',energy:'tiny',timeOfDay:'anytime'});
assert.equal(getRecommendedMovement(state,{energy:'low',minutes:10}).id,plan.id,'movement recommendation is deterministic by time and energy');
const activity=run({type:'movement-activity-save',title:'Stretch',date:today,movementType:'stretching',minutes:5,intensity:'gentle',energy:'tiny',status:'planned'});
run({type:'movement-activity-save',id:activity.id,title:'Stretch',date:today,movementType:'stretching',minutes:7,intensity:'gentle',energy:'tiny',status:'completed'});
assert.equal(getMovementActivities(state).filter(row=>row.id===activity.id).length,1,'movement edits preserve one history record');
assert.equal(getMovementSummary(state,today).weekMinutes>=7,true);
run({type:'link-daily',kind:'movement-activity',id:activity.id});
run({type:'link-daily',kind:'movement-activity',id:activity.id});
assert.equal(state.life.tasks.filter(row=>row.externalId===`lifestyle:movement-activity:${activity.id}`).length,1,'movement Daily Shit link is stable');

const hobby=run({type:'hobby-save',title:'Coloring',category:'creative',status:'current',energy:'tiny',minutes:10,nextStep:'Color one flower'});
assert.equal(getHobbyRecommendation(state,{mode:'tiny'}).id,hobby.id,'Tiny hobby picker respects time and energy');
const project=run({type:'hobby-project-save',title:'Finish coloring page',hobbyId:hobby.id,status:'active',targetDate:'2026-09-10',nextStep:'Pick colors'});
run({type:'hobby-resource-save',title:'Pink pencils',hobbyId:hobby.id,resourceKind:'supply',status:'have'});
assert.equal(selectLifestyle(state,today).hobbies.projects.some(row=>row.id===project.id),true);

const area=run({type:'growth-area-save',title:'Self trust',status:'active'});
const goal=run({type:'growth-goal-save',title:'Practice being kind to myself',areaId:area.id,status:'active',targetDate:'2026-09-08',nextStep:'Write one kind sentence'});
run({type:'growth-milestone-save',title:'One gentle week',goalId:goal.id,status:'active',targetDate:'2026-09-08'});
run({type:'growth-win-save',title:'Asked for help',areaId:area.id,date:today});
run({type:'growth-reflection-save',title:'What helped',goalId:goal.id,date:today,notes:'Rest'});
assert.equal(getGrowthNextStep(state).id,goal.id,'growth next step is deterministic');
run({type:'archive',kind:'hobby-project',id:project.id});
assert.equal(selectLifestyle(state,today).hobbies.projects.some(row=>row.id===project.id),false,'history-rich lifestyle records archive instead of deleting');
assert.equal(state.v4.archive.some(row=>row.originalId===project.id),true,'archived lifestyle record enters Memory Box');
assert.equal(state.v4.archive.find(row=>row.originalId===project.id).kind,'lifestyle.hobbies.projects','Memory Box keeps the restorable collection path');

console.log('V5 lifestyle behavior tests passed');
