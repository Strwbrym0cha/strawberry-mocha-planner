import{allNoms,emergencyNoms,nomsMatchingFilters,pantryItems,plannedNomSuggestion,todayNom}from'./noms.js?v=22.1.29-20260818';
import{normalizeWorkSchedule,shiftLabel,shiftsForDate}from'./work-schedule.js?v=22.1.16-20260817';
import{sipsSummary}from'./sips.js?v=22.2.0-20260818';
import{catchAllItems}from'./catch-all.js?v=22.2.0-20260818';
import{getAvailableActions,getLowEnergyActions,getRecommendedActions}from'./unified-actions.js?v=5';
import{getCareerProgress,getUpcomingSessions}from'./work-hq.js?v=5';
import{getAcademicPrograms,getCurrentFocusCourse,getDegreeProgressByLevel,getRecommendedAcademicNextStep,getUpcomingAcademicDeadlines}from'./study-nook.js?v=5';
import{getGigEarningsSummary,getGigPlatformComparison,getMoneySummary,getUpcomingBills}from'./finance-engine.js?v=5';
import{getCurrentHobbies,getGrowthWins,getMovementSummary,getRecommendedGrowthStep,getRecommendedMovement,getHobbyRecommendation}from'./lifestyle-engine.js?v=27';

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
const isLowEnergy=input=>/\b(tired|low energy|no energy|easy|small thing|tiny win|what can i do right now)\b/.test(input);
const isWork=input=>/\b(work|client|session|rbt|bcba|career|supervisor|materials?)\b/.test(input);
const isStudy=input=>/\b(study|school|course|class|touchstone|assignment|degree|sophia|wgu|transfer)\b/.test(input);
const isMoney=input=>/\b(money|balance|bill|bills|spend|spent|cash|account|subscription)\b/.test(input);
const isGig=input=>/\b(gig|shipt|doordash|door dash|tip|tips|payout|earned)\b/.test(input);
const isMovement=input=>/\b(move|movement|pilates|walk|walking|stretch|workout|exercise)\b/.test(input);
const isHobby=input=>/\b(bored|hobby|hobbies|fun|coloring|python|funko|creative)\b/.test(input);
const isGrowth=input=>/\b(personal growth|personally|accomplish|accomplished|milestone|how far|growing)\b/.test(input);

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
 ,life:['daily_shit','work','school','money','gig','career','movement','hobbies','growth']
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

function taskAnswer(input,state,date){
 const options={date},low=isLowEnergy(input),pool=low?getLowEnergyActions(state,options):getAvailableActions(state,options);
 const recommendation=getRecommendedActions({actions:pool,currentDate:date,energyPreference:low?'Low':null})[0];
 if(!recommendation)return response('cap_life_tasks',low?'Nothing low-energy is waiting right now. A water refill or a deliberate rest counts. 🌷':'Your Daily Shit list does not have an available action right now. 🌷');
 const backup=pool.find(item=>item.id!==recommendation.id&&Number(item.estimatedMinutes||999)<=15);
 return response('cap_life_tasks',`${low?'For low energy':'Your best next move'}: ${recommendation.title||recommendation.text}${recommendation.estimatedMinutes?` (${recommendation.estimatedMinutes} min)`:''}. ${backup?`Tiny backup: ${backup.title||backup.text}.`:''}`,[recommendation,...(backup?[backup]:[])]);
}

function workAnswer(input,state,date){
 const sessions=getUpcomingSessions(state,{from:date,limit:3}),today=sessions.filter(item=>item.date===date),career=getCareerProgress(state,'rbt');
 if(/\b(rbt|career|bcba|certification|exam)\b/.test(input))return response('cap_life_career',`Career Climb shows RBT as the active certification goal: ${career.completed}/${career.total} RBT milestones complete (${career.percent}%).`,[career]);
 if(today.length){const first=today[0];return response('cap_life_work',`Today at Work: ${first.client?.alias||first.clientAlias||'Client'}${first.startTime?` at ${first.startTime}`:''}${first.prep?.label?` • prep ${first.prep.label}`:''}.`,today);}
 if(sessions.length){const first=sessions[0];return response('cap_life_work',`Your next work session is ${first.client?.alias||first.clientAlias||'a client session'} on ${first.date}${first.startTime?` at ${first.startTime}`:''}.`,sessions);}
 return response('cap_life_work','Work HQ has no upcoming client sessions in its current schedule.');
}

function studyAnswer(input,state,date){
 const programs=getAcademicPrograms(state),program=programs.find(item=>item.status==='active')||programs.find(item=>!['archived','withdrawn','completed'].includes(item.status));
 if(!program)return response('cap_life_study','Study Nook does not have an active academic program selected yet. 📚');
 const focus=getCurrentFocusCourse(state,program.id),next=getRecommendedAcademicNextStep(state,program.id),progress=getDegreeProgressByLevel(state,program.level),deadline=getUpcomingAcademicDeadlines(state,{from:date}).at(0);
 const detail=next?`${next.title} is next (${next.reason.toLowerCase()}).`:focus?`${focus.title} is your current focus.`:'No active course is selected.';
 return response('cap_life_study',`Study Nook: ${detail}${deadline?` Nearest academic deadline: ${deadline.title} on ${deadline.dueDate}.`:''}${progress?` Degree progress: ${progress.percent}% complete.`:''}`,[program,focus,next,deadline,progress].filter(Boolean));
}

