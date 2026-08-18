const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clean=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const stamp=()=>new Date().toISOString();
const makeId=prefix=>`${prefix}_${globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`}`;
const effortValues=new Set(['no-prep','easy','medium','involved']);

export const EMPTY_NOMS={foods:[],pantry:[],groceries:[],recipes:[],mealPlan:[],emergencyNoms:[],today:null};

/** Non-mutating, preservation-first reader for the Noms portion of KatOS state. */
export function normalizeNoms(value){
 const source=isObject(value)?value:{};const noms={...EMPTY_NOMS,...source};
 for(const key of ['foods','pantry','groceries','recipes','mealPlan','emergencyNoms'])if(!Array.isArray(noms[key]))noms[key]=[];
 if(noms.today!==null&&!isObject(noms.today))noms.today=null;
 return noms;
}

const active=entries=>list(entries).filter(entry=>entry&&!entry.archived);
const tags=value=>list(value).map(clean).filter(Boolean);
const optionalEffort=value=>effortValues.has(value)?value:'';
const result=(ok,extra={})=>({ok,...extra});
const findActive=(entries,id)=>active(entries).find(entry=>String(entry.id)===String(id));

export const allNoms=state=>active(normalizeNoms(state?.noms).foods);
export const favoriteNoms=state=>allNoms(state).filter(nom=>!!nom.favorite);
export const pantryItems=state=>active(normalizeNoms(state?.noms).pantry);
export const linkedNomForPantry=(state,pantryId)=>{const item=pantryItems(state).find(entry=>String(entry.id)===String(pantryId));return item?.nomId?allNoms(state).find(nom=>String(nom.id)===String(item.nomId))||null:null};
export const groceryItems=(state,{includeObtained=false}={})=>active(normalizeNoms(state?.noms).groceries).filter(item=>includeObtained||!item.obtained);
export const allRecipes=state=>active(normalizeNoms(state?.noms).recipes);
export const allPlannedMeals=state=>active(normalizeNoms(state?.noms).mealPlan).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
export const plannedMealsForDate=(state,date)=>active(normalizeNoms(state?.noms).mealPlan).filter(meal=>String(meal.date)===String(date||''));
export const emergencyNoms=state=>{
 const noms=normalizeNoms(state?.noms),foods=allNoms(state);return active(noms.emergencyNoms).map(link=>foods.find(food=>String(food.id)===String(link.nomId))).filter(Boolean);
};
export const todayNom=state=>{
 const today=normalizeNoms(state?.noms).today;if(!today)return null;
 const nom=today.nomId?allNoms(state).find(entry=>String(entry.id)===String(today.nomId)):null;
 return{...today,nom:nom||null,label:nom?.name||today.text||''};
};
export function nomsMatchingFilters(state,{effort='',tag='',favorite=false}={}){
 const wanted=clean(tag).toLowerCase();return allNoms(state).filter(nom=>(!effort||nom.effort===effort)&&(!wanted||tags(nom.tags).some(item=>item.toLowerCase()===wanted))&&(!favorite||nom.favorite));
}
export function chooseSurpriseNom(state,filters={},random=Math.random){
 const choices=nomsMatchingFilters(state,filters);return choices.length?choices[Math.floor(Math.max(0,Math.min(.999999,Number(random())||0))*choices.length)]:null;
}

export function createNomsActions(store){
 const updateNoms=updater=>{let actionResult=null;store.update(state=>{const current=normalizeNoms(state.noms);const changed=updater(current,state);actionResult=changed?.result||result(false,{error:'Noms change could not be saved.'});return changed?.noms?{...state,noms:changed.noms}:state});return actionResult};
 const updateEntry=(collection,id,changes,label)=>updateNoms(noms=>{const entry=findActive(noms[collection],id);if(!entry)return{result:result(false,{error:`${label} was not found.`})};const next={...entry,...changes,updatedAt:stamp()};return{noms:{...noms,[collection]:noms[collection].map(item=>String(item.id)===String(id)?next:item)},result:result(true,{item:next})}});
 const archiveEntry=(collection,id,label)=>updateEntry(collection,id,{archived:true},label);
 return{
  addNom(input={}){const name=clean(input.name);if(!name)return result(false,{error:'A Nom needs a name.'});return updateNoms(noms=>{const now=stamp(),item={id:makeId('nom'),name,type:clean(input.type),favorite:!!input.favorite,notes:clean(input.notes),effort:optionalEffort(input.effort),tags:tags(input.tags),createdAt:now,updatedAt:now};return{noms:{...noms,foods:[...noms.foods,item]},result:result(true,{item})}})},
  updateNom(id,input={}){return updateEntry('foods',id,{name:clean(input.name),type:clean(input.type),favorite:!!input.favorite,notes:clean(input.notes),effort:optionalEffort(input.effort),tags:tags(input.tags)},'Nom')},
  archiveNom(id){return archiveEntry('foods',id,'Nom')},
  addPantryItem(input={}){const name=clean(input.name);if(!name)return result(false,{error:'A pantry item needs a name.'});return updateNoms(noms=>{const now=stamp(),item={id:makeId('pantry'),name,quantity:clean(input.quantity),unit:clean(input.unit),notes:clean(input.notes),expiresAt:clean(input.expiresAt),createdAt:now,updatedAt:now};return{noms:{...noms,pantry:[...noms.pantry,item]},result:result(true,{item})}})},
  updatePantryItem(id,input={}){const name=clean(input.name);if(!name)return result(false,{error:'A pantry item needs a name.'});return updateEntry('pantry',id,{name,quantity:clean(input.quantity),unit:clean(input.unit),notes:clean(input.notes),expiresAt:clean(input.expiresAt)},'Pantry item')},
  archivePantryItem(id){return archiveEntry('pantry',id,'Pantry item')},
  linkPantryToNom(pantryId,nomId){return updateNoms(noms=>{const pantry=findActive(noms.pantry,pantryId),nom=findActive(noms.foods,nomId);if(!pantry)return{result:result(false,{error:'Pantry item was not found.'})};if(!nom)return{result:result(false,{error:'Nom was not found.'})};if(String(pantry.nomId||'')===String(nom.id))return{noms,result:result(true,{item:pantry,duplicate:true})};const item={...pantry,nomId:nom.id,updatedAt:stamp()};return{noms:{...noms,pantry:noms.pantry.map(entry=>String(entry.id)===String(pantryId)?item:entry)},result:result(true,{item})}})},
  addGroceryItem(input={}){const name=clean(input.name);if(!name)return result(false,{error:'A grocery item needs a name.'});return updateNoms(noms=>{const now=stamp(),item={id:makeId('grocery'),name,quantity:clean(input.quantity),notes:clean(input.notes),obtained:false,createdAt:now,updatedAt:now};return{noms:{...noms,groceries:[...noms.groceries,item]},result:result(true,{item})}})},
  updateGroceryItem(id,input={}){const name=clean(input.name);if(!name)return result(false,{error:'A grocery item needs a name.'});return updateEntry('groceries',id,{name,quantity:clean(input.quantity),notes:clean(input.notes)},'Grocery item')},
  completeGroceryItem(id,obtained=true){return updateEntry('groceries',id,{obtained:!!obtained},'Grocery item')},
  archiveGroceryItem(id){return archiveEntry('groceries',id,'Grocery item')},
  addGroceryToPantry(id){return updateNoms(noms=>{const grocery=findActive(noms.groceries,id);if(!grocery)return{result:result(false,{error:'Grocery item was not found.'})};const now=stamp(),pantry={id:makeId('pantry'),name:grocery.name,quantity:grocery.quantity||'',unit:'',notes:grocery.notes||'',expiresAt:'',createdAt:now,updatedAt:now};const groceries=noms.groceries.map(item=>String(item.id)===String(id)?{...item,obtained:true,updatedAt:now}:item);return{noms:{...noms,pantry:[...noms.pantry,pantry],groceries},result:result(true,{item:pantry})}})},
  addRecipe(input={}){const name=clean(input.name);if(!name)return result(false,{error:'A recipe needs a name.'});return updateNoms(noms=>{const now=stamp(),item={id:makeId('recipe'),name,ingredients:clean(input.ingredients),instructions:clean(input.instructions),notes:clean(input.notes),tags:tags(input.tags),effort:optionalEffort(input.effort),nomId:clean(input.nomId)||null,createdAt:now,updatedAt:now};return{noms:{...noms,recipes:[...noms.recipes,item]},result:result(true,{item})}})},
  updateRecipe(id,input={}){const name=clean(input.name);if(!name)return result(false,{error:'A recipe needs a name.'});return updateEntry('recipes',id,{name,ingredients:clean(input.ingredients),instructions:clean(input.instructions),notes:clean(input.notes),tags:tags(input.tags),effort:optionalEffort(input.effort),nomId:clean(input.nomId)||null},'Recipe')},
  archiveRecipe(id){return archiveEntry('recipes',id,'Recipe')},
  setPlannedMeal(input={}){const date=clean(input.date),text=clean(input.text),nomId=clean(input.nomId)||null;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||(!text&&!nomId))return result(false,{error:'Choose a date and a Nom or meal name.'});return updateNoms(noms=>{if(nomId&&!findActive(noms.foods,nomId))return{result:result(false,{error:'That Nom was not found.'})};const now=stamp(),item={id:makeId('meal'),date,slot:clean(input.slot),nomId,text,createdAt:now,updatedAt:now};return{noms:{...noms,mealPlan:[...noms.mealPlan,item]},result:result(true,{item})}})},
  archivePlannedMeal(id){return archiveEntry('mealPlan',id,'Planned meal')},
  addEmergencyNom(nomId){return updateNoms(noms=>{const food=findActive(noms.foods,nomId);if(!food)return{result:result(false,{error:'Choose a saved Nom first.'})};const existing=active(noms.emergencyNoms).find(link=>String(link.nomId)===String(nomId));if(existing)return{result:result(true,{item:existing,duplicate:true})};const item={id:makeId('emergency'),nomId,createdAt:stamp()};return{noms:{...noms,emergencyNoms:[...noms.emergencyNoms,item]},result:result(true,{item})}})},
  archiveEmergencyNom(id){return archiveEntry('emergencyNoms',id,'Emergency Nom')},
  setTodayNom(input={}){const nomId=clean(input.nomId)||null,text=clean(input.text);if(!nomId&&!text)return result(false,{error:'Choose a Nom or enter today’s meal.'});return updateNoms(noms=>{if(nomId&&!findActive(noms.foods,nomId))return{result:result(false,{error:'That Nom was not found.'})};const today={nomId,text,updatedAt:stamp()};return{noms:{...noms,today},result:result(true,{item:today})}})},
  clearTodayNom(){return updateNoms(noms=>({noms:{...noms,today:null},result:result(true)}))}
 };
}
