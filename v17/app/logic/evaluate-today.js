import{localDateKey}from'../data.js?v=22.1.19-20260817';
import{eventMinutes,eventsForDate,nextTimedEvent}from'./events.js?v=22.1.19-20260817';
import{upcomingDeadlines}from'./deadlines.js?v=22.1.16-20260817';
import{routineSummaryForDate}from'./routines.js?v=22.1.16-20260817';
import{eligibleTasks,openTasksForDate,taskEligibility,tasksForDate}from'./tasks.js?v=22.1.19-20260817';
import{focusBiasedCandidates,hyperfixationStatus,isFocusRelatedTask}from'./hyperfixation.js?v=22.1.19-20260817';

const priorityRank=value=>({High:3,Medium:2,Low:1}[value]||0);
const deadlineRank=(task,date)=>{const due=task?.dueDate;if(!/^\d{4}-\d{2}-\d{2}$/.test(String(due||'')))return 0;const days=Math.round((new Date(`${due}T12:00:00`).getTime()-new Date(`${date}T12:00:00`).getTime())/86400000);return days<0?3:days===0?2:days===1?1:0};
const reason=(code,detail)=>({code,detail});
function recommendationFor(state,date,now,hyperfixation){
 const candidates=eligibleTasks(state,date,{now});if(!candidates.length)return{recommendedNextAction:null,candidates:[],ambiguous:false};
 const preferred=focusBiasedCandidates(candidates,hyperfixation),focusPreferred=hyperfixation.active&&preferred.length<candidates.length;
 const scored=preferred.map(task=>({task,score:[deadlineRank(task,date),priorityRank(task.priority)]})).sort((a,b)=>b.score[0]-a.score[0]||b.score[1]-a.score[1]);
 const best=scored[0],tied=scored.filter(item=>item.score[0]===best.score[0]&&item.score[1]===best.score[1]);
 const describe=task=>{const eligibility=taskEligibility(state,task,date,{now}),reasons=[reason('assigned_today','Task is assigned to this planner day.'),reason('fits_capacity','Task passes the current capacity rule.')];if(isFocusRelatedTask(task,hyperfixation))reasons.unshift(reason('matches_current_fixation','Task is linked to the current Hyperfixation focus.'));if(task.dueDate&&deadlineRank(task,date)===3)reasons.unshift(reason('overdue','Task has a past due date.'));else if(task.dueDate&&deadlineRank(task,date)===2)reasons.unshift(reason('deadline_today','Task is due today.'));if(eligibility.nextFixedEvent)reasons.push(reason('before_fixed_event','Task fits before the next fixed event.'));return{task,reasons};};
 if(tied.length>1)return{recommendedNextAction:null,candidates:tied.map(item=>describe(item.task)),ambiguous:true};return{recommendedNextAction:describe(best.task),candidates:scored.map(item=>describe(item.task)),ambiguous:false};
}
export function evaluateToday(state={},context={}){
 const now=context.now instanceof Date?context.now:new Date(context.now||Date.now()),date=context.date||localDateKey(now),todayTasks=tasksForDate(state,date),openTasks=openTasksForDate(state,date),eligible=eligibleTasks(state,date,{now}),nextFixedEvent=nextTimedEvent(state,date,{now}),routines=routineSummaryForDate(state,date),deadlines=upcomingDeadlines(state,{date}),fixedMinutes=eventsForDate(state,date).reduce((sum,event)=>sum+eventMinutes(event),0),flexibleMinutes=todayTasks.filter(task=>!task.done&&!task.parked).reduce((sum,task)=>sum+(Number(task.durationMin)||0),0),availableMinutes=Math.max(0,16*60-fixedMinutes),alerts=[],hyperfixation=hyperfixationStatus(state);
 if(flexibleMinutes>availableMinutes)alerts.push({code:'day_overloaded',detail:'Estimated flexible work exceeds time remaining after fixed events.',evidence:{flexibleMinutes,availableMinutes,fixedMinutes}});
 if(routines.remaining>0)alerts.push({code:'routine_incomplete',detail:'One or more routine steps remain unresolved.',evidence:{remaining:routines.remaining,total:routines.total}});
 deadlines.filter(item=>item.urgency!=='later').forEach(item=>alerts.push({code:item.urgency==='overdue'?'overdue':'deadline_soon',detail:`${item.title} is ${item.urgency}.`,evidence:{source:item.source,date:item.date,daysRemaining:item.daysRemaining}}));
 if(hyperfixation.active&&nextFixedEvent)alerts.push({code:'hyperfixation_fixed_event',detail:'A fixed event remains ahead of the current Hyperfixation session.',evidence:{eventId:nextFixedEvent.id,title:nextFixedEvent.title,start:nextFixedEvent.start}});
 if(hyperfixation.active&&hyperfixation.hardBoundaries.length)alerts.push({code:'hyperfixation_hard_boundary',detail:'Existing hard-boundary tasks remain protected during Hyperfixation Mode.',evidence:{count:hyperfixation.hardBoundaries.length}});
 const recommendation=recommendationFor(state,date,now,hyperfixation),escalation={needsBigMochi:recommendation.ambiguous,reasons:recommendation.ambiguous?['multiple_competing_priorities']:[]};
 return{date,state:{capacity:state?.taskbot?.capacity||'High',openTaskCount:openTasks.length,eligibleTaskCount:eligible.length,nextFixedEventId:nextFixedEvent?.id||null,routineCompletion:routines.completionRatio},recommendedNextAction:recommendation.recommendedNextAction,candidates:recommendation.candidates,alerts,deadlines,routines,reasons:recommendation.recommendedNextAction?.reasons||[],escalation,planningLoad:{fixedMinutes,flexibleMinutes,availableMinutes},hyperfixation:{...hyperfixation,nextFixedEvent}};
}
