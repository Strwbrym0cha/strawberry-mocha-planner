import{MOCHINI_ACTIVITIES,MOCHINI_DIALOGUE,MOCHINI_IDLE_EVENTS,MOCHINI_OBSESSIONS}from'./mochini-dialogue.js?v=22.3.0-20260823';

const DAY=86400000,HOUR=3600000;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const number=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
export const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,number(value,min)));
export const mochiniDateKey=(value=new Date())=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const weekKey=value=>{const d=new Date(value),start=new Date(d.getFullYear(),0,1),day=Math.floor((d-start)/DAY);return `${d.getFullYear()}-W${String(Math.ceil((day+start.getDay()+1)/7)).padStart(2,'0')}`};
export const DEFAULT_MOCHINI_LIFE={mood:'content',energy:70,affection:50,chaos:30,lastInteractionAt:null,lastSeenAt:null,lastEnergyAt:null,interactionsToday:0,ignoredCount:0,berriesFedToday:0,berriesFedTotal:0,currentActivity:null,activityChangedAt:null,currentObsession:null,obsessionStartedAt:null,currentLine:null,dialogueHistory:[],recentVisits:[],lastEvent:null,lastEventAt:null,lastPokeAt:null,pokeCount:0,dailyKey:null,weeklyKey:null,dailyFlags:{},weeklyFlags:{},permanentFlags:{}};
const MOODS=new Set(['content','happy','excited','sleepy','bored','proud','grumpy','chaotic','curious']);

export function normalizeMochiniLife(value={},now=new Date()){
 const input=object(value)?value:{},today=mochiniDateKey(now),week=weekKey(now),daily=input.dailyKey===today&&object(input.dailyFlags)?input.dailyFlags:{},weekly=input.weeklyKey===week&&object(input.weeklyFlags)?input.weeklyFlags:{};
 return{...DEFAULT_MOCHINI_LIFE,...input,mood:MOODS.has(input.mood)?input.mood:'content',energy:clamp(number(input.energy,70)),affection:clamp(number(input.affection,50)),chaos:clamp(number(input.chaos,30)),interactionsToday:Math.max(0,Math.floor(number(input.interactionsToday,0)))*(input.dailyKey===today?1:0),ignoredCount:Math.max(0,Math.floor(number(input.ignoredCount,0))),berriesFedToday:Math.max(0,Math.floor(number(input.berriesFedToday,0)))*(input.dailyKey===today?1:0),berriesFedTotal:Math.max(0,Math.floor(number(input.berriesFedTotal,0))),dialogueHistory:Array.isArray(input.dialogueHistory)?input.dialogueHistory.filter(line=>typeof line==='string').slice(-6):[],recentVisits:Array.isArray(input.recentVisits)?input.recentVisits.filter(value=>Number.isFinite(Date.parse(value))).slice(-8):[],dailyKey:today,weeklyKey:week,dailyFlags:daily,weeklyFlags:weekly,permanentFlags:object(input.permanentFlags)?input.permanentFlags:{}};
}

export function applyElapsedEnergy(value={},now=new Date()){
 const life=normalizeMochiniLife(value,now),previous=Date.parse(life.lastEnergyAt||life.lastSeenAt||'');if(!Number.isFinite(previous))return{...life,lastEnergyAt:now.toISOString()};
 const elapsed=Math.max(0,now.getTime()-previous),hours=Math.min(72,elapsed/HOUR),overnight=hours>=7,delta=overnight?Math.min(24,hours*1.8):-Math.min(18,hours*.45);
 return{...life,energy:clamp(life.energy+delta),lastEnergyAt:now.toISOString()};
}

export function calculateMochiniMood(value={},context={},now=new Date()){
 const life=normalizeMochiniLife(value,now),hour=now.getHours(),recent=now-Date.parse(life.lastInteractionAt||0)<2*HOUR;
 if((hour>=23||hour<6)&&life.energy<55)return'sleepy';
 if(context.recentCompletions>=2||life.dailyFlags.celebratedAllTasks)return'proud';
 if(life.chaos>=65&&context.randomEvent)return'chaotic';
 if(life.ignoredCount>=3||life.recentVisits.length>=4&&!recent)return'bored';
 if(life.interactionsToday>=4&&recent)return'happy';
 if(life.energy<25)return'sleepy';
 if(context.berryFed||context.funInteraction)return'excited';
 if(hour>=12&&hour<19)return'curious';
 return'content';
}

