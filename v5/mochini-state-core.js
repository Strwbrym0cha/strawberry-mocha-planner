const text=value=>String(value??'').trim();
const obj=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const LEGACY_MANUAL_KEYS=['lastManualMood','selectedMood','manualMood','manualMoodActive','moodOverride','selectedExpression'];
const AUTONOMOUS_FIELDS=['mood','moodIntensity','currentActivityId','currentActivity','currentLine','lastMoodAt'];

export function migrateAutonomousLife(value={},validMoods=[]){
 const source={...obj(value)},valid=new Set(validMoods),legacyManual=LEGACY_MANUAL_KEYS.some(key=>source[key]!==undefined&&source[key]!==null&&source[key]!==''),savedAuto=valid.has(text(source.autonomousMood))?text(source.autonomousMood):'',legacyMood=valid.has(text(source.mood))?text(source.mood):'',autonomousMood=savedAuto||(!legacyManual&&legacyMood?legacyMood:'content');
 for(const key of LEGACY_MANUAL_KEYS)delete source[key];
 return{...source,mood:autonomousMood,autonomousMood,autonomousMoodAt:source.autonomousMoodAt||source.lastAutonomyAt||source.lastMoodAt||null,__legacyManualIgnored:legacyManual&&!savedAuto};
}

export function canonicalAutonomousLife(value={},validMoods=[]){
 const life=migrateAutonomousLife(value,validMoods),mood=validMoods.includes(life.autonomousMood)?life.autonomousMood:'content',next={...life,mood,autonomousMood:mood};delete next.__legacyManualIgnored;return next;
}

export function createMoodLayers(value={},validMoods=[]){return{autonomous:canonicalAutonomousLife(value,validMoods),manual:null,event:null,eventId:0}}

export function displayLife(layers={}){
 const autonomous=obj(layers.autonomous),manual=obj(layers.manual),event=obj(layers.event),manualLife=manual.mood?{...autonomous,mood:manual.mood,moodIntensity:manual.moodIntensity??autonomous.moodIntensity,currentLine:manual.line||autonomous.currentLine,currentActivityId:manual.activityId||autonomous.currentActivityId,currentActivity:manual.activity||autonomous.currentActivity}:autonomous;
 return event.mood?{...manualLife,mood:event.mood,moodIntensity:event.moodIntensity??manualLife.moodIntensity,currentLine:event.line||manualLife.currentLine,currentActivityId:event.activityId||manualLife.currentActivityId,currentActivity:event.activity||manualLife.currentActivity}:manualLife;
}

export function setAutonomousLife(layers,life,validMoods=[]){return{...layers,autonomous:canonicalAutonomousLife({...life,autonomousMood:life?.mood||life?.autonomousMood,autonomousMoodAt:life?.lastAutonomyAt||life?.lastMoodAt||new Date().toISOString()},validMoods)}}
export function setManualMood(layers,mood,validMoods=[],detail={}){const value=text(mood);return{...layers,manual:validMoods.includes(value)?{mood:value,...obj(detail)}:null}}
export function clearManualMood(layers){return{...layers,manual:null}}
export function setEventReaction(layers,detail={},validMoods=[]){const source=obj(detail),mood=text(source.mood||source.expression||source.reaction);if(!validMoods.includes(mood))return layers;return{...layers,event:{...source,mood},eventId:(Number(layers.eventId)||0)+1}}
export function clearEventReaction(layers,eventId){return eventId!==undefined&&Number(eventId)!==Number(layers.eventId)?layers:{...layers,event:null}}

export function mergeReactionSideEffects(autonomous={},reaction={},validMoods=[]){
 const baseline=canonicalAutonomousLife(autonomous,validMoods),next={...baseline,...obj(reaction)};
 for(const field of AUTONOMOUS_FIELDS)next[field]=baseline[field];
 next.autonomousMood=baseline.autonomousMood;next.autonomousMoodAt=baseline.autonomousMoodAt;
 return canonicalAutonomousLife(next,validMoods);
}

export function moodMode(layers={}){return obj(layers.event).mood?'event':obj(layers.manual).mood?'manual':'autonomous'}
export const legacyManualKeys=()=>[...LEGACY_MANUAL_KEYS];
