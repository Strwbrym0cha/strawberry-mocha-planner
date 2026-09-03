import{CURRENT_SCHEMA_VERSION,getLocalBackup,listLocalBackups,loadLocalData,moneyTotals,normalizeHyperfixation,normalizeMochini,normalizeNoms,saveLocalData,validateState}from'./data.js?v=22.1.27-20260818';
import{evaluateToday}from'./logic/evaluate-today.js?v=22.1.28-20260818';
import{getActiveRoutines,getAvailableActions,getLowEnergyActions,getOverdueHardDeadlines,getRecommendedActions,getRoutineProgress,getTodayActions,getTodaySections,publishAction}from'./unified-actions.js?v=23.0.0-20260902';
import{getDegreeProgress,getUpcomingSessions,getWorkHoursForRange,getWorkSessionsForDate,getWorkSessionsForRange,normalizeWorkHQ}from'./work-hq.js?v=24.0.0-20260902';
import{getAcademicProgram,getAcademicProgramSummary,getAcademicPrograms,getActiveAcademicPrograms,getActiveCourses,getCompletedPrograms,getCourseAssignments,getCurrentFocusCourse,getDegreeProgress as getStudyDegreeProgress,getDegreeProgressByLevel,getLatestTransferEvaluation,getRecommendedAcademicNextStep,getStudySessions,getTransferSummary,getUpcomingAcademicDeadlines}from'./study-nook.js?v=25.0.0-20260902';
import{getAccount,getAccountBalance,getAccounts,getCashFlowSummary,getEstimatedWorkEarnings,getFinancialGoals,getGigEarningsForRange,getGigEarningsSummary,getGigGoalProgress,getGigOrders,getGigPayouts,getGigPlatformComparison,getGigPlatforms,getGoalProgress,getIncomeSummary,getLedgerTransactions,getLiabilities,getLiquidCashTotal,getMoneySummary,getPendingGigPayouts,getSpendingSummary,getSubscriptions,getUpcomingBills,getUpcomingFinancialActions,normalizeFinance}from'./finance-engine.js?v=26.0.0-20260902';
import{getActiveGrowthGoals,getActiveHobbyProjects,getCurrentHobbies,getGrowthAreas,getGrowthGoal,getGrowthGoals,getGrowthMilestones,getGrowthWins,getHobbies,getHobby,getHobbyProjects,getHobbyRecommendation,getHobbyResources,getMovementActivities,getMovementForDate,getMovementGoalProgress,getMovementGoals,getMovementPlans,getMovementSummary,getMovementTypes,getRecentGrowthWins,getRecommendedGrowthStep,getRecommendedMovement,normalizeLifestyle}from'./lifestyle-engine.js?v=27.0.0-20260902';

/**
 * Compatibility-first state gateway. It deliberately wraps the current snapshot
 * store instead of requiring each tab to change during Sprint 0.1.
 */
