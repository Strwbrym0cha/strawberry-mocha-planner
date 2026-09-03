import{getTodaySections}from'./unified-actions.js?v=5';
import{getWorkSessionsForDate}from'./work-hq.js?v=5';
import{getUpcomingAcademicDeadlines,getStudySessions}from'./study-nook.js?v=5';
import{getBillInstances,getSubscriptions}from'./finance-engine.js?v=5';
import{getGrowthGoals,getGrowthMilestones,getHobbyProjects,getMovementForDate}from'./lifestyle-engine.js?v=27';

const day=value=>String(value||'').slice(0,10);
const event=(id,source,title,date,details='',route)=>({id,source,title,date:day(date),details,route});

/** Source-owned, read-only calendar projections. No event is persisted here. */
export function getCalendarSourceEventsForDate(state,date){
 const target=day(date),actions=getTodaySections(state,{date:target});
 const actionEvents=[...actions.today,...actions.timed].filter((item,index,array)=>array.findIndex(other=>other.id===item.id)===index).map(item=>event(`action:${item.id}`,'Daily Shit',item.title||item.text,target,item.scheduledTime||item.deadlineTime||'', 'tasks'));
 const work=getWorkSessionsForDate(state,target).map(item=>event(`work-session:${item.clientId}:${target}:${item.startTime||'anytime'}`,'Work HQ',item.client.alias,target,[item.startTime,item.endTime].filter(Boolean).join(' – '),'work'));
 const study=getUpcomingAcademicDeadlines(state,{from:target,to:target}).map(item=>event(`study-assignment:${item.id}`,'Study Nook',item.title,target,item.dueTime||'Due today','school'));
 const sessions=(getStudySessions(state,{from:target,to:target})||[]).map(item=>event(`study-session:${item.id}`,'Study Nook',item.goal||'Study session',target,`${item.targetMinutes||0} min`,'school'));
 const bills=getBillInstances(state,{from:target,to:target}).map(item=>event(`bill:${item.id}`,'Money Café',item.name,target,`Due • ${item.expectedAmount!=null?`$${Number(item.expectedAmount).toFixed(2)}`:''}`,'money'));
 const subscriptions=getSubscriptions(state).filter(item=>day(item.renewalDate)===target||day(item.trialEndDateOptional)===target).map(item=>event(`subscription:${item.id}:${target}`,'Money Café',item.name,target,item.trialEndDateOptional?'Trial ends':'Renews','money'));
 const movement=getMovementForDate(state,target).filter(item=>['planned','active'].includes(item.status)).map(item=>event(`movement:${item.id}`,'Get Movin',item.title,target,item.plannedMinutes?`${item.plannedMinutes} min`:'Planned','movement'));
 const hobbies=Object.values(state.lifestyle?.hobbies?.projects||[]).filter(item=>day(item.targetDateOptional)===target&&!item.archivedAt).map(item=>event(`hobby-project:${item.id}`,'Hobby Shelf',item.title,target,'Project target','hobbies'));
 const growth=getGrowthGoals(state).flatMap(goal=>getGrowthMilestones(state,goal.id)).filter(item=>day(item.targetDateOptional)===target&&item.status!=='completed').map(item=>event(`growth-milestone:${item.id}`,'Growth',item.title,target,'Milestone target','growth'));
 return [...actionEvents,...work,...study,...sessions,...bills,...subscriptions,...movement,...hobbies,...growth].sort((a,b)=>a.details.localeCompare(b.details)||a.title.localeCompare(b.title));
}

export function getCalendarSourceEventsForRange(state,{from,to}){const results=[];for(let cursor=new Date(`${from}T12:00:00`),end=new Date(`${to}T12:00:00`);cursor<=end;cursor.setDate(cursor.getDate()+1)){const key=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;results.push(...getCalendarSourceEventsForDate(state,key));}return results;}
