import{allNoms,emergencyNoms,nomsMatchingFilters,pantryItems,plannedNomSuggestion,todayNom}from'./noms.js?v=22.1.29-20260818';
import{normalizeWorkSchedule,shiftLabel,shiftsForDate}from'./work-schedule.js?v=22.1.16-20260817';
import{sipsSummary}from'./sips.js?v=22.9.0-20260819';
import{catchAllItems}from'./catch-all.js?v=22.2.0-20260818';
import{openTasksForDate,taskTitle}from'./logic/tasks.js?v=22.1.19-20260817';
import{routineModeState}from'./guided-routines.js?v=22.1.30-20260818';
import{upcomingDeadlines}from'./logic/deadlines.js?v=22.1.26-20260818';

const clean=value=>String(value||'').toLowerCase().replace(/[’‘']/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const list=value=>Array.isArray(value)?value:[];
const title=item=>String(item?.name||item?.title||item?.text||'').trim();
const response=(intent,answer,evidence=[],extra={})=>({intent,answer,evidence,escalation:false,choices:[],reason:'',recommendation:null,...extra});
const dateKey=date=>String(date||new Date().toISOString().slice(0,10));
const has=(input,pattern)=>pattern.test(input);
const score=(input,rules)=>rules.reduce((total,[pattern,weight])=>total+(has(input,pattern)?weight:0),0);
const asksForHelp=input=>/\b(what|which|how|should|can|could|would|need|want|pick|recommend|show|tell|help|anything|something|have|do|give|when|where|whats)\b/.test(input);
const mentionsWork=input=>/\b(work|shift|job)\b/.test(input);
const needsFoodNow=input=>/\b(havent eaten|have not eaten|not eaten|didnt eat|did not eat|forgot to eat|need to eat|starving|really hungry|so hungry|ate nothing|no food all day)\b/.test(input);
const isQuick=input=>/\b(quick|quicker|fast|easy|easier|low effort|no prep|simple|tired|exhausted|drained|before work|before my shift)\b/.test(input)||needsFoodNow(input);
const isDirectMutation=input=>/\b(delete|remove|reschedule|archive|park)\b/.test(input)||/\bmove (this|that|the|my|a)\b/.test(input)||/\b(mark|complete|finish) (this|that|the|my|a)\b/.test(input)||/\bprotect (this|that|the|my|a)\b/.test(input);
const addDays=(value,amount)=>{const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+amount);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const requestedDate=(input,base)=>/\btomorrow\b/.test(input)?addDays(base,1):base;
const sameText=(a,b)=>clean(a)&&clean(a)===clean(b);

const DOMAIN_RULES=Object.freeze({
 noms:[[/\b(eat|eats|eating|ate|eaten|food|foods|meal|meals|snack|snacks|breakfast|lunch|dinner|hungry|hunger|nom|noms|pantry|recipe|recipes|grocery|groceries)\b/,3],[/\bwhat sounds good\b/,4],[/\b(havent eaten|have not eaten|not eaten|didnt eat|did not eat|forgot to eat|starving|no food all day)\b/,5]],
 sips:[[/\b(sip|sips|sipping|drink|drinks|drinking|water|hydration|hydrated|hydrate|thirsty|thirst|soda|juice|gatorade)\b/,3],[/\bwhat are we sipping\b/,4]],
 motion:[[/\b(workout|workouts|exercise|exercises|pilates|treadmill|movement|motion meadow|stretch|stretching|cardio)\b/,5],[/\b(move my body|move today|work out)\b/,5]],
 tasks:[[/\b(task|tasks|todo|to do)\b/,3],[/\bneed to get something done\b/,5],[/\b(need to do|have to do|should do|start with|work on|finish something|get something done)\b/,3]],
 routines:[[/\b(routine|routines|routine mode|gateway task|morning routine|night routine)\b/,4]],
 schedule:[[/\b(schedule|calendar|event|events|appointment|appointments)\b/,4],[/\b(work shift|my shift|shift today|shift tomorrow|when do i work)\b/,5]],
 deadlines:[[/\b(deadline|deadlines|due|overdue|due soon|schoolwork|school work|assignment|assignments)\b/,4]],
 capacity:[[/\b(capacity|how much can i handle|what can i handle)\b/,5],[/\b(exhausted|drained|overwhelmed|low energy|high energy)\b/,2]],
 hyperfixation:[[/\b(hyperfixation|hyperfixating|fixation|locked in|locked-in)\b/,5]],
 reminders:[[/\b(reminder|reminders|remind|birthday|birthdays)\b/,4]],
 goals:[[/\b(goal|goals|dreamscape)\b/,4]],
 wellness:[[/\b(wellness|check in|check-in|mood|mental capacity|focus state|body status|food status)\b/,4]],
 projects:[[/\b(project|projects|parked project|current objective)\b/,3],[/\bworking on\b/,2]],
 katLabs:[[/\b(kat labs|lab finding|lab findings|observation|observations|finding|findings)\b/,4],[/\b(pattern|patterns) about myself\b/,4]],
 catchAll:[[/\b(catch all|catchall|inbox|unsorted|captured|capture)\b/,4]]
});

export const MOCHINI_CAPABILITIES=Object.freeze({
 tasks:['remaining','count','next','recommendation'],
 schedule:['today','tomorrow','next_event','work_today','work_next'],
 noms:['current_nom','eaten_today','meal_suggestion','available_food','quick_food'],
 sips:['current_drink','today_breakdown','sip_fridge','drink_recommendation','goal_progress'],
 motion:['today_sessions','today_plan','routine_recommendation','saved_videos'],
 school:['deadlines','remaining_work','closest_deadline'],
 routines:['list','next_step','gateway','recommendation'],
 reminders:['upcoming','birthdays'],
 goals:['active','next_step'],
 wellness:['latest_check_in'],
 hyperfixation:['status','focus'],
 capacity:['current'],
 projects:['active','parked','next_step'],
 katLabs:['findings','observations'],
 catchAll:['list','count','unsorted']
});

/** Scores concepts found anywhere in a message. No exact sentence is required. */
export function detectMochiniDomains(question){
 const input=clean(question),scores=Object.fromEntries(Object.entries(DOMAIN_RULES).map(([domain,rules])=>[domain,score(input,rules)]));
 if(asksForHelp(input))for(const domain of Object.keys(scores))if(scores[domain]>0)scores[domain]+=1;
 return{input,scores,ranked:Object.entries(scores).filter(([,value])=>value>=3).sort((a,b)=>b[1]-a[1]).map(([domain,value])=>({domain,score:value}))};
}

function nomHistoryForDate(state,date){
 const foods=list(state?.noms?.foods),logs=list(state?.noms?.nomHistory).filter(entry=>String(entry?.date||'')===String(date));
 return logs.map(entry=>{const food=foods.find(item=>String(item?.id)===String(entry?.nomId)),label=String(food?.name||entry?.text||entry?.label||'Nom').trim()||'Nom';return{...entry,label}});
}
function nomsAnswer(input,state,date){
 const current=todayNom(state),planned=plannedNomSuggestion(state,date),pantry=pantryItems(state),foods=allNoms(state),history=nomHistoryForDate(state,date),consumedIds=new Set(history.map(item=>String(item.nomId||'')).filter(Boolean)),consumedNames=new Set(history.map(item=>clean(item.label)).filter(Boolean)),quick=isQuick(input),available=quick?[...emergencyNoms(state),...nomsMatchingFilters(state,{effort:'no-prep'}),...nomsMatchingFilters(state,{effort:'easy'})]:foods;
 const unique=available.filter((item,index,array)=>item&&array.findIndex(other=>String(other?.id)===String(item?.id))===index),fresh=unique.filter(item=>!consumedIds.has(String(item?.id||''))&&!consumedNames.has(clean(title(item))));
 const historyQuestion=/\b(what did i eat|what have i eaten|what have i had to eat|what did i have|eaten today|ate today)\b/.test(input),currentQuestion=/\b(what am i eating|current nom|whats my nom|what is my nom)\b/.test(input);
 if(historyQuestion){if(!history.length)return response('cap_noms_history','You haven’t logged any Noms for this day yet. 🍱');return response('cap_noms_history',`You’ve logged ${history.map(item=>item.label).join(' → ')}. 🍱`,history)}
 if(currentQuestion)return current?.label?response('cap_noms_current',`Right now your current Nom is ${current.label}. 🍓`,[current]):response('cap_noms_current','You do not have a current Nom set right now. 🍱');
 if(/\b(what do i have|what food do i have|what do i have to eat|pantry|available food|food available)\b/.test(input)){
  if(pantry.length)return response('cap_noms_available',`Your Pantry has ${pantry.length} item${pantry.length===1?'':'s'}: ${pantry.slice(0,6).map(title).filter(Boolean).join(', ')}${pantry.length>6?'…':''} 🍱`,pantry.slice(0,6));
  if(foods.length)return response('cap_noms_available',`Your Pantry is empty, but you have ${foods.length} saved Nom${foods.length===1?'':'s'}: ${foods.slice(0,6).map(title).filter(Boolean).join(', ')}${foods.length>6?'…':''} 🍓`,foods.slice(0,6));
  return response('cap_noms_available','Noms does not have any saved food or Pantry items yet. 🍡');
 }
 const plannedAlreadyHad=planned?.label&&consumedNames.has(clean(planned.label));
 if(planned?.label&&!quick&&!plannedAlreadyHad)return response('cap_noms_recommendation',history.length?`You’ve already logged ${history.map(item=>item.label).join(', ')} today. Your Meal Plan has a fresh option: ${planned.label}. 🍱`:`Your Meal Plan suggests ${planned.label} today. 🍱`,[planned,...history]);
 if(fresh.length){const pick=fresh[0],already=history.length?`You’ve already had ${history.map(item=>item.label).join(', ')}. `:'';if(needsFoodNow(input))return response('cap_noms_recommendation',`${already}Let’s keep the next decision small: ${title(pick)}. It’s a saved low-effort option you haven’t logged yet today. 🍓`,[pick,...history],{signals:['food_now','low_effort','not_already_eaten']});return response('cap_noms_recommendation',`${already}${quick?'For something quick, I’d grab':'Tiny bean food vote:'} ${title(pick)}${quick?'.':''} It hasn’t shown up in today’s Nom Diary yet. 🍓`,[pick,...history]);}
 if(pantry.length)return response('cap_noms_recommendation',history.length?`You’ve already logged ${history.map(item=>item.label).join(', ')}. I don’t see another fresh saved Nom, but your Pantry has ${pantry.slice(0,4).map(title).filter(Boolean).join(', ')}. 🍱`:`I don’t have a saved Nom recommendation yet, but your Pantry has ${pantry.slice(0,4).map(title).filter(Boolean).join(', ')}. 🍱`,[...history,...pantry.slice(0,4)]);
 if(unique.length&&history.length)return response('cap_noms_recommendation',`Everything I can currently recommend from My Noms has already appeared in today’s Nom Diary. Add another option or pick something from outside the saved list. 🍡`,history);
 return response('cap_noms_recommendation','Noms does not have enough saved food data to pick reliably yet. Add a few My Noms or Pantry items and I can route this without Big Mochi. 🍡');
}

function drinkBreakdown(entries){const map=new Map();for(const entry of entries){const name=String(entry?.drink||'Drink').trim()||'Drink',key=clean(name),current=map.get(key)||{name,total:0};current.total+=Number(entry?.amountOz)||0;map.set(key,current)}return[...map.values()].sort((a,b)=>b.total-a.total)}
function sipsAnswer(input,state,date){
 const summary=sipsSummary(state,date),drink=summary.drink||'Water',groups=drinkBreakdown(summary.entries),consumed=new Set(groups.map(group=>clean(group.name))),fridge=list(summary.fridge),fresh=fridge.filter(item=>!consumed.has(clean(item.name))).sort((a,b)=>Number(b.favorite)-Number(a.favorite)),fallback=fridge.slice().sort((a,b)=>Number(b.favorite)-Number(a.favorite)),pick=fresh[0]||fallback[0];
 const breakdownText=groups.map(group=>`${group.name} ${group.total} oz`).join(' • '),currentQuestion=/\b(current drink|what am i sipping|what are we currently sipping)\b/.test(input),recommendQuestion=/\b(what should i drink|what should i sip|what do i drink|what are we sipping|pick.*drink|recommend.*drink|something to drink|something to sip|thirsty)\b/.test(input);
 if(currentQuestion)return response('cap_sips_current',`Your current quick-log drink is ${drink}. 💧`,[{drink}]);
 if(/\b(enough|goal|hydrated|hydrate|hydration|how am i doing)\b/.test(input)){
  if(summary.goalMet)return response('cap_sips_progress',`Yep. You’ve logged ${summary.totalOz} oz total today, meeting your ${summary.goalOz} oz Sips goal.${breakdownText?` Breakdown: ${breakdownText}.`:''} 💧`,summary.entries);
  return response('cap_sips_progress',`You’ve logged ${summary.totalOz} of ${summary.goalOz} oz today. ${summary.remainingOz} oz remain.${breakdownText?` So far: ${breakdownText}.`:''} 💧`,summary.entries);
 }
 if(/\bhow much.*water|how many.*water|water.*how much\b/.test(input)){const water=groups.find(group=>clean(group.name)==='water');return response('cap_sips_breakdown',water?`You’ve logged ${water.total} oz of water today. 💧`:'You haven’t logged any water today yet. 💧',summary.entries.filter(entry=>clean(entry.drink)==='water'))}
 if(/\b(how much|how many|today|logged|breakdown|what did i drink|what have i drunk|what have i had to drink)\b/.test(input))return response('cap_sips_breakdown',summary.entries.length?`Sips has ${summary.totalOz} oz logged today${breakdownText?`: ${breakdownText}`:''}. 💧`:'You haven’t logged any drinks today yet. 💧',summary.entries);
 if(recommendQuestion){if(pick){const repeated=!fresh.length&&consumed.has(clean(pick.name)),already=groups.length?`So far you’ve had ${breakdownText}. `:'';return response('cap_sips_recommendation',`${already}${repeated?'Your Sip Fridge doesn’t have an untried drink left today, so I’d circle back to':'I’d grab'} ${pick.name}${pick.servingOz?` (${pick.servingOz} oz)`:''}. 🧊`,[pick,...summary.entries],{signals:[repeated?'repeat_only_option':'fresh_fridge_option']})}return response('cap_sips_recommendation',`Your Sip Fridge is empty, so I only know your current quick-log drink: ${drink}. Add the drinks you have and I can make a real pick next time. 🧊`,[{drink}])}
 return response('cap_sips_current',`Your current quick-log drink is ${drink}. You’ve logged ${summary.totalOz} oz total today${breakdownText?`: ${breakdownText}`:''}. 💧`,summary.entries);
}

function movementAnswer(input,state,date){
 const motion=state.motion||{},sessions=list(motion.sessions).filter(item=>String(item?.date||'')===String(date)),plans=list(motion.plans).filter(item=>String(item?.date||'')===String(date)),routines=list(motion.routines),videos=list(motion.videos),completedIds=new Set(sessions.map(item=>String(item?.sourceId||'')).filter(Boolean)),completedNames=new Set(sessions.map(item=>clean(item?.title||item?.type)).filter(Boolean)),planned=plans.filter(item=>String(item?.status||'planned')==='planned'),lowEnergy=/\b(gentle|easy|low energy|tired|exhausted|drained|dont feel like|do not feel like|dont wanna|do not want to|quick|short|tiny)\b/.test(input);
 const routineOptions=routines.filter(item=>!completedIds.has(String(item?.id||''))&&!completedNames.has(clean(item?.name))).sort((a,b)=>lowEnergy?(Number(b.emergency)-Number(a.emergency)||Number(b.favorite)-Number(a.favorite)):(Number(b.favorite)-Number(a.favorite)||Number(b.emergency)-Number(a.emergency))),videoOptions=videos.filter(item=>!completedIds.has(String(item?.id||''))&&!completedNames.has(clean(item?.title))).sort((a,b)=>Number(b.favorite)-Number(a.favorite));
 const historyQuestion=/\b(what workout did i do|what did i do.*workout|what movement did i do|did i work out|workouts today|movement today|exercise today)\b/.test(input),planQuestion=/\b(what.*planned|planned.*workout|plan.*workout|movement plan|workout plan)\b/.test(input);
 if(historyQuestion){if(!sessions.length)return response('cap_motion_history','You haven’t logged a movement session today yet. 🌷');return response('cap_motion_history',`Today you logged ${sessions.map(item=>`${item.title||item.type||'Movement'}${item.durationMin?` (${item.durationMin} min)`:''}`).join(' • ')}. 🌷`,sessions)}
 if(planQuestion){if(!planned.length)return response('cap_motion_plan','You don’t have any unfinished movement planned today. Spontaneous movement still counts. 🌱');return response('cap_motion_plan',`Today’s movement plan: ${planned.map(item=>item.label||routines.find(r=>String(r.id)===String(item.sourceId))?.name||videos.find(v=>String(v.id)===String(item.sourceId))?.title||'Movement').join(', ')}. 🌷`,planned)}
 if(planned.length){const item=planned[0],label=item.label||routines.find(r=>String(r.id)===String(item.sourceId))?.name||videos.find(v=>String(v.id)===String(item.sourceId))?.title||'your planned movement';return response('cap_motion_recommendation',`You already planned ${label} for today, so I’d start there instead of inventing a new workout. 🌷`,[item])}
 const pick=routineOptions[0]||videoOptions[0];if(pick){const already=sessions.length?`You’ve already logged ${sessions.map(item=>item.title||item.type||'movement').join(', ')} today. `:'';const label=pick.name||pick.title||'Movement',kind=pick.name?'Movement Recipe':'saved video',reason=lowEnergy&&pick.emergency?' It’s marked as a low-energy option.':'';return response('cap_motion_recommendation',`${already}For something different, I’d pick ${label} from your ${kind}.${reason} 🌷`,[pick,...sessions],{signals:['not_completed_today',lowEnergy?'low_energy_match':'saved_option']})}
 if(sessions.length)return response('cap_motion_recommendation',`You’ve already logged ${sessions.map(item=>item.title||item.type||'movement').join(', ')} today, and I don’t see another uncompleted routine or video in Motion Meadow. 🌷`,sessions);
 return response('cap_motion_recommendation','Motion Meadow does not have a saved routine or video to recommend yet. Add one and I can pick from your actual movement library. 🌷');
}

function taskAnswer(input,state,date,evaluation){
 const tasks=openTasksForDate(state,date).filter(task=>!task?.done&&!task?.parked&&!list(task?.unavailableOn).includes(date));
 const statusQuestion=/\b(left|remaining|how many|what tasks|show|list|unfinished)\b/.test(input);
 if(statusQuestion){if(!tasks.length)return response('cap_tasks_remaining','You’re clear. You don’t have any remaining tasks for today. 🌷');return response('cap_tasks_remaining',`You have ${tasks.length} task${tasks.length===1?'':'s'} left today: ${tasks.slice(0,5).map(taskTitle).join(', ')}${tasks.length>5?'…':''}`,tasks.slice(0,5));}
 if(evaluation?.escalation?.needsBigMochi)return response('cap_tasks_recommendation','I found multiple equally ranked options, so I can’t fairly pretend one is the winner. Want a Big Mochi Request? 🍓',evaluation.candidates||[],{escalation:true,reason:'KatOS found equally ranked options.'});
 const recommendation=evaluation?.recommendedNextAction,task=recommendation?.task;
 if(task)return response('cap_tasks_recommendation',`Tiny bean vote: ${taskTitle(task)}. It’s the best fit from the planner information I can verify right now. 🍓`,recommendation.reasons||[],{recommendation});
 if(tasks.length)return response('cap_tasks_recommendation',`I can see ${tasks.length} open task${tasks.length===1?'':'s'}, but KatOS does not have enough ranking information to pick one reliably. 🍡`,tasks.slice(0,5));
 return response('cap_tasks_recommendation','Your task list is clear for today. 🌷');
}

function routineAnswer(input,state,date){
 const mode=routineModeState(state,date);
 if(mode.active){if(mode.complete)return response('cap_routines_next','Your active Guided Routine is complete. ✨',[mode.routine]);if(mode.currentTask)return response('cap_routines_next',`You’re in ${mode.routine?.name||'Routine Mode'}. Next step: ${taskTitle(mode.currentTask)}. 🌷`,[mode.currentTask,mode.routine]);return response('cap_routines_next',`You’re in ${mode.routine?.name||'Routine Mode'}, but there isn’t an available next step right now.`,[mode.routine]);}
 const routines=[...list(state.guidedRoutines),...list(state.routines)];if(!routines.length)return response('cap_routines_list','You do not have any saved routines yet. 🌷');
 const named=routines.find(routine=>{const name=clean(routine?.name);return name&&input.includes(name)});if(named)return response('cap_routines_list',`${named.name} is saved${Array.isArray(named.taskIds)?` with ${named.taskIds.length} guided task${named.taskIds.length===1?'':'s'}`:Array.isArray(named.steps)?` with ${named.steps.length} step${named.steps.length===1?'':'s'}`:''}. 🌷`,[named]);
 return response('cap_routines_list',`You have ${routines.length} routine${routines.length===1?'':'s'}: ${routines.slice(0,5).map(title).filter(Boolean).join(', ')}${routines.length>5?'…':''}.`,routines.slice(0,5));
}

function scheduleAnswer(input,state,baseDate){
 const date=requestedDate(input,baseDate),label=date===baseDate?'today':'tomorrow',schedule=normalizeWorkSchedule(state.workSchedule),shifts=shiftsForDate(schedule,date),events=list(state.events).filter(event=>String(event?.date)===date).sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));
 if(/\b(work|shift|job)\b/.test(input))return shifts.length?response('cap_schedule_work',`You work ${shifts.map(shiftLabel).join(' • ')} ${label}. 💼`,shifts):response('cap_schedule_work',`No work shift is scheduled ${label}. 🌷`);
 if(!events.length)return response('cap_schedule_events',`Nothing is scheduled ${label}. Your calendar is clear. 🌷`);
 const first=events[0],when=first.start?` at ${first.start}`:'';return response('cap_schedule_events',`${events.length} event${events.length===1?'':'s'} ${label}: ${title(first)||'Scheduled event'}${when}${events.length>1?` and ${events.length-1} more`:''}.`,events);
}

