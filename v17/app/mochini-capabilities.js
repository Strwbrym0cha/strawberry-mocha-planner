import{allNoms,emergencyNoms,nomsMatchingFilters,pantryItems,plannedNomSuggestion,todayNom}from'./noms.js?v=22.1.29-20260818';
import{normalizeWorkSchedule,shiftLabel,shiftsForDate}from'./work-schedule.js?v=22.1.16-20260817';
import{sipsSummary}from'./sips.js?v=22.2.0-20260818';
import{catchAllItems}from'./catch-all.js?v=22.2.0-20260818';
import{openTasksForDate,taskTitle}from'./logic/tasks.js?v=22.1.19-20260817';
import{routineModeState}from'./guided-routines.js?v=22.1.30-20260818';

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

const DOMAIN_RULES=Object.freeze({
 noms:[[/\b(eat|eats|eating|ate|eaten|food|foods|meal|meals|snack|snacks|breakfast|lunch|dinner|hungry|hunger|nom|noms|pantry|recipe|recipes|grocery|groceries)\b/,3],[/\bwhat sounds good\b/,4],[/\b(havent eaten|have not eaten|not eaten|didnt eat|did not eat|forgot to eat|starving|no food all day)\b/,5]],
 sips:[[/\b(sip|sips|sipping|drink|drinks|drinking|water|hydration|hydrated|hydrate|thirsty|thirst)\b/,3],[/\bwhat are we sipping\b/,4]],
 tasks:[[/\b(task|tasks|todo|to do)\b/,3],[/\bneed to get something done\b/,5],[/\b(need to do|have to do|should do|start with|work on|finish something|get something done)\b/,3]],
 routines:[[/\b(routine|routines|routine mode|gateway task|morning routine|night routine)\b/,4]],
 projects:[[/\b(project|projects|parked project|current objective|next step)\b/,3],[/\bworking on\b/,2]],
 katLabs:[[/\b(kat labs|lab finding|lab findings|observation|observations|finding|findings)\b/,4],[/\b(pattern|patterns) about myself\b/,4]],
 catchAll:[[/\b(catch all|catchall|inbox|unsorted|captured|capture)\b/,4]]
});

export const MOCHINI_CAPABILITIES=Object.freeze({
 tasks:['remaining','count','next','recommendation'],
 schedule:['today','next_event','work_today','work_next'],
 noms:['today_nom','meal_suggestion','available_food','quick_food'],
 sips:['current_drink','today_total','goal_progress'],
 school:['deadlines','remaining_work','closest_deadline'],
 routines:['list','next_step','gateway','recommendation'],
 projects:['active','parked','next_step'],
 katLabs:['findings','observations'],
 catchAll:['list','count','unsorted']
});

/** Exposes the deterministic concept scores so routing can be tested without relying on canned sentences. */
export function detectMochiniDomains(question){
 const input=clean(question),scores=Object.fromEntries(Object.entries(DOMAIN_RULES).map(([domain,rules])=>[domain,score(input,rules)]));
 if(asksForHelp(input))for(const domain of Object.keys(scores))if(scores[domain]>0)scores[domain]+=1;
 return{input,scores,ranked:Object.entries(scores).filter(([,value])=>value>=3).sort((a,b)=>b[1]-a[1]).map(([domain,value])=>({domain,score:value}))};
}

