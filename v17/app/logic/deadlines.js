import{localDateKey}from'../data.js?v=22.1.16-20260817';
const list=value=>Array.isArray(value)?value:[];
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''));
const daysBetween=(from,to)=>Math.round((new Date(`${to}T12:00:00`).getTime()-new Date(`${from}T12:00:00`).getTime())/86400000);
export function deadlineUrgency(date,{date:today=localDateKey()}={}){const daysRemaining=daysBetween(today,date);return{daysRemaining,urgency:daysRemaining<0?'overdue':daysRemaining===0?'today':daysRemaining===1?'tomorrow':daysRemaining<=7?'soon':'later'}}
const add=(items,source,title,date,id,extra={})=>{if(validDate(date)&&title)items.push({id:String(id||`${source}-${title}-${date}`),source,title,date,...deadlineUrgency(date),...extra})};
export function upcomingDeadlines(state,{date=localDateKey(),limit=20}={}){
 const items=[];
 list(state?.tasks).filter(task=>!task?.done).forEach(task=>add(items,'task',task.text||task.title,task.dueDate,task.id));
 list(state?.schoolTasks).filter(task=>!task?.done).forEach(task=>add(items,'school_task',task.name||task.title,task.due,task.id));
 list(state?.courses).filter(course=>!['Completed','Transferred'].includes(course?.status)).forEach(course=>{add(items,'course_target',course.name,course.targetDate,course.id);add(items,'course_deadline',course.name,course.officialDeadline,course.id)});
 list(state?.workItems).filter(item=>item?.status!=='Completed').forEach(item=>{add(items,'work_target',item.name,item.targetDate,item.id);add(items,'work_deadline',item.name,item.officialDeadline,item.id)});
 list(state?.goals).filter(goal=>!goal?.archived&&Number(goal?.progress||0)<100).forEach(goal=>add(items,'goal',goal.title||goal.name,goal.date,goal.id));
 return items.sort((a,b)=>a.daysRemaining-b.daysRemaining||a.title.localeCompare(b.title)).slice(0,limit);
}