const weightedPick=(items,context,random)=>{const weighted=items.map(item=>({item,weight:Math.max(0,item.weight(context))})),total=weighted.reduce((sum,x)=>sum+x.weight,0);let target=random()*total;return(weighted.find(x=>(target-=x.weight)<=0)||weighted.at(-1)).item};
export function refreshActivity(value={},now=new Date(),random=Math.random,{force=false}={}){const life=normalizeMochiniLife(value,now),age=now-Date.parse(life.activityChangedAt||0);if(!force&&life.currentActivity&&age<6*HOUR)return life;const activity=weightedPick(MOCHINI_ACTIVITIES,{hour:now.getHours(),chaos:life.chaos},random);return{...life,currentActivity:activity,activityChangedAt:now.toISOString()}};
export function refreshObsession(value={},now=new Date(),random=Math.random){const life=normalizeMochiniLife(value,now),started=Date.parse(life.obsessionStartedAt||0),age=now-started;if(life.currentObsession&&Number.isFinite(started)){if(age<5*DAY)return life;if(age>=7*DAY||random()<.35)return{...life,currentObsession:null,obsessionStartedAt:null,dailyFlags:{...life.dailyFlags,obsessionConcluded:true}};return life}const roll=random();if(roll>=.18)return life;return{...life,currentObsession:MOCHINI_OBSESSIONS[Math.floor(roll*MOCHINI_OBSESSIONS.length)%MOCHINI_OBSESSIONS.length],obsessionStartedAt:now.toISOString()}};

export function pickMochiniDialogue(category,value={},random=Math.random,replacements={},now=new Date()){const life=normalizeMochiniLife(value,now),pool=MOCHINI_DIALOGUE[category]||MOCHINI_DIALOGUE.idle,available=pool.filter(line=>!life.dialogueHistory.slice(-3).includes(line)),template=(available.length?available:pool)[Math.floor(random()*(available.length||pool.length))]||'Tiny bean noises.';const line=template.replace(/\{(\w+)\}/g,(_,key)=>replacements[key]||life.currentObsession||'tiny mysteries');return{line,life:{...life,dialogueHistory:[...life.dialogueHistory,line].slice(-6)}}};

export function interactWithMochini(value={},type='poke',{now=new Date(),random=Math.random}={}){let life=applyElapsedEnergy(value,now),category=type==='poke'?'poke':'greeting';if(type==='poke'){const recent=now-Date.parse(life.lastPokeAt||0)<10*60*1000;life={...life,pokeCount:recent?life.pokeCount+1:1,lastPokeAt:now.toISOString(),energy:clamp(life.energy+1),affection:clamp(life.affection+1)}}life={...life,lastInteractionAt:now.toISOString(),interactionsToday:life.interactionsToday+1,ignoredCount:0};const picked=pickMochiniDialogue(category,life,type==='poke'?()=>Math.min(.999,(life.pokeCount-1)/MOCHINI_DIALOGUE.poke.length):random,{},now);life={...picked.life,currentLine:picked.line,mood:calculateMochiniMood(picked.life,{funInteraction:true},now)};return{life,line:picked.line,local:true,requiresAI:false}};
export function feedMochiniBerry(value={},options={}){const now=options.now||new Date(),random=options.random||Math.random;let life=applyElapsedEnergy(value,now),count=life.berriesFedToday,diminishing=count>=3,accepted=count<6;life={...life,berriesFedToday:count+(accepted?1:0),berriesFedTotal:life.berriesFedTotal+(accepted?1:0),energy:clamp(life.energy+(accepted?(diminishing?1:5):0)),affection:clamp(life.affection+(accepted?(diminishing?1:3):0)),lastInteractionAt:now.toISOString(),interactionsToday:life.interactionsToday+1};const picked=pickMochiniDialogue(accepted?'berries':'berryLimit',life,random,{},now);life={...picked.life,mood:calculateMochiniMood(picked.life,{berryFed:accepted},now)};return{life,line:picked.line,accepted,diminishing,local:true,requiresAI:false}};
export function reactToMochiniEvent(value={},event,{now=new Date(),random=Math.random,allTasksComplete=false}={}){let life=normalizeMochiniLife(value,now),category=event==='routineComplete'?'routineComplete':event==='taskComplete'?(allTasksComplete?'allTasksComplete':'taskComplete'):'idle';const picked=pickMochiniDialogue(category,life,random,{},now);life={...picked.life,currentLine:picked.line,lastEvent:event,lastEventAt:now.toISOString(),dailyFlags:{...life.dailyFlags,[event==='routineComplete'?'celebratedRoutine':allTasksComplete?'celebratedAllTasks':'celebratedTask']:true},mood:calculateMochiniMood(picked.life,{recentCompletions:event==='taskComplete'?1:2},now)};return{life,line:picked.line,local:true,requiresAI:false}};
export function maybeCreateIdleEvent(value={},now=new Date(),random=Math.random){const life=normalizeMochiniLife(value,now),cooldown=now-Date.parse(life.lastEventAt||0);if(cooldown<12*HOUR||random()>=.08)return{life,event:null};const event=MOCHINI_IDLE_EVENTS[Math.floor(random()*MOCHINI_IDLE_EVENTS.length)%MOCHINI_IDLE_EVENTS.length];return{life:{...life,lastEvent:event,lastEventAt:now.toISOString()},event}};
export const requiresMochiniAI=intent=>['complex','unknown','emotional_support','open_conversation','planning','reasoning'].includes(typeof intent==='string'?intent:intent?.intent);
export function getMochiniLifeDebugState(value={},now=new Date()){const life=normalizeMochiniLife(value,now);return{...life,calculatedMood:calculateMochiniMood(life,{},now),localOnly:true}};
