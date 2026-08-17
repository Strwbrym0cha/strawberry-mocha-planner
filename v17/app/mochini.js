import{financeSafetyForTask}from'./logic/finance.js?v=22.1.16-20260817';

const title=task=>task?.text||task?.title||'this task';
const fmtDate=value=>{if(!value)return'';return new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'});};
export const reasonText={assigned_today:'It is already assigned to today.',fits_capacity:'It fits your current capacity.',before_fixed_event:'There is enough time before your next fixed event.',overdue:'It is overdue.',deadline_today:'Its deadline is today.',deadline_soon:'A deadline is coming up soon.',routine_incomplete:'Part of a routine is still unfinished.',day_overloaded:'Today’s estimated load is larger than its available time.',hard_boundary:'It has a hard boundary.',parked:'It is intentionally parked.',unavailable_today:'It is unavailable today.',capacity_incompatible:'It does not fit the current capacity.',does_not_fit_before_fixed_event:'It does not fit before the next fixed event.',multiple_competing_priorities:'The top options are equally ranked.'};
export const readableReason=reason=>reasonText[reason?.code||reason]||'KatOS used the current planner information.';

export function buildMochiniPresentation(evaluation,state={}){
 const recommendation=evaluation?.recommendedNextAction,alerts=evaluation?.alerts||[],deadlines=evaluation?.deadlines||[],capacity=evaluation?.state?.capacity||'High',finance=recommendation?.task?financeSafetyForTask(state,recommendation.task):{applicable:false};
 const notices=[];
 if(capacity==='Low'&&evaluation?.state?.openTaskCount>evaluation?.state?.eligibleTaskCount)notices.push('Today looks lower-capacity, so I’m keeping things gentle.');
 if(alerts.some(alert=>alert.code==='day_overloaded'))notices.push('Today looks a little packed. We may want to trim something.');
 const routine=alerts.find(alert=>alert.code==='routine_incomplete');if(routine)notices.push(`Your routine still has ${routine.evidence?.remaining||'a few'} step${routine.evidence?.remaining===1?'':'s'} left if you want a tiny win.`);
 const deadline=deadlines.find(item=>['overdue','today','tomorrow','soon'].includes(item.urgency));if(deadline)notices.push(`${deadline.title} is ${deadline.urgency}${deadline.date?` (${fmtDate(deadline.date)})`:''}.`);
 if(finance.applicable&&!finance.withinAvailable)notices.push('This task needs money, and its estimated cost does not fit the current available amount.');
 if(evaluation?.escalation?.needsBigMochi)return{mode:'escalation',headline:'I can’t fairly pick this one. 🍡',message:'The top options are equally ranked, so this needs Big Mochi.',notices,recommendation:null,reasonLines:[],finance,showBigMochi:true};
 if(recommendation){const reasons=(recommendation.reasons||[]).map(readableReason);return{mode:'recommendation',headline:`Psst, try ${title(recommendation.task)}. 🍓`,message:reasons.slice(0,2).join(' '),notices,recommendation,reasonLines:reasons,finance,showBigMochi:false};}
 if(!evaluation?.state?.openTaskCount)return{mode:'empty',headline:'Nothing pressing right now. 🌷',message:'Rest counts too.',notices,recommendation:null,reasonLines:[],finance,showBigMochi:false};
 return{mode:'no_eligible',headline:'No clear mission right now. 🍡',message:'KatOS cannot find an eligible task with the current rules.',notices,recommendation:null,reasonLines:[],finance,showBigMochi:false};
}

export function buildBigMochiRequest(evaluation,state={},question='Please help me decide what to do next and explain why.'){
 const presentation=buildMochiniPresentation(evaluation,state),options=(evaluation?.candidates||[]).slice(0,4),nextEvent=(state.events||[]).find(event=>String(event.id)===String(evaluation?.state?.nextFixedEventId)),deadline=(evaluation?.deadlines||[]).find(item=>['overdue','today','tomorrow','soon'].includes(item.urgency)),financeTask=options.map(option=>option.task).find(task=>financeSafetyForTask(state,task).applicable),finance=financeTask?financeSafetyForTask(state,financeTask):{applicable:false};
 const lines=['🍓 BIG MOCHI REQUEST',`Kat's question: ${question}`,'',`Why Mochini escalated: ${(evaluation?.escalation?.reasons||['KatOS cannot choose fairly.']).join(', ')}`,'','Current KatOS state:',`- Date: ${evaluation?.date||'Not available'}`,`- Capacity: ${evaluation?.state?.capacity||'Not available'}`,`- Open tasks: ${evaluation?.state?.openTaskCount??0}`,`- Next fixed event: ${nextEvent?`${nextEvent.title||'Scheduled event'}${nextEvent.start?` - ${nextEvent.start}`:''}`:'None'}`];
 if(deadline)lines.push(`- Relevant deadline: ${deadline.title} - ${deadline.urgency}${deadline.date?` (${deadline.date})`:''}`);
 if(evaluation?.routines?.remaining)lines.push(`- Routine steps remaining: ${evaluation.routines.remaining}`);
 lines.push('','Competing options:');
 if(options.length)options.forEach((option,index)=>lines.push(`- Option ${index+1}: ${title(option.task)}${option.reasons?.length?` (${option.reasons.map(readableReason).join(' ')})`:''}`));else lines.push('- KatOS did not identify a specific option.');
 if(finance.applicable)lines.push('','Relevant finance safety:',`- Estimated cost: $${finance.estimatedCost.toFixed(2)}`,`- Available: $${Number(finance.summary.available||0).toFixed(2)}`,`- Unpaid bills: $${Number(finance.summary.unpaidBills||0).toFixed(2)}`);
 lines.push('','What Mochini knows:',presentation.message||'KatOS used the current deterministic planner rules.','What Mochini cannot decide: Which equally ranked option best fits Kat’s broader priorities.','', 'What Kat wants from Big Mochi:',question);
 return lines.join('\n');
}
