import{canonicalAutonomousLife}from'../v5/mochini-state-core.js?v=7.4.1-mood-layers';

const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();

export function createMochiniLayers(value={},validMoods=[]){
 const autonomousLife=canonicalAutonomousLife(value,validMoods),autonomousMood=autonomousLife.autonomousMood||autonomousLife.mood||'content';
 return{autonomousLife:{...autonomousLife,mood:autonomousMood,autonomousMood},autonomousMood,manualMood:null,manualDetail:null,eventReaction:null,eventId:0};
}

export function displayMood(layers={}){
 return text(layers.eventReaction?.mood)||text(layers.manualMood)||text(layers.autonomousMood)||text(layers.autonomousLife?.mood)||'content';
}

export function displayLife(layers={}){
 const autonomous=obj(layers.autonomousLife),manual=obj(layers.manualDetail),event=obj(layers.eventReaction),mood=displayMood(layers),overlay=event.mood?event:layers.manualMood?manual:{};
 return{...autonomous,mood,currentLine:overlay.line||autonomous.currentLine,currentActivityId:overlay.activityId||autonomous.currentActivityId,currentActivity:overlay.activity||autonomous.currentActivity,displayMood:mood,displayMode:event.mood?'event':layers.manualMood?'manual':'autonomous'};
}

export function setAutonomousMood(layers,life,validMoods=[]){
 const autonomousLife=canonicalAutonomousLife(life,validMoods),autonomousMood=autonomousLife.autonomousMood||autonomousLife.mood||'content';
 return{...layers,autonomousLife:{...autonomousLife,mood:autonomousMood,autonomousMood},autonomousMood};
}

export function setManualMood(layers,mood,validMoods=[],detail={}){
 const value=text(mood);return validMoods.includes(value)?{...layers,manualMood:value,manualDetail:{...obj(detail),mood:value}}:{...layers,manualMood:null,manualDetail:null};
}

export function clearManualMood(layers){return{...layers,manualMood:null,manualDetail:null}}

export function setEventReaction(layers,detail={},validMoods=[]){
 const source=obj(detail),mood=text(source.mood||source.expression||source.reaction);if(!validMoods.includes(mood))return layers;
 return{...layers,eventReaction:{...source,mood},eventId:(Number(layers.eventId)||0)+1};
}

export function clearEventReaction(layers,eventId){return eventId!==undefined&&Number(eventId)!==Number(layers.eventId)?layers:{...layers,eventReaction:null}}

export function blinkFrame(layers={}){return{face:'closed',returnMood:displayMood(layers),displayMode:displayLife(layers).displayMode}}

export function publicMoodState(layers={}){const shown=displayLife(layers);return{autonomousMood:layers.autonomousMood||'content',manualMood:layers.manualMood||null,eventReaction:layers.eventReaction?{...layers.eventReaction}:null,displayMood:shown.displayMood,displayMode:shown.displayMode}}
