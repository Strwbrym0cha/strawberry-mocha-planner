export const ROOM_STORAGE_KEY='katos_v6_new_rooms_v1';
export const ROOM_SCHEMA_VERSION=5;

const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const iso=()=>new Date().toISOString();
const makeId=()=>globalThis.crypto?.randomUUID?.()||`v6-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const clone=value=>JSON.parse(JSON.stringify(value));

export function emptyRoomState(){
 return{schemaVersion:ROOM_SCHEMA_VERSION,bell:{settings:{},reminders:[]},rose:{watches:[],games:[],projects:[],ideas:[],cozy:[],obsessions:[]},moon:{cycles:[],checkins:[],experiments:[]},love:{settings:{privacyMode:false},profiles:[],plans:[],dateIdeas:[],topics:[],gifts:[],memories:[],velvet:[]},wishing:{plans:[],messages:[]},kitchen:{settings:{weekDays:5},recipes:[],mealPlans:[],groceries:[],freezer:[],useSoon:[],components:[],prepRuns:[]},smart:{settings:{capacityOverride:'',contextMode:'Home',recoveryDay:false,recoveryDate:''},openLoops:[],decisions:[],taskMeta:[],resetRecipes:[],prepPacks:[],calendarLinks:[],gigRoutes:[],adaptiveGoals:[],maintenance:[],inventory:[],skills:[],wiki:[],brainRoutes:[],nextHourPlans:[]},living:{settings:{foyerOrder:['capacity','schedule','focus','context','next-hour'],hiddenWidgets:[]},chapters:[],milestones:[],pins:[]}};
}

export function normalizeRoomState(value){
 const base=emptyRoomState(),source=value&&typeof value==='object'?value:{};
 for(const room of ['bell','rose','moon','love','wishing','kitchen','living']){
  const current=source[room]&&typeof source[room]==='object'?source[room]:{};
  for(const collection of Object.keys(base[room])){
   if(Array.isArray(base[room][collection]))base[room][collection]=list(current[collection]).filter(row=>row&&typeof row==='object');
   else if(collection==='settings')base[room].settings={...base[room].settings,...(current.settings||{})};
  }
 }
 const smart=source.smart&&typeof source.smart==='object'?source.smart:{};base.smart.settings={...base.smart.settings,...(smart.settings||{})};for(const collection of Object.keys(base.smart).filter(key=>key!=='settings'))base.smart[collection]=list(smart[collection]).filter(row=>row&&typeof row==='object');
 return base;
}

export function newRecord(fields={},now=iso()){
 return{id:makeId(),createdAt:now,updatedAt:now,archivedAt:null,...clone(fields)};
}

export function activeRecords(rows,{includeArchived=false}={}){
 return list(rows).filter(row=>includeArchived||!row.archivedAt).sort((a,b)=>text(b.updatedAt||b.createdAt).localeCompare(text(a.updatedAt||a.createdAt)));
}

export function createRoomStore(storage=globalThis.localStorage){
 const load=()=>{try{return normalizeRoomState(JSON.parse(storage?.getItem(ROOM_STORAGE_KEY)||'null'))}catch{return emptyRoomState()}};
 const save=state=>{const normalized=normalizeRoomState(state);storage?.setItem(ROOM_STORAGE_KEY,JSON.stringify(normalized));return normalized};
 const change=fn=>{const state=load();const result=fn(state);save(state);return result};
 const records=(room,collection,options)=>activeRecords(load()?.[room]?.[collection],options);
 const create=(room,collection,fields)=>change(state=>{const record=newRecord(fields);state[room][collection].push(record);return clone(record)});
 const update=(room,collection,id,fields)=>change(state=>{const record=state[room][collection].find(row=>row.id===id);if(!record)throw new Error('Record not found.');Object.assign(record,clone(fields),{id:record.id,createdAt:record.createdAt,updatedAt:iso()});return clone(record)});
 const archive=(room,collection,id,value=true)=>update(room,collection,id,{archivedAt:value?iso():null});
 const remove=(room,collection,id)=>change(state=>{const index=state[room][collection].findIndex(row=>row.id===id);if(index<0)return false;state[room][collection].splice(index,1);return true});
 const settings=(room,fields)=>change(state=>Object.assign(state[room].settings,clone(fields)));
 return{load,save,change,records,create,update,archive,remove,settings};
}

export function incrementWatchEpisode(watch,{confirmBeyondTotal=false}={}){
 if(text(watch?.type)==='Movie')return{changed:false,reason:'movie',record:clone(watch)};
 const episode=Math.max(0,Number(watch?.episode)||0),total=Number(watch?.totalEpisodes)||0;
 if(total&&episode>=total&&!confirmBeyondTotal)return{changed:false,reason:'total',record:clone(watch)};
 return{changed:true,reason:null,record:{...clone(watch),episode:episode+1}};
}

const timeRank=value=>({'15':15,'30':30,'60':60,'120':120,'2+':120}[String(value)]||Number(value)||999);
const costRank=value=>({'$0':0,'under $10':10,'flexible':999}[String(value).toLowerCase()]??(Number(String(value).replace(/[^0-9.]/g,''))||999));
const energyRank=value=>({tiny:1,medium:2,lots:3}[String(value).toLowerCase()]||2);
export function boredSuggestions(rose,filters={}){
 const maxTime=timeRank(filters.time||'120'),maxEnergy=energyRank(filters.energy||'lots'),maxCost=costRank(filters.budget||'flexible');
 const candidates=[
  ...activeRecords(rose?.cozy).map(row=>({...row,source:'Cozy Menu',label:row.activity,time:row.timeRange,energy:row.energy,cost:row.cost})),
  ...activeRecords(rose?.projects).filter(row=>!['Finished','Paused'].includes(row.status)).map(row=>({...row,source:row.projectType==='Side Quest'?'Side Quest':'Hobby Project',label:row.name,time:row.timeRange,energy:row.energy,cost:row.cost})),
  ...activeRecords(rose?.ideas).map(row=>({...row,source:'Idea Garden',label:row.idea,time:row.timeRange,energy:row.energy,cost:row.cost}))
 ];
 const context=String(filters.context||'').toLowerCase(),placeWanted=/out/.test(context)?'outdoor':/home|study|work|bed/.test(context)?'indoor':'';
 return candidates.filter(row=>timeRank(row.time||'120')<=maxTime&&energyRank(row.energy||'medium')<=maxEnergy&&costRank(row.cost||'flexible')<=maxCost&&(!placeWanted||!row.place||String(row.place).toLowerCase()==='either'||String(row.place).toLowerCase()===placeWanted));
}

export function convertRoseIdea(store,id,target){
 return store.change(state=>{
  const idea=state.rose.ideas.find(row=>row.id===id);if(!idea)throw new Error('Idea not found.');if(idea.convertedTo)return clone(idea.convertedTo);
  const now=iso();let record;
  if(target==='wishing'){
   record=newRecord({title:idea.idea,category:idea.category||'Fun',horizon:'Someday',status:'Dreaming',notes:idea.notes||'',sourceIdeaId:idea.id},now);state.wishing.plans.push(record);
  }else{
   record=newRecord({name:idea.idea,category:idea.category||'',status:target==='side-quest'?'Doing':'Idea',projectType:target==='side-quest'?'Side Quest':'Hobby Project',description:idea.notes||'',sourceIdeaId:idea.id},now);state.rose.projects.push(record);
  }
  idea.convertedTo={room:target==='wishing'?'wishing':'rose',id:record.id,type:target};idea.archivedAt=now;idea.updatedAt=now;return clone(idea.convertedTo);
 });
}

const dayDiff=(a,b)=>Math.round((new Date(`${b}T12:00:00`)-new Date(`${a}T12:00:00`))/86400000);
export function estimateNextCycle(cycles){
 const completed=activeRecords(cycles).filter(row=>row.startDate&&row.endDate).sort((a,b)=>a.startDate.localeCompare(b.startDate));
 if(completed.length<2)return null;
 const gaps=[];for(let i=1;i<completed.length;i++){const gap=dayDiff(completed[i-1].startDate,completed[i].startDate);if(gap>10&&gap<80)gaps.push(gap)}
 if(!gaps.length)return null;const average=Math.round(gaps.reduce((sum,value)=>sum+value,0)/gaps.length),last=completed.at(-1).startDate,next=new Date(`${last}T12:00:00`);next.setDate(next.getDate()+average);
 return{date:next.toISOString().slice(0,10),averageDays:average,sampleSize:gaps.length,label:'Estimate'};
}

export function addExperimentCheckin(store,experimentId,fields){
 const state=store.load(),experiment=state.moon.experiments.find(row=>row.id===experimentId);if(!experiment)throw new Error('Experiment not found.');
 return store.update('moon','experiments',experimentId,{checkIns:[...list(experiment.checkIns),newRecord(fields)]});
}

export function addMilestone(store,planId,fields){
 const state=store.load(),plan=state.wishing.plans.find(row=>row.id===planId);if(!plan)throw new Error('Plan not found.');
 return store.update('wishing','plans',planId,{milestones:[...list(plan.milestones),newRecord({status:'Not started',...fields})]});
}

export function moveMilestone(store,planId,milestoneId,direction){
 const state=store.load(),plan=state.wishing.plans.find(row=>row.id===planId);if(!plan)throw new Error('Plan not found.');const rows=list(plan.milestones),from=rows.findIndex(row=>row.id===milestoneId),to=from+(direction==='up'?-1:1);if(from<0||to<0||to>=rows.length)return plan;[rows[from],rows[to]]=[rows[to],rows[from]];return store.update('wishing','plans',planId,{milestones:rows});
}

export function dueFutureMessages(messages,today=new Date().toISOString().slice(0,10),context={}){
 const complete=row=>['achieved','complete','completed','finished'].includes(text(row?.status||row?.state).toLowerCase())||row?.done===true||row?.completed===true;
 return activeRecords(messages).filter(row=>{
  const trigger=text(row.triggerType||'Date');
  if(trigger==='Plan achieved')return Boolean(row.linkedPlanId&&list(context.plans).some(plan=>String(plan.id)===String(row.linkedPlanId)&&text(plan.status)==='Achieved'));
  if(trigger==='Course completed')return Boolean(row.triggerRecordId&&list(context.courses).some(course=>String(course.id)===String(row.triggerRecordId)&&complete(course)));
  if(trigger==='Goal completed')return Boolean(row.triggerRecordId&&list(context.goals).some(goal=>String(goal.id)===String(row.triggerRecordId)&&complete(goal)));
  return!row.surfaceDate||row.surfaceDate<=today;
 });
}

export function concealedLabel(record,privacyMode){
 return privacyMode&&record?.private!==false?'Private Entry 🔒':text(record?.title||record?.plan||record?.idea||record?.gift||record?.whatHappened||record?.message)||'Private Entry';
}

export function parseKitchenIngredients(value){
 const rows=Array.isArray(value)?value:String(value||'').split(/\r?\n|,/);
 return rows.map(row=>typeof row==='string'?{name:row.trim(),amount:''}:{name:text(row?.name),amount:text(row?.amount),unit:text(row?.unit)}).filter(row=>row.name);
}

export function kitchenWeekProposal(kitchen,options={}){
 const wanted=Math.max(1,Math.min(21,Number(options.count)||Number(options.breakfasts||0)+Number(options.lunches||0)+Number(options.dinners||0)+Number(options.snacks||0)||7)),tags=String(options.tags||'').toLowerCase().split(',').map(value=>value.trim()).filter(Boolean),use=String(options.useIngredients||'').toLowerCase().split(',').map(value=>value.trim()).filter(Boolean),effort=text(options.effort).toLowerCase(),recipes=activeRecords(kitchen?.recipes).filter(recipe=>{
  const haystack=`${recipe.name} ${list(recipe.tags).join(' ')} ${parseKitchenIngredients(recipe.ingredients).map(row=>row.name).join(' ')}`.toLowerCase();
  return(!tags.length||tags.some(tag=>haystack.includes(tag)))&&(!use.length||use.some(item=>haystack.includes(item)))&&(!effort||effort==='any'||haystack.includes(effort)||Number(recipe.prepTime||0)+Number(recipe.cookTime||0)<=20);
 });
 const pool=recipes.length?recipes:activeRecords(kitchen?.recipes),types=[...Array(Number(options.breakfasts)||0).fill('Breakfast'),...Array(Number(options.lunches)||0).fill('Lunch'),...Array(Number(options.dinners)||0).fill('Dinner'),...Array(Number(options.snacks)||0).fill('Snack')];
 return Array.from({length:Math.min(wanted,Math.max(types.length,pool.length?1:0))},(_,index)=>{const recipe=pool[index%pool.length];return recipe?{proposalId:`proposal-${index}`,recipeId:recipe.id,name:recipe.name,mealType:types[index]||recipe.mealType||'Meal',servings:Number(recipe.servings)||1}:{proposalId:`proposal-${index}`,name:'Choose a saved recipe',mealType:types[index]||'Meal',servings:1}});
}

export function generateKitchenGroceries(kitchen,mealPlans=activeRecords(kitchen?.mealPlans)){
 const recipes=new Map(activeRecords(kitchen?.recipes).map(row=>[row.id,row])),map=new Map;
 for(const plan of mealPlans){const recipe=recipes.get(plan.recipeId);if(!recipe)continue;const scale=(Number(plan.servings)||Number(recipe.servings)||1)/(Number(recipe.servings)||1);for(const ingredient of parseKitchenIngredients(recipe.ingredients)){const key=ingredient.name.toLowerCase().replace(/\s+/g,' ').trim(),amount=Number(ingredient.amount);const current=map.get(key)||{ingredient:ingredient.name,amount:0,unit:ingredient.unit||'',sourceRecipeIds:[]};if(Number.isFinite(amount)&&amount>0)current.amount=Math.round((current.amount+amount*scale)*100)/100;current.sourceRecipeIds.push(recipe.id);map.set(key,current)}}
 return[...map.values()];
}

export function scaleKitchenIngredients(recipe,desiredServings){
 const scale=Math.max(.01,Number(desiredServings)||1)/Math.max(.01,Number(recipe?.servings)||1);
 return parseKitchenIngredients(recipe?.ingredients).map(row=>({...row,amount:Number(row.amount)?Math.round(Number(row.amount)*scale*100)/100:row.amount}));
}
