import test from'node:test';
import assert from'node:assert/strict';
import{ROOM_STORAGE_KEY,createRoomStore,incrementWatchEpisode,boredSuggestions,convertRoseIdea,estimateNextCycle,addExperimentCheckin,addMilestone,moveMilestone,dueFutureMessages,concealedLabel}from'./room-store.js';

class MemoryStorage{constructor(seed={}){this.data=new Map(Object.entries(seed))}getItem(key){return this.data.has(key)?this.data.get(key):null}setItem(key,value){this.data.set(key,String(value))}}
const fresh=()=>createRoomStore(new MemoryStorage());

test('shared records create, edit, archive, restore, and survive a new store instance',()=>{
 const storage=new MemoryStorage(),store=createRoomStore(storage),created=store.create('rose','watches',{title:'Abbott Elementary',type:'TV Show',status:'Watching',season:3,episode:6});
 assert.ok(created.id);assert.ok(created.createdAt);assert.equal(created.archivedAt,null);
 store.update('rose','watches',created.id,{episode:7});
 const reload=createRoomStore(storage);assert.equal(reload.records('rose','watches')[0].episode,7);
 reload.archive('rose','watches',created.id);assert.equal(reload.records('rose','watches').length,0);assert.equal(reload.records('rose','watches',{includeArchived:true})[0].archivedAt!==null,true);
 reload.archive('rose','watches',created.id,false);assert.equal(reload.records('rose','watches').length,1);
 assert.ok(storage.getItem(ROOM_STORAGE_KEY));
});

test('watch progress respects movies and a known episode total',()=>{
 assert.equal(incrementWatchEpisode({type:'Movie',episode:0}).reason,'movie');
 assert.deepEqual(incrementWatchEpisode({type:'TV Show',episode:6,totalEpisodes:8}).record.episode,7);
 assert.equal(incrementWatchEpisode({type:'TV Show',episode:8,totalEpisodes:8}).reason,'total');
 assert.equal(incrementWatchEpisode({type:'TV Show',episode:8,totalEpisodes:8},{confirmBeyondTotal:true}).record.episode,9);
});

test('Bored Button filters saved comforts by time, energy, and cost',()=>{
 const rose={cozy:[{id:'a',activity:'Color',timeRange:'15',energy:'tiny',cost:'$0',place:'Indoor'},{id:'b',activity:'Pottery',timeRange:'120',energy:'lots',cost:'flexible',place:'Outdoor'}],projects:[{id:'c',name:'Tiny collage',status:'Doing',timeRange:'30',energy:'medium',cost:'under $10'}],ideas:[]};
 assert.deepEqual(boredSuggestions(rose,{time:'15',energy:'tiny',budget:'$0'}).map(row=>row.label),['Color']);
 assert.equal(boredSuggestions(rose,{time:'120',energy:'lots',budget:'flexible'}).length,3);
 assert.deepEqual(boredSuggestions(rose,{time:'120',energy:'lots',budget:'flexible',context:'Out & About'}).map(row=>row.label),['Pottery','Tiny collage']);
});

test('Idea Garden conversion creates one destination and marks the source',()=>{
 const store=fresh(),idea=store.create('rose','ideas',{idea:'Learn pottery',category:'Fun'}),link=convertRoseIdea(store,idea.id,'project');
 assert.ok(link.id);assert.equal(store.records('rose','ideas').length,0);assert.equal(store.records('rose','projects')[0].name,'Learn pottery');
 const same=convertRoseIdea(store,idea.id,'project');assert.equal(same.id,link.id);assert.equal(store.records('rose','projects').length,1);
 const wishIdea=store.create('rose','ideas',{idea:'Visit Japan'});convertRoseIdea(store,wishIdea.id,'wishing');assert.equal(store.records('wishing','plans')[0].horizon,'Someday');
});

test('cycle estimates require completed history and stay explicitly estimated',()=>{
 assert.equal(estimateNextCycle([{startDate:'2026-01-01',endDate:'2026-01-05'}]),null);
 const estimate=estimateNextCycle([{startDate:'2026-01-01',endDate:'2026-01-05'},{startDate:'2026-01-29',endDate:'2026-02-02'},{startDate:'2026-02-26',endDate:'2026-03-02'}]);
 assert.equal(estimate.label,'Estimate');assert.equal(estimate.averageDays,28);assert.equal(estimate.date,'2026-03-26');
});

test('capacity, cycle, and Kat Labs records persist with experiment check-ins',()=>{
 const storage=new MemoryStorage(),store=createRoomStore(storage);store.create('moon','cycles',{startDate:'2026-09-01',endDate:'2026-09-05',flow:'Medium',symptoms:'cramps, fatigue'});store.create('moon','checkins',{date:'2026-09-30',mood:'Calm',physicalEnergy:3,mentalEnergy:4,focus:3,stress:2,socialBattery:2,medicationFelt:'Helpful / normal'});
 const experiment=store.create('moon','experiments',{name:'Morning Pilates',status:'Running',checkIns:[]});addExperimentCheckin(store,experiment.id,{date:'2026-09-30',result:'Positive',effort:2});store.update('moon','experiments',experiment.id,{status:'Finished',outcome:'Keep',conclusion:'It helped.'});
 const reload=createRoomStore(storage).load();assert.equal(reload.moon.cycles[0].flow,'Medium');assert.equal(reload.moon.checkins[0].mentalEnergy,4);assert.equal(reload.moon.experiments[0].checkIns.length,1);assert.equal(reload.moon.experiments[0].outcome,'Keep');
});

test('relationship records persist and privacy concealment does not claim encryption',()=>{
 const storage=new MemoryStorage(),store=createRoomStore(storage),person=store.create('love','profiles',{name:'Jordan',lastSaw:'2026-09-27'});store.create('love','plans',{profileId:person.id,date:'2026-10-04',plan:'Dinner'});store.create('love','memories',{profileId:person.id,date:'2026-09-27',whatHappened:'A lovely day',private:true});store.create('love','velvet',{profileId:person.id,date:'2026-09-27',private:true});store.settings('love',{privacyMode:true});
 const reload=createRoomStore(storage).load();assert.equal(reload.love.settings.privacyMode,true);assert.equal(concealedLabel(reload.love.memories[0],true),'Private Entry 🔒');assert.equal(reload.love.velvet.length,1);assert.equal(reload.love.plans[0].plan,'Dinner');
});

test('future plans support horizons, milestones, ordering, Someday focus, messages, and archive',()=>{
 const storage=new MemoryStorage(),store=createRoomStore(storage),plan=store.create('wishing','plans',{title:'Move to Texas',horizon:'Someday',status:'Dreaming',milestones:[]});store.update('wishing','plans',plan.id,{horizon:'1 Year',status:'Exploring'});addMilestone(store,plan.id,{milestone:'Research neighborhoods'});addMilestone(store,plan.id,{milestone:'Savings checkpoint'});
 let saved=store.load().wishing.plans[0];moveMilestone(store,plan.id,saved.milestones[1].id,'up');saved=store.load().wishing.plans[0];assert.equal(saved.milestones[0].milestone,'Savings checkpoint');
 store.create('wishing','messages',{title:'Hello Future Kat',message:'You did the brave thing.',surfaceDate:'2026-09-30'});assert.equal(dueFutureMessages(store.load().wishing.messages,'2026-09-30').length,1);
 store.update('wishing','plans',plan.id,{status:'Achieved'});store.archive('wishing','plans',plan.id);assert.equal(store.records('wishing','plans').length,0);assert.equal(createRoomStore(storage).records('wishing','plans',{includeArchived:true})[0].status,'Achieved');
});