function nomsAnswer(input,state,date){
 const today=todayNom(state),planned=plannedNomSuggestion(state,date),pantry=pantryItems(state),foods=allNoms(state),quick=isQuick(input),available=quick?[...emergencyNoms(state),...nomsMatchingFilters(state,{effort:'no-prep'}),...nomsMatchingFilters(state,{effort:'easy'})]:foods;
 const unique=available.filter((item,index,array)=>item&&array.findIndex(other=>String(other?.id)===String(item?.id))===index);
 if(/\b(what do i have|what food do i have|what do i have to eat|pantry|available food|food available)\b/.test(input)){
  if(pantry.length)return response('cap_noms_available',`Your Pantry has ${pantry.length} item${pantry.length===1?'':'s'}: ${pantry.slice(0,6).map(title).filter(Boolean).join(', ')}${pantry.length>6?'…':''} 🍱`,pantry.slice(0,6));
  if(foods.length)return response('cap_noms_available',`Your Pantry is empty, but you have ${foods.length} saved Nom${foods.length===1?'':'s'}: ${foods.slice(0,6).map(title).filter(Boolean).join(', ')}${foods.length>6?'…':''} 🍓`,foods.slice(0,6));
  return response('cap_noms_available','Noms does not have any saved food or Pantry items yet. 🍡');
 }
 if(today?.label&&!quick)return response('cap_noms_recommendation',`Today’s Nom is ${today.label}. 🍓`,[today]);
 if(planned?.label&&!quick)return response('cap_noms_recommendation',`Your Meal Plan suggests ${planned.label} today. 🍱`,[planned]);
 if(unique.length){const pick=unique[0];if(needsFoodNow(input))return response('cap_noms_recommendation',`You said you haven’t eaten yet, so let’s keep the decision small: ${title(pick)}. It’s already saved as a low-effort Nom. 🍓`,[pick],{signals:['food_now','low_effort']});return response('cap_noms_recommendation',quick?`For something quick, I’d grab ${title(pick)}. It’s already in your Noms as a low-effort option. 🍓`:`Tiny bean food vote: ${title(pick)}. It’s already saved in Noms. 🍓`,[pick]);}
 if(pantry.length)return response('cap_noms_recommendation',`I don’t have a saved Nom recommendation yet, but your Pantry has ${pantry.slice(0,4).map(title).filter(Boolean).join(', ')}. 🍱`,pantry.slice(0,4));
 return response('cap_noms_recommendation','Noms does not have enough saved food data to pick reliably yet. Add a few My Noms or Pantry items and I can route this without Big Mochi. 🍡');
}

function sipsAnswer(input,state,date){
 const summary=sipsSummary(state,date),drink=summary.drink||'Water';
 if(/\b(enough|goal|hydrated|hydrate|hydration|how am i doing)\b/.test(input)){
  if(summary.goalMet)return response('cap_sips_progress',`Yep. You’ve logged ${summary.totalOz} oz of ${drink} today, meeting your ${summary.goalOz} oz Sips goal. 💧`,summary.entries);
  return response('cap_sips_progress',`You’ve logged ${summary.totalOz} of ${summary.goalOz} oz today. ${summary.remainingOz} oz remain for your current Sips goal. 💧`,summary.entries);
 }
 if(/\b(how much|how many|today|logged|water)\b/.test(input))return response('cap_sips_progress',`Sips has ${summary.totalOz} oz logged today out of your ${summary.goalOz} oz goal. You’re currently sipping ${drink}. 💧`,summary.entries);
 return response('cap_sips_current',`We’re sipping ${drink}. You’ve logged ${summary.totalOz} oz today. 💧`,summary.entries);
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

function appendWorkContext(result,state,date){
 const shifts=shiftsForDate(normalizeWorkSchedule(state.workSchedule),date);
 if(!shifts.length)return result;
 const labels=shifts.map(shiftLabel).join(' • ');
 return{...result,answer:`${result.answer} You work ${labels} today, so keep that timing in mind.`,evidence:[...list(result.evidence),...shifts]};
}

function projectsAnswer(input,state){
 const projects=list(state.projects),parked=projects.filter(item=>item?.status==='Parked'),active=projects.filter(item=>item?.status!=='Parked');
 if(/\bparked\b/.test(input))return parked.length?response('cap_projects_parked',`You have ${parked.length} parked project${parked.length===1?'':'s'}: ${parked.slice(0,5).map(title).join(', ')}.`,parked.slice(0,5)):response('cap_projects_parked','You do not have any parked projects right now. 🌷');
 if(!active.length)return response('cap_projects_active','You do not have an active project right now. 🍡');
 return response('cap_projects_active',`You’re actively working on ${active.slice(0,5).map(item=>`${title(item)}${item.nextStep?` → ${item.nextStep}`:''}`).join(' • ')}.`,active.slice(0,5));
}

function labsAnswer(input,state){
 const observations=list(state.labObservations),findings=list(state.labFindings).filter(item=>item?.status!=='Archived');
 if(/\bobserv/.test(input))return observations.length?response('cap_labs_observations',`Your recent observations include: ${observations.slice(-4).reverse().map(title).join(' • ')}.`,observations.slice(-4)):response('cap_labs_observations','Kat Labs does not have any observations yet. 🔬');
 if(findings.length)return response('cap_labs_findings',`Kat Labs has ${findings.length} active finding${findings.length===1?'':'s'}: ${findings.slice(-4).reverse().map(title).join(' • ')}.`,findings.slice(-4));
 return response('cap_labs_findings','Kat Labs does not have any active findings yet. 🔬');
}

function catchAllAnswer(state){
 const captures=catchAllItems(state);if(!captures.length)return response('cap_catch_all','Your Catch-All inbox is clear right now. 🍓');
 const recent=captures.slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))).slice(0,4);
 return response('cap_catch_all',`You have ${captures.length} unsorted thing${captures.length===1?'':'s'} in Catch-All: ${recent.map(title).join(', ')}.`,recent);
}

