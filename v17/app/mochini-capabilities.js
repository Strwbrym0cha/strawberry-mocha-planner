import{allNoms,emergencyNoms,nomsMatchingFilters,pantryItems,plannedNomSuggestion,todayNom}from'./noms.js?v=22.1.29-20260818';
import{normalizeWorkSchedule,shiftLabel,shiftsForDate}from'./work-schedule.js?v=22.1.16-20260817';
import{sipsSummary}from'./sips.js?v=22.2.0-20260818';
import{catchAllItems}from'./catch-all.js?v=22.2.0-20260818';

const clean=value=>String(value||'').toLowerCase().replace(/[’‘']/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const list=value=>Array.isArray(value)?value:[];
const title=item=>String(item?.name||item?.title||item?.text||'').trim();
const response=(intent,answer,evidence=[])=>({intent,answer,evidence,escalation:false,choices:[],reason:'',recommendation:null});
const dateKey=date=>String(date||new Date().toISOString().slice(0,10));
const isFood=input=>/\b(eat|food|meal|snack|nom|noms|pantry|hungry)\b/.test(input);
const isQuick=input=>/\b(quick|quicker|fast|easy|low effort|no prep|before work|before my shift)\b/.test(input);
const isProjects=input=>/\b(project|projects|working on|parked)\b/.test(input);
const isLabs=input=>/\b(kat labs|labs|finding|findings|observation|observations|noticed about myself|patterns? about myself)\b/.test(input);
const isCatchAll=input=>/\b(catch all|catchall|captured|capture|inbox|unsorted)\b/.test(input);
const isSips=input=>/\b(sip|sips|sipping|drink|drinking|water|hydration|hydrated)\b/.test(input)||/\bwhat are we sipping\b/.test(input);

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

function nomsAnswer(input,state,date){
 const today=todayNom(state),planned=plannedNomSuggestion(state,date),pantry=pantryItems(state),foods=allNoms(state),quick=isQuick(input),available=quick?[...emergencyNoms(state),...nomsMatchingFilters(state,{effort:'no-prep'}),...nomsMatchingFilters(state,{effort:'easy'})]:foods;
 const unique=available.filter((item,index,array)=>item&&array.findIndex(other=>String(other?.id)===String(item?.id))===index);
 if(/\b(what do i have|what food do i have|what do i have to eat|pantry|available food)\b/.test(input)){
  if(pantry.length)return response('cap_noms_available',`Your Pantry has ${pantry.length} item${pantry.length===1?'':'s'}: ${pantry.slice(0,6).map(title).filter(Boolean).join(', ')}${pantry.length>6?'…':''} 🍱`,pantry.slice(0,6));
  if(foods.length)return response('cap_noms_available',`Your Pantry is empty, but you have ${foods.length} saved Nom${foods.length===1?'':'s'}: ${foods.slice(0,6).map(title).filter(Boolean).join(', ')}${foods.length>6?'…':''} 🍓`,foods.slice(0,6));
  return response('cap_noms_available','Noms does not have any saved food or Pantry items yet. 🍡');
 }
 if(today?.label&&!quick)return response('cap_noms_recommendation',`Today’s Nom is ${today.label}. 🍓`,[today]);
 if(planned?.label&&!quick)return response('cap_noms_recommendation',`Your Meal Plan suggests ${planned.label} today. 🍱`,[planned]);
 if(unique.length){const pick=unique[0];return response('cap_noms_recommendation',quick?`For something quick, I’d grab ${title(pick)}. It’s already in your Noms as a low-effort option. 🍓`:`Tiny bean food vote: ${title(pick)}. It’s already saved in Noms. 🍓`,[pick]);}
 if(pantry.length)return response('cap_noms_recommendation',`I don’t have a saved Nom recommendation yet, but your Pantry has ${pantry.slice(0,4).map(title).filter(Boolean).join(', ')}. 🍱`,pantry.slice(0,4));
 return response('cap_noms_recommendation','Noms does not have enough saved food data to pick reliably yet. Add a few My Noms or Pantry items and I can route this without Big Mochi. 🍡');
}

function sipsAnswer(input,state,date){
 const summary=sipsSummary(state,date),drink=summary.drink||'Water';
 if(/\b(enough|goal|hydrated|how am i doing)\b/.test(input)){
  if(summary.goalMet)return response('cap_sips_progress',`Yep. You’ve logged ${summary.totalOz} oz of ${drink} today, meeting your ${summary.goalOz} oz Sips goal. 💧`,summary.entries);
  return response('cap_sips_progress',`You’ve logged ${summary.totalOz} of ${summary.goalOz} oz today. ${summary.remainingOz} oz remain for your current Sips goal. 💧`,summary.entries);
 }
 if(/\b(how much|how many|today|logged)\b/.test(input))return response('cap_sips_progress',`Sips has ${summary.totalOz} oz logged today out of your ${summary.goalOz} oz goal. You’re currently sipping ${drink}. 💧`,summary.entries);
 return response('cap_sips_current',`We’re sipping ${drink}. You’ve logged ${summary.totalOz} oz today. 💧`,summary.entries);
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

/** Read-only capability router. Returns null when legacy Mochini intents should handle the request. */
export function routeMochiniCapability(question,{state={},evaluation={},session={}}={}){
 const input=clean(question);if(!input)return null;const date=dateKey(evaluation?.date);
 const followupNoms=String(session?.lastIntent||'').startsWith('cap_noms_')&&/\b(anything|something|one|option|quicker|quick|else|another)\b/.test(input);
 const followupSips=String(session?.lastIntent||'').startsWith('cap_sips_')&&/\b(how much|enough|today|goal|what about now)\b/.test(input);
 if(isSips(input)||followupSips)return sipsAnswer(input,state,date);
 if(isFood(input)||followupNoms){const result=nomsAnswer(input,state,date);return /\b(work|shift|before work|before my shift)\b/.test(input)?appendWorkContext(result,state,date):result;}
 if(isProjects(input)&&/\b(what|which|working|parked|project)\b/.test(input))return projectsAnswer(input,state);
 if(isLabs(input)&&/\b(what|show|finding|observation|noticed|pattern|labs)\b/.test(input))return labsAnswer(input,state);
 if(isCatchAll(input)&&/\b(what|show|anything|how many|captured|capture|inbox|unsorted)\b/.test(input))return catchAllAnswer(state);
 return null;
}