export function createKatOSDataService({storage=localStorage,onPersist=()=>{}}={}){
 let state=loadLocalData(storage);const listeners=new Set();
 const publish=()=>listeners.forEach(listener=>listener(state));
 const persist=next=>{
  const checked=validateState(next);
  if(!checked.ok)return{ok:false,error:'KatOS state must be an object.',issues:checked.issues};
  state={...checked.state,__smUpdatedAt:new Date().toISOString()};
  saveLocalData(state,storage);onPersist(state);publish();return{ok:true,state,issues:checked.issues};
 };
 const dateMatches=(value,date)=>String(value||'')===String(date||'');
 return{
  schemaVersion:CURRENT_SCHEMA_VERSION,
  getState:()=>state,
  validate:input=>validateState(input),
  setState:next=>persist(next),
  updateState:updater=>persist((typeof updater==='function'?updater(state):updater)||state),
  reload:()=>{state=loadLocalData(storage);publish();return state},
  subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener)},
  listBackups:()=>listLocalBackups(storage),
  getBackup:index=>getLocalBackup(storage,index),
  getTasksForDate:date=>(state.tasks||[]).filter(task=>dateMatches(task.date,date)),
  getEventsForDate:date=>(state.events||[]).filter(event=>dateMatches(event.date,date)),
  getCurrentTaskbotState:()=>state.taskbot||{},
  getRoutines:()=>state.routines||[],
  getNoms:()=>normalizeNoms(state.noms),
  getMochini:()=>normalizeMochini(state.mochini),
  getHyperfixation:()=>normalizeHyperfixation(state.hyperfixation),
  getFinanceSummary:()=>moneyTotals(state.money),
  getFinance:()=>normalizeFinance(state.finance),
  getAccounts:()=>getAccounts(state),getAccount:id=>getAccount(state,id),getAccountBalance:id=>getAccountBalance(state,id),getLiquidCashTotal:()=>getLiquidCashTotal(state),
  getLedgerTransactions:filters=>getLedgerTransactions(state,filters),getCashFlowSummary:range=>getCashFlowSummary(state,range),getIncomeSummary:range=>getIncomeSummary(state,range),getSpendingSummary:range=>getSpendingSummary(state,range),getUpcomingBills:range=>getUpcomingBills(state,range),getSubscriptions:()=>getSubscriptions(state),getFinancialGoals:()=>getFinancialGoals(state),getGoalProgress:id=>getGoalProgress(state,id),getLiabilities:()=>getLiabilities(state),
  getGigPlatforms:()=>getGigPlatforms(state),getGigOrders:filters=>getGigOrders(state,filters),getGigEarningsSummary:range=>getGigEarningsSummary(state,range),getGigEarningsForRange:range=>getGigEarningsForRange(state,range),getGigPlatformComparison:range=>getGigPlatformComparison(state,range),getGigGoalProgress:id=>getGigGoalProgress(state,id),getPendingGigPayouts:()=>getPendingGigPayouts(state),getGigPayouts:range=>getGigPayouts(state,range),
  getEstimatedWorkEarnings:(start,end)=>getEstimatedWorkEarnings(getWorkHoursForRange(state,start,end),state),getMoneySummary:()=>getMoneySummary(state),getUpcomingFinancialActions:()=>getUpcomingFinancialActions(state),
  getLifestyle:()=>normalizeLifestyle(state.lifestyle),
  getMovementActivities:filters=>getMovementActivities(state,filters),getMovementForDate:date=>getMovementForDate(state,date),getMovementSummary:range=>getMovementSummary(state,range),getMovementTypes:()=>getMovementTypes(state),getMovementPlans:()=>getMovementPlans(state),getRecommendedMovement:options=>getRecommendedMovement(state,options),getMovementGoals:()=>getMovementGoals(state),getMovementGoalProgress:(id,range)=>getMovementGoalProgress(state,id,range),
  getHobbies:filters=>getHobbies(state,filters),getCurrentHobbies:()=>getCurrentHobbies(state),getHobby:id=>getHobby(state,id),getHobbyProjects:id=>getHobbyProjects(state,id),getActiveHobbyProjects:()=>getActiveHobbyProjects(state),getHobbyRecommendation:options=>getHobbyRecommendation(state,options),getHobbyResources:id=>getHobbyResources(state,id),
  getGrowthAreas:()=>getGrowthAreas(state),getGrowthGoals:filters=>getGrowthGoals(state,filters),getActiveGrowthGoals:()=>getActiveGrowthGoals(state),getGrowthGoal:id=>getGrowthGoal(state,id),getGrowthMilestones:id=>getGrowthMilestones(state,id),getRecommendedGrowthStep:()=>getRecommendedGrowthStep(state),getGrowthWins:filters=>getGrowthWins(state,filters),getRecentGrowthWins:limit=>getRecentGrowthWins(state,limit),
  getWorkHQ:()=>normalizeWorkHQ(state.workHQ),
  getWorkSessionsForDate:date=>getWorkSessionsForDate(state,date),
  getWorkSessionsForRange:(start,end)=>getWorkSessionsForRange(state,start,end),
  getUpcomingWorkSessions:options=>getUpcomingSessions(state,options),
  getWorkHoursForRange:(start,end)=>getWorkHoursForRange(state,start,end),
  getLegacyWorkDegreeProgress:degree=>getDegreeProgress(state,degree),
  getAcademicPrograms:()=>getAcademicPrograms(state),
  getActiveAcademicPrograms:()=>getActiveAcademicPrograms(state),
  getAcademicProgram:id=>getAcademicProgram(state,id),
  getAcademicProgramSummary:id=>getAcademicProgramSummary(state,id),
  getDegreeProgress:id=>getStudyDegreeProgress(state,id),
  getDegreeProgressByLevel:level=>getDegreeProgressByLevel(state,level),
  getActiveCourses:programId=>getActiveCourses(state,programId),
  getCurrentFocusCourse:programId=>getCurrentFocusCourse(state,programId),
  getCourseAssignments:courseId=>getCourseAssignments(state,courseId),
  getTransferSummary:programId=>getTransferSummary(state,programId),
  getLatestTransferEvaluation:programId=>getLatestTransferEvaluation(state,programId),
  getUpcomingAcademicDeadlines:options=>getUpcomingAcademicDeadlines(state,options),
  getRecommendedAcademicNextStep:programId=>getRecommendedAcademicNextStep(state,programId),
  getStudySessions:options=>getStudySessions(state,options),
  getCompletedPrograms:()=>getCompletedPrograms(state),
  // Daily Shit integration surface for Mochini and future KatOS areas.
  getTodayActions:options=>getTodayActions(state,options),
  getAvailableActions:options=>getAvailableActions(state,options),
  getLowEnergyActions:options=>getLowEnergyActions(state,options),
  getOverdueHardDeadlines:options=>getOverdueHardDeadlines(state,options),
  getActiveRoutines:options=>getActiveRoutines(state,options),
  getRoutineProgress:options=>getRoutineProgress(state,options),
  getDailyShitSections:options=>getTodaySections(state,options),
  getRecommendedActions:options=>getRecommendedActions({actions:getAvailableActions(state,options),...(options||{})}),
  createAction:draft=>publishAction({get:()=>state,update:updater=>persist(updater(state))},draft),
  evaluateToday:context=>evaluateToday(state,context)
 };
}