function moneyAnswer(input,state,date){
 const summary=getMoneySummary(state),bills=getUpcomingBills(state,{from:date}).filter(item=>item.status!=='paid').slice(0,2);
 const flow=summary.cashFlow||{};
 return response('cap_life_money',`Money Café shows ${summary.liquidCash.toLocaleString(undefined,{style:'currency',currency:'USD'})} in liquid cash. This period: ${flow.income?.toLocaleString(undefined,{style:'currency',currency:'USD'})||'$0.00'} received and ${flow.spending?.toLocaleString(undefined,{style:'currency',currency:'USD'})||'$0.00'} spent.${bills.length?` Next bill: ${bills[0].name} on ${bills[0].dueDate}.`:''}`,[summary,...bills]);
}

function gigAnswer(input,state,date){
 const summary=getGigEarningsSummary(state,{from:date,to:date}),comparison=getGigPlatformComparison(state,{from:date,to:date}).filter(item=>item.orders);
 const leader=comparison.sort((a,b)=>b.gross-a.gross)[0];
 return response('cap_life_gig',`Gig Work today: ${summary.gross.toLocaleString(undefined,{style:'currency',currency:'USD'})} earned across ${summary.ordersCount} order${summary.ordersCount===1?'':'s'}${summary.tips?`, including ${summary.tips.toLocaleString(undefined,{style:'currency',currency:'USD'})} in tips`:''}.${leader?` ${leader.platform.name} has the most recorded earnings today.`:''} Earned money stays separate from account balances until a payout is deposited.`,[summary,...comparison]);
}

function movementAnswer(input,state,date){const low=/\b(gentle|easy|tired|low energy)\b/.test(input),suggestion=getRecommendedMovement(state,{energy:low?'low':'medium',availableMinutes:low?15:30,date}),start=new Date(`${date}T12:00:00`);start.setDate(start.getDate()-6);const from=`${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`,week=getMovementSummary(state,{from,to:date});if(/\b(week|lately|done)\b/.test(input))return response('cap_life_movement',`Get Movin has ${week.sessions} completed session${week.sessions===1?'':'s'} and ${week.totalMinutes} minutes in this range.`,[week]);return response('cap_life_movement',suggestion.primary?`${low?'Gentle movement idea':'Movement idea'}: ${suggestion.primary.title}${suggestion.primary.plannedMinutes?` for ${suggestion.primary.plannedMinutes} minutes`:''}.`:'Nothing is planned. A five-minute stretch or a short walk is plenty. 🌷',[suggestion]);}
function hobbyAnswer(input,state){const low=/\b(chill|easy|tired|low energy)\b/.test(input),pick=getHobbyRecommendation(state,{energy:low?'low':'medium',availableMinutes:low?15:30,mode:low?'tiny':'normal'}),current=getCurrentHobbies(state);if(/\b(what.*into|hobbies)\b/.test(input))return response('cap_life_hobbies',current.length?`Your current hobby rotation: ${current.slice(0,4).map(item=>item.title).join(', ')}.`:'Hobby Shelf is waiting for the next thing you’re into. 🎨',current);return response('cap_life_hobbies',pick.primary?`Fun pick: ${pick.primary.title}${pick.primary.typicalMinutesOptional?` for about ${pick.primary.typicalMinutesOptional} minutes`:''}. ${pick.backup?`Backup: ${pick.backup.title}.`:''}`:'Hobby Shelf has no current hobbies to pick from yet. Add something you enjoy whenever it appears. 🎨',[pick]);}
function growthAnswer(input,state){const next=getRecommendedGrowthStep(state),wins=getGrowthWins(state).slice(0,3);if(/\b(accomplish|accomplished|how far|win)\b/.test(input))return response('cap_life_growth',wins.length?`Recent meaningful wins: ${wins.map(item=>item.title).join(' • ')}.`:'Growth does not have a saved win yet—but that does not mean you have not been growing. 🌱',wins);return response('cap_life_growth',next?`Your next growth milestone is ${next.title} for “${next.goal.title}”.`:'There is no active Growth milestone right now. That’s allowed. 🌱',[next].filter(Boolean));}

/** Read-only capability router. Returns null when legacy Mochini intents should handle the request. */
export function routeMochiniCapability(question,{state={},evaluation={},session={}}={}){
 const input=clean(question);if(!input)return null;const date=dateKey(evaluation?.date);
 const followupNoms=String(session?.lastIntent||'').startsWith('cap_noms_')&&/\b(anything|something|one|option|quicker|quick|else|another)\b/.test(input);
 const followupSips=String(session?.lastIntent||'').startsWith('cap_sips_')&&/\b(how much|enough|today|goal|what about now)\b/.test(input);
 if(isSips(input)||followupSips)return sipsAnswer(input,state,date);
 if(isFood(input)||followupNoms){const result=nomsAnswer(input,state,date);return /\b(work|shift|before work|before my shift)\b/.test(input)?appendWorkContext(result,state,date):result;}
 if(isMovement(input))return movementAnswer(input,state,date);
 if(isHobby(input))return hobbyAnswer(input,state,date);
 if(isGrowth(input))return growthAnswer(input,state);
 if(isGig(input))return gigAnswer(input,state,date);
 if(isMoney(input))return moneyAnswer(input,state,date);
 if(isStudy(input))return studyAnswer(input,state,date);
 if(isWork(input))return workAnswer(input,state,date);
 if(isLowEnergy(input)||/\b(what should i do|whats next|what do i need to do)\b/.test(input))return taskAnswer(input,state,date);
 if(isProjects(input)&&/\b(what|which|working|parked|project)\b/.test(input))return projectsAnswer(input,state);
 if(isLabs(input)&&/\b(what|show|finding|observation|noticed|pattern|labs)\b/.test(input))return labsAnswer(input,state);
 if(isCatchAll(input)&&/\b(what|show|anything|how many|captured|capture|inbox|unsorted)\b/.test(input))return catchAllAnswer(state);
 return null;
}