const uniqueEvidence=items=>items.filter((item,index,array)=>item&&array.findIndex(other=>String(other?.id||other?.name||other?.title||'')===String(item?.id||item?.name||item?.title||''))===index);
function compose(results,domains){
 if(results.length===1)return{...results[0],domains};
 const primary=results[0];return{...primary,answer:results.map(result=>result.answer).join(' '),evidence:uniqueEvidence(results.flatMap(result=>list(result.evidence))),escalation:results.some(result=>result.escalation),reason:results.find(result=>result.reason)?.reason||'',domains,composite:true};
}

/** Deterministic concept router: meaningful words can activate multiple KatOS domains. */
export function routeMochiniCapability(question,{state={},evaluation={},session={}}={}){
 const detected=detectMochiniDomains(question),input=detected.input;if(!input||isDirectMutation(input))return null;const date=dateKey(evaluation?.date);
 const followupNoms=String(session?.lastIntent||'').startsWith('cap_noms_')&&/\b(anything|something|one|option|quicker|quick|else|another)\b/.test(input);
 const followupSips=String(session?.lastIntent||'').startsWith('cap_sips_')&&/\b(how much|enough|today|goal|what about now)\b/.test(input);
 if(followupNoms&&!detected.ranked.some(item=>item.domain==='noms'))detected.ranked.unshift({domain:'noms',score:3});
 if(followupSips&&!detected.ranked.some(item=>item.domain==='sips'))detected.ranked.unshift({domain:'sips',score:3});
 const selected=detected.ranked.slice(0,2),results=[];
 for(const {domain} of selected){
  let result=null;
  if(domain==='noms')result=nomsAnswer(input,state,date);
  else if(domain==='sips')result=sipsAnswer(input,state,date);
  else if(domain==='tasks')result=taskAnswer(input,state,date,evaluation);
  else if(domain==='routines')result=routineAnswer(input,state,date);
  else if(domain==='projects')result=projectsAnswer(input,state);
  else if(domain==='katLabs')result=labsAnswer(input,state);
  else if(domain==='catchAll')result=catchAllAnswer(state);
  if(result){if(mentionsWork(input)&&(domain==='noms'||domain==='tasks'))result=appendWorkContext(result,state,date);results.push(result);}
 }
 if(!results.length)return null;
 return compose(results,selected.map(item=>item.domain));
}