function deadlinesAnswer(input,state,date){
 let items=upcomingDeadlines(state,{date,limit:8});if(/\b(school|assignment|schoolwork|school work)\b/.test(input))items=items.filter(item=>String(item.source).startsWith('school')||String(item.source).startsWith('course'));
 if(!items.length)return response('cap_deadlines','I don’t see an upcoming matching deadline in KatOS right now. 🌷');
 const first=items[0],when=first.urgency==='today'?'today':first.urgency==='tomorrow'?'tomorrow':first.daysRemaining<0?`${Math.abs(first.daysRemaining)} day${Math.abs(first.daysRemaining)===1?'':'s'} overdue`:first.daysRemaining<=7?`in ${first.daysRemaining} day${first.daysRemaining===1?'':'s'}`:first.date;
 return response('cap_deadlines',`Closest deadline: ${first.title}, ${when}. ${items.length>1?`I can also see ${items.length-1} more upcoming.`:''}`.trim(),items);
}

function capacityAnswer(evaluation){const capacity=evaluation?.state?.capacity||'High';return response('cap_capacity',`KatOS currently has your capacity at ${capacity}. I’ll use that when weighing what fits today. 🍓`,[{capacity}]);}
function hyperfixationAnswer(state){const mode=state.hyperfixation||{};if(!mode.active)return response('cap_hyperfixation','Hyperfixation Mode is not active right now. 🌷');return response('cap_hyperfixation',`Hyperfixation Mode is active${mode.focusLabel?` on ${mode.focusLabel}`:''}${mode.exitAt?`. Your exit time is ${mode.exitAt}`:''}. ⚡`,[mode]);}
function remindersAnswer(input,state){let reminders=list(state.reminders).filter(item=>!item?.completed);if(/\bbirthday/.test(input))reminders=reminders.filter(item=>String(item?.type||'').toLowerCase()==='birthday'||String(item?.repeat||'').toLowerCase()==='yearly');reminders=reminders.slice().sort((a,b)=>`${a.date||'9999'} ${a.time||'99:99'}`.localeCompare(`${b.date||'9999'} ${b.time||'99:99'}`));if(!reminders.length)return response('cap_reminders',/\bbirthday/.test(input)?'I don’t see any upcoming birthday reminders saved right now. 🎂':'You do not have any open reminders right now. 🌷');return response('cap_reminders',`${/\bbirthday/.test(input)?'Upcoming birthday':'Next reminder'}: ${title(reminders[0])}${reminders[0].date?` • ${reminders[0].date}`:''}${reminders.length>1?` • ${reminders.length-1} more saved`:''}.`,reminders.slice(0,5));}
function goalsAnswer(state){const goals=list(state.goals).filter(goal=>!goal?.archived&&String(goal?.status||'Active')!=='Completed'&&Number(goal?.progress||0)<100);if(!goals.length)return response('cap_goals','You do not have an active Dreamscape goal right now. 🌙');const withStep=goals.find(goal=>String(goal?.nextStep||'').trim())||goals[0];return response('cap_goals',`${title(withStep)||'Your goal'}${withStep.nextStep?` → next tiny step: ${withStep.nextStep}`:''}${goals.length>1?` • ${goals.length} active goals total`:''}. 🌙`,goals.slice(0,5));}
function wellnessAnswer(state,date){const entries=list(state.wellness?.entries).filter(entry=>String(entry?.date)===date).slice().sort((a,b)=>String(b.createdAt||b.time||'').localeCompare(String(a.createdAt||a.time||'')));if(!entries.length)return response('cap_wellness','You haven’t logged a Wellness check-in today yet. 🌸');const latest=entries[0],parts=[latest.mood&&`mood ${latest.mood}`,latest.energy&&`energy ${latest.energy}`,latest.capacity&&`${latest.capacity} capacity`,latest.overwhelm&&`overwhelm ${latest.overwhelm}`,latest.focus&&`focus ${latest.focus}`].filter(Boolean);return response('cap_wellness',`Latest Wellness check-in: ${parts.join(' • ')||'saved for today'}. 🌸`,[latest]);}
function appendWorkContext(result,state,date){const shifts=shiftsForDate(normalizeWorkSchedule(state.workSchedule),date);if(!shifts.length)return result;const labels=shifts.map(shiftLabel).join(' • ');return{...result,answer:`${result.answer} You work ${labels} today, so keep that timing in mind.`,evidence:[...list(result.evidence),...shifts]};}
function projectsAnswer(input,state){const projects=list(state.projects),parked=projects.filter(item=>item?.status==='Parked'),active=projects.filter(item=>item?.status!=='Parked');if(/\bparked\b/.test(input))return parked.length?response('cap_projects_parked',`You have ${parked.length} parked project${parked.length===1?'':'s'}: ${parked.slice(0,5).map(title).join(', ')}.`,parked.slice(0,5)):response('cap_projects_parked','You do not have any parked projects right now. 🌷');if(!active.length)return response('cap_projects_active','You do not have an active project right now. 🍡');return response('cap_projects_active',`You’re actively working on ${active.slice(0,5).map(item=>`${title(item)}${item.nextStep?` → ${item.nextStep}`:''}`).join(' • ')}.`,active.slice(0,5));}
function labsAnswer(input,state){const observations=list(state.labObservations),findings=list(state.labFindings).filter(item=>item?.status!=='Archived');if(/\bobserv/.test(input))return observations.length?response('cap_labs_observations',`Your recent observations include: ${observations.slice(-4).reverse().map(title).join(' • ')}.`,observations.slice(-4)):response('cap_labs_observations','Kat Labs does not have any observations yet. 🔬');if(findings.length)return response('cap_labs_findings',`Kat Labs has ${findings.length} active finding${findings.length===1?'':'s'}: ${findings.slice(-4).reverse().map(title).join(' • ')}.`,findings.slice(-4));return response('cap_labs_findings','Kat Labs does not have any active findings yet. 🔬');}
function catchAllAnswer(state){const captures=catchAllItems(state);if(!captures.length)return response('cap_catch_all','Your Catch-All inbox is clear right now. 🍓');const recent=captures.slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))).slice(0,4);return response('cap_catch_all',`You have ${captures.length} unsorted thing${captures.length===1?'':'s'} in Catch-All: ${recent.map(title).join(', ')}.`,recent);}

