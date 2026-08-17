import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('./noms.js',import.meta.url),'utf8');
const noms=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const dataSource=await readFile(new URL('./data.js',import.meta.url),'utf8');
const data=await import(`data:text/javascript;base64,${Buffer.from(dataSource).toString('base64')}`);
const legacy=data.normalize({tasks:[{id:'legacy-task',text:'Still here'}],unknownLegacyValue:{keep:true}});
assert.equal(legacy.tasks[0].id,'legacy-task');assert.deepEqual(legacy.noms,data.DEFAULT_NOMS);assert.equal(legacy.unknownLegacyValue.keep,true);
let state={tasks:[{id:'task-kept',text:'Keep planner data'}],legacyField:{keep:true}};
const store={get:()=>state,update:updater=>{state=updater(state)}};
const actions=noms.createNomsActions(store);

assert.deepEqual(noms.normalizeNoms(undefined),noms.EMPTY_NOMS,'legacy snapshots without noms get a safe empty Noms shape');
const saved=actions.addNom({name:'Quesadillas',effort:'easy',tags:['savory','quick'],favorite:true});
assert.equal(saved.ok,true);assert.equal(noms.allNoms(state).length,1);assert.equal(state.tasks[0].id,'task-kept');assert.equal(state.legacyField.keep,true);
const nomId=saved.item.id;assert.equal(actions.updateNom(nomId,{name:'Quesadillas deluxe',effort:'easy',tags:['savory'],favorite:true}).ok,true);assert.equal(noms.allNoms(state)[0].name,'Quesadillas deluxe');
assert.equal(actions.addEmergencyNom(nomId).ok,true);assert.equal(noms.emergencyNoms(state)[0].id,nomId);
const pantry=actions.addPantryItem({name:'Tortillas',quantity:'1',unit:'pack'});assert.equal(pantry.ok,true);assert.equal(noms.pantryItems(state).length,1);
const grocery=actions.addGroceryItem({name:'Cheese',quantity:'1 bag'});assert.equal(grocery.ok,true);assert.equal(noms.groceryItems(state).length,1);assert.equal(actions.addGroceryToPantry(grocery.item.id).ok,true);assert.equal(noms.pantryItems(state).length,2);assert.equal(noms.groceryItems(state).length,0,'explicit pantry action completes the grocery item');
const recipe=actions.addRecipe({name:'Bean quesadilla',nomId,ingredients:'Tortilla, cheese'});assert.equal(recipe.ok,true);assert.equal(noms.allRecipes(state).length,1);
const meal=actions.setPlannedMeal({date:'2026-08-17',nomId,slot:'dinner'});assert.equal(meal.ok,true);assert.equal(noms.plannedMealsForDate(state,'2026-08-17').length,1);
assert.equal(actions.setTodayNom({nomId}).ok,true);assert.equal(noms.todayNom(state).label,'Quesadillas deluxe');assert.equal(actions.clearTodayNom().ok,true);assert.equal(noms.todayNom(state),null);
assert.equal(actions.archiveNom(nomId).ok,true);assert.equal(noms.allNoms(state).length,0,'archived Noms leave the active list without deleting the saved record');assert.equal(state.noms.foods[0].archived,true);
assert.equal(actions.updateNom('missing',{name:'Nope'}).ok,false,'invalid IDs fail safely');assert.equal(actions.addNom({}).ok,false,'missing required names fail safely');
console.log('Noms deterministic tests: PASS');
