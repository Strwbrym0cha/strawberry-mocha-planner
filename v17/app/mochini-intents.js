import{buildMochiniPresentation,readableReason}from'./mochini.js?v=22.1.28-20260818';
import{openTasksForDate,taskTitle}from'./logic/tasks.js?v=22.1.19-20260817';
import{eventsInRange,nextTimedEvent}from'./logic/events.js?v=22.1.19-20260817';
import{composePlannerContext,dayReference,plannerContextForDates,resolveDayReference}from'./logic/mochini-day-context.js?v=22.1.21-20260817';

const clean=value=>String(value||'').toLowerCase().replace(/[’‘']/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const includesAny=(input,phrases)=>phrases.some(phrase=>input===phrase||input.includes(phrase));
const time=value=>value?new Date(`2000-01-01T${value}`).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'any time';
const list=value=>Array.isArray(value)?value:[];

export const normalizeMochiniInput=clean;

export function matchMochiniIntent(input){
 const normalized=clean(input);if(!normalized)return{intent:'unknown',confidence:'unknown',parameters:{}};
 if(/\b(delete|remove|move|reschedule|complete|finish|archive|park|mark)\b/.test(normalized))return{intent:'mutation_request',confidence:'high',parameters:{}};
 if(includesAny(normalized,['why','why that','why should i do that','how did you pick that','how did you choose that']))return{intent:'ask_why',confidence:'exact',parameters:{}};
 if(normalized==='anything coming up'||normalized==='whats coming up'||normalized==='what is coming up')return{intent:'ambiguous',confidence:'ambiguous',parameters:{choices:['ask_tasks','ask_next_event','ask_deadlines']}};
 if(includesAny(normalized,['what should i do','whats next','what is next','what should i work on','pick something for me','what should i do first']))return{intent:'ask_next_task',confidence:'high',parameters:{}};
 if(/\b(i dont want to|i do not want to|i dont feel like|i do not feel like|hard to start|cant start|cannot start)\b/.test(normalized))return{intent:'ask_resistance',confidence:'high',parameters:{}};
 if(includesAny(normalized,['how does today look','give me the rundown','whats going on today','what is going on today','hows my day','how is my day']))return{intent:'ask_today_summary',confidence:'high',parameters:{}};
 if(/\b(events?|scheduled|schedule)\b/.test(normalized)&&/\b(today|tomorrow|this week)\b/.test(normalized)){const range=normalized.includes('tomorrow')?'tomorrow':normalized.includes('this week')?'week':'today';return{intent:'ask_events_range',confidence:'high',parameters:{range}}}
 const requestedDay=dayReference(normalized);
 if(requestedDay&&/\b(what|whats|what is|anything|how|am i|do i|happening|dealing|scheduled|schedule|doing|have)\b/.test(normalized))return{intent:'ask_day_context',confidence:'high',parameters:{reference:requestedDay}};
 if(includesAny(normalized,['what do i have today','what are my tasks','anything left','what do i need to do','show my tasks']))return{intent:'ask_tasks',confidence:'high',parameters:{}};
 if(includesAny(normalized,['any deadlines','whats due soon','what is due soon','do i have something due','what deadlines do i have']))return{intent:'ask_deadlines',confidence:'high',parameters:{}};
 if(includesAny(normalized,['how are my routines','whats left in my routine','what is left in my routine','did i finish my routine','routine status']))return{intent:'ask_routines',confidence:'high',parameters:{}};
 if(includesAny(normalized,['what am i hyperfixating on','whats my fixation','what is my fixation','what did i pick']))return{intent:'ask_fixation',confidence:'high',parameters:{}};
 if(includesAny(normalized,['hows hyperfixation mode','how is hyperfixation mode','anything interrupting me','can i keep going']))return{intent:'ask_fixation_status',confidence:'high',parameters:{}};
 if(includesAny(normalized,['im done hyperfixating','i am done hyperfixating','end hyperfixation mode']))return{intent:'end_hyperfixation_request',confidence:'high',parameters:{}};
 if(includesAny(normalized,['whats next on my schedule','what is next on my schedule','do i have anything scheduled','whats my next event','what is my next event','when do i have to be somewhere']))return{intent:'ask_next_event',confidence:'high',parameters:{}};
 if(includesAny(normalized,['whats my capacity','what is my capacity','what kind of day is this','how much can i handle today']))return{intent:'ask_capacity',confidence:'high',parameters:{}};
 if(/^(should i|help me decide|should we|do you think i should)\b/.test(normalized)||/\b(change|degree plan|life plan|strategy)\b/.test(normalized))return{intent:'complex',confidence:'unknown',parameters:{}};
 return{intent:'unknown',confidence:'unknown',parameters:{}};
}

const response=(intent,answer,{evidence=[],escalation=false,choices=[],reason='',recommendation=null}={})=>({intent,answer,evidence,escalation,choices,reason,recommendation});
const taskLine=task=>taskTitle(task);
const pickTemplate=(task,reason)=>{const templates=[`Psst, I’d start with ${task}. ${reason} 🍓`,`Tiny bean vote: ${task}. ${reason}`,`${task} looks like the best fit right now. ${reason} 🌷`];const index=String(task).split('').reduce((sum,char)=>sum+char.charCodeAt(0),0)%templates.length;return templates[index]};
const behavioralRecommendation=(recommendation,evaluation)=>{const task=recommendation?.task,codes=new Set((recommendation?.reasons||[]).map(reason=>reason.code));if(codes.has('protected_commitment'))return `Tiny bean vote: ${taskLine(task)}. It is a protected commitment you chose, so I’m keeping it ahead of optional momentum. 🍓`;if(codes.has('gateway_task'))return `Start with ${taskLine(task)}. It is marked as the gateway task, so you only need to begin the first step. 🍓`;if(codes.has('routine_momentum'))return `You’re already moving. ${taskLine(task)} fits naturally after the routine step you finished. 🌷`;if(codes.has('deferred_repeatedly'))return `${taskLine(task)} has been moved a few times. Starting may get harder if we keep carrying it forward—could the smallest first step be enough? 🍓`;const firstReason=readableReason(recommendation?.reasons?.[0]);return pickTemplate(taskLine(task),firstReason)};

export function answerMochiniIntent(intentResult,{state={},evaluation={},session={}}={}){
 const intent=intentResult?.intent||'unknown',date=evaluation?.date;
 if(intent==='ask_next_task'){
  const view=buildMochiniPresentation(evaluation,state);
  if(evaluation?.escalation?.needsBigMochi)return response(intent,'I can’t fairly choose between the top options. Want me to make a Big Mochi Request? 🍓',{evidence:evaluation.candidates||[],escalation:true,reason:'KatOS found equally ranked options.'});
  const recommendation=evaluation?.recommendedNextAction;
  if(!recommendation)return response(intent,view.message,{evidence:[],recommendation:null});
  return response(intent,behavioralRecommendation(recommendation,evaluation),{evidence:recommendation.reasons||[],recommendation});
 }
 if(intent==='ask_resistance'){
  const last=session.lastRecommendation;if(!last)return response(intent,'I can’t tell whether the plan changed from resistance alone. Did time, capacity, availability, or your schedule change? 🍡');
  const stillEligible=list(evaluation?.candidates).some(item=>String(item?.task?.id)===String(last.task?.id));
  if(!stillEligible)return response(intent,`Something in today’s circumstances may have changed around ${taskLine(last.task)}. Check the time, capacity, availability, or schedule before deciding what fits now. 🍓`,{evidence:[]});
  if(last.task?.isGatewayTask)return response(intent,`${taskLine(last.task)} still fits today’s current constraints, and it is marked as a gateway task. You do not have to solve the whole routine—just start the first step, then decide what follows. 🌷`,{evidence:last.reasons||[]});
  if((Number(last.task?.timesDeferred)||0)>=2)return response(intent,`${taskLine(last.task)} still fits today’s current constraints, but it has been moved a few times. Would the smallest possible start make it easier to test? 🍓`,{evidence:last.reasons||[]});
  return response(intent,`The plan still fits the current planner constraints. I can’t tell from resistance alone whether it should change—did time, capacity, availability, or your schedule change? 🍡`,{evidence:last.reasons||[]});
 }
 if(intent==='ask_why'){
  const last=session.lastRecommendation;if(!last)return response(intent,'I haven’t picked anything yet. Ask me what you should do first. 🍡');
  const reasons=(session.lastReasons||last.reasons||[]).map(readableReason);return response(intent,`${taskLine(last.task)} because ${reasons.join(' ')}`,{evidence:last.reasons||[]});
 }
 if(intent==='ask_tasks'){
  const tasks=openTasksForDate(state,date);if(!tasks.length)return response(intent,'Your task list is clear for today. 🌷');
  const names=tasks.slice(0,5).map(taskLine);return response(intent,`You have ${tasks.length} open task${tasks.length===1?'':'s'} today: ${names.join(', ')}${tasks.length>5?'…':''}`,{evidence:tasks});
 }
 if(intent==='ask_day_context'){
  const reference=intentResult.parameters?.reference||{kind:'today',label:'today'},dates=resolveDayReference(reference,{date}),days=plannerContextForDates(state,dates),composed=composePlannerContext(days,reference);
  return response(intent,composed.answer,{evidence:composed.evidence});
 }
 if(intent==='ask_events_range'){
  const range=intentResult.parameters?.range||'today',events=eventsInRange(state,{date,range}),label=range==='week'?'this week':range;if(!events.length)return response(intent,range==='week'?'Nothing scheduled this week. Your calendar is clear. 🍡':`Nothing scheduled ${label}. Your calendar is clear. 🍡`,{evidence:[]});const first=events[0];return response(intent,`${events.length} event${events.length===1?'':'s'} ${range==='week'?'this week':label}: ${first.title||'Scheduled event'}${first.start?` at ${time(first.start)}`:''}${events.length>1?` and ${events.length-1} more.`:''}`,{evidence:events});
 }
 if(intent==='ask_deadlines'){
  const deadlines=list(evaluation?.deadlines).filter(item=>item.urgency!=='later');if(!deadlines.length)return response(intent,'No upcoming deadlines are recorded right now. 🍓');
  const first=deadlines[0];return response(intent,`${first.title} is ${first.urgency}${first.date?` (${first.date})`:''}.${deadlines.length>1?` I also found ${deadlines.length-1} more.`:''}`,{evidence:deadlines});
 }
 if(intent==='ask_routines'){
  const routines=evaluation?.routines||{total:0,completed:0,remaining:0};if(!routines.total)return response(intent,'No routines are configured for today yet. 🍡');
  if(!routines.remaining)return response(intent,`Your routines are all wrapped up: ${routines.completed}/${routines.total} complete. 🌷`,{evidence:[routines]});
  return response(intent,`Your routines have ${routines.remaining} step${routines.remaining===1?'':'s'} left (${routines.completed}/${routines.total} complete).`,{evidence:[routines]});
 }
 if(intent==='ask_next_event'){
  const event=nextTimedEvent(state,date,{now:new Date()});if(!event)return response(intent,'Nothing fixed is coming up today. Your flexible time is yours. ♡');
  return response(intent,`Next up: ${event.title||'Scheduled event'} at ${time(event.start)}.`,{evidence:[event]});
 }
 if(intent==='ask_fixation'){const fixation=evaluation?.hyperfixation;if(!fixation?.active)return response(intent,'Hyperfixation Mode is not on right now. 🍡');return response(intent,`Hyperfixation Mode is on. Your current fixation is ${fixation.focus?.label||'your chosen focus'}. 🍡`,{evidence:[fixation]});}
 if(intent==='ask_fixation_status'){const fixation=evaluation?.hyperfixation;if(!fixation?.active)return response(intent,'Hyperfixation Mode is not on right now. 🍡');const event=fixation.nextFixedEvent,protectedTask=list(evaluation?.candidates).find(item=>item?.task?.isProtected)?.task;if(event)return response(intent,`Your fixation is still ${fixation.focus?.label||'active'}, and ${event.title||'a fixed event'} is coming up at ${time(event.start)}. 🍡`,{evidence:[fixation]});if(protectedTask)return response(intent,`Your fixation can keep going, and ${taskLine(protectedTask)} is the protected commitment waiting for the baton next. 🍓`,{evidence:[fixation,protectedTask]});if(fixation.focus?.nextStep)return response(intent,`Your fixation is ${fixation.focus?.label||'active'}. When you are ready to leave it, your concrete next step is ${fixation.focus.nextStep}. 🌷`,{evidence:[fixation]});return response(intent,`Your fixation is ${fixation.focus?.label||'active'}, and KatOS sees no fixed event ahead today. 🍡`,{evidence:[fixation]});}
 if(intent==='end_hyperfixation_request')return response(intent,'I can’t switch modes from a chat message yet. Use Exit Hyperfixation Mode on Home whenever you’re ready. 🌷');
 if(intent==='ask_capacity')return response(intent,`KatOS has today set to ${evaluation?.state?.capacity||'High'} capacity. I’ll use that only to filter task fit, not to make assumptions about you. 🍓`);
 if(intent==='ask_today_summary'){
  const next=nextTimedEvent(state,date,{now:new Date()}),deadline=list(evaluation?.deadlines).find(item=>item.urgency!=='later'),routines=evaluation?.routines||{},packed=list(evaluation?.alerts).some(alert=>alert.code==='day_overloaded');
  const parts=[`${evaluation?.state?.openTaskCount||0} open task${evaluation?.state?.openTaskCount===1?'':'s'}`,`${evaluation?.state?.capacity||'High'} capacity`,next?`next event: ${next.title||'Scheduled event'} at ${time(next.start)}`:'no fixed event next'];if(deadline)parts.push(`${deadline.title} is ${deadline.urgency}`);if(routines.total)parts.push(`${routines.remaining||0} routine step${routines.remaining===1?'':'s'} left`);if(packed)parts.push('the day looks packed');return response(intent,`Tiny rundown: ${parts.join(' • ')}.`,{evidence:[evaluation]});
 }
 if(intent==='mutation_request')return response(intent,'I can’t change planner stuff yet. That power is coming later. 🍡');
 if(intent==='ambiguous')return response(intent,'I’m not totally sure what you mean. Are you asking about your tasks, schedule, or deadlines? 🍡',{choices:intentResult.parameters?.choices||['ask_tasks','ask_next_event','ask_deadlines']});
 const complex=intent==='complex';return response(intent,complex?'That needs more thinking than my tiny bean brain can do. Want me to make a Big Mochi Request? 🍓':'I don’t know how to answer that reliably yet. Want me to make a Big Mochi Request? 🍓',{escalation:true,reason:complex?'This needs judgment or strategy beyond KatOS rules.':'This question is outside Mochini’s supported deterministic intents.'});
}