const uniqueEvidence=items=>items.filter((item,index,array)=>item&&array.findIndex(other=>String(other?.id||other?.name||other?.title||JSON.stringify(other))===String(item?.id||item?.name||item?.title||JSON.stringify(item)))===index);
function compose(results,domains){if(results.length===1)return{...results[0],domains};const primary=results[0];return{...primary,answer:results.map(result=>result.answer).join(' '),evidence:uniqueEvidence(results.flatMap(result=>list(result.evidence))),escalation:results.some(result=>result.escalation),reason:results.find(result=>result.reason)?.reason||'',domains,composite:true};}

/** Deterministic concept router: meaningful words can activate multiple KatOS domains. */
export function routeMochiniCapability(question,{state={},evaluation={},session={}}={}){
 const detected=detectMochiniDomains(question),input=detected.input;if(!input||isDirectMutation(input))return null;const baseDate=dateKey(evaluation?.date),date=requestedDate(input,baseDate);
 const followupNoms=String(session?.lastIntent||'').startsWith('cap_noms_')&&/\b(anything|something|one|option|quicker|quick|else|another)\b/.test(input);
 const followupSips=String(session?.lastIntent||'').startsWith('cap_sips_')&&/\b(how much|enough|today|goal|what about now|else|another|option)\b/.test(input);
 const followupMotion=String(session?.lastIntent||'').startsWith('cap_motion_')&&/\b(anything|something|one|option|else|another|gentler|easier|shorter)\b/.test(input);
 if(followupNoms&&!detected.ranked.some(item=>item.domain==='noms'))detected.ranked.unshift({domain:'noms',score:3});
 if(followupSips&&!detected.ranked.some(item=>item.domain==='sips'))detected.ranked.unshift({domain:'sips',score:3});
 if(followupMotion&&!detected.ranked.some(item=>item.domain==='motion'))detected.ranked.unshift({domain:'motion',score:3});
 const selected=detected.ranked.filter(item=>!(item.domain==='routines'&&detected.scores.motion>=5)).slice(0,3),results=[];
 for(const {domain} of selected){let result=null;if(domain==='noms')result=nomsAnswer(input,state,date);else if(domain==='sips')result=sipsAnswer(input,state,date);else if(domain==='motion')result=movementAnswer(input,state,date);else if(domain==='tasks')result=taskAnswer(input,state,date,evaluation);else if(domain==='routines')result=routineAnswer(input,state,date);else if(domain==='schedule')result=scheduleAnswer(input,state,baseDate);else if(domain==='deadlines')result=deadlinesAnswer(input,state,date);else if(domain==='capacity')result=capacityAnswer(evaluation);else if(domain==='hyperfixation')result=hyperfixationAnswer(state);else if(domain==='reminders')result=remindersAnswer(input,state);else if(domain==='goals')result=goalsAnswer(state);else if(domain==='wellness')result=wellnessAnswer(state,date);else if(domain==='projects')result=projectsAnswer(input,state);else if(domain==='katLabs')result=labsAnswer(input,state);else if(domain==='catchAll')result=catchAllAnswer(state);if(result){if(mentionsWork(input)&&(domain==='noms'||domain==='tasks'))result=appendWorkContext(result,state,date);results.push(result);}}
 if(!results.length)return null;return compose(results,selected.map(item=>item.domain));
}
