import{createKatOSDataService}from'./katos-data-service.js?v=22.1.27-20260818';
import{hydrateFromCloudIfSafer}from'./cloud-hydration.js?v=28.0.0-20260903';

const CLOUD_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
const CLOUD_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';
const SESSION_KEY='sm_v16_session';
let syncTimer=null,lastPayload='';

export function readSession(){try{const host=window.parent&&window.parent!==window?window.parent:window;return JSON.parse(host.localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
function queueCloudSave(data){
 const payload=JSON.stringify({data});if(payload===lastPayload)return;
 lastPayload=payload;clearTimeout(syncTimer);
 syncTimer=setTimeout(async()=>{
  const session=readSession();if(!session?.access_token||!session?.user?.id)return;
  try{
   const response=await fetch(`${CLOUD_URL}/rest/v1/planner_data?on_conflict=user_id`,{method:'POST',headers:{'Content-Type':'application/json','apikey':CLOUD_KEY,'Authorization':`Bearer ${session.access_token}`,'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:session.user.id,data})});
   if(!response.ok)throw new Error('Cloud save failed.');
   window.dispatchEvent(new CustomEvent('sm:cloud-sync',{detail:{ok:true}}));
  }catch{
   lastPayload='';
   window.dispatchEvent(new CustomEvent('sm:cloud-sync',{detail:{ok:false}}));
  }
 },600);
}

export function createStore(){
 const service=createKatOSDataService({onPersist:queueCloudSave});
 hydrateFromCloudIfSafer().then(result=>{
  if(!result?.hydrated)return;
  service.reload();
  try{sessionStorage.setItem('sm_cloud_hydrated_once','1')}catch{}
  window.dispatchEvent(new CustomEvent('sm:cloud-sync',{detail:{ok:true,hydrated:true}}));
  location.reload();
 }).catch(()=>{});
 return{
  get(){return service.getState()},
  set(next){service.setState(next)},
  update(fn){service.updateState(fn)},
  subscribe(listener){return service.subscribe(listener)},
  reload(){service.reload()},
  // Read APIs establish the selector pattern without requiring tab rewrites.
  getTasksForDate:service.getTasksForDate,
  getEventsForDate:service.getEventsForDate,
  getCurrentTaskbotState:service.getCurrentTaskbotState,
  getRoutines:service.getRoutines,
  getNoms:service.getNoms,
  getMochini:service.getMochini,
  getHyperfixation:service.getHyperfixation,
  getFinanceSummary:service.getFinanceSummary,
  getFinance:service.getFinance,
  getAccounts:service.getAccounts,getAccount:service.getAccount,getAccountBalance:service.getAccountBalance,getLiquidCashTotal:service.getLiquidCashTotal,
  getLedgerTransactions:service.getLedgerTransactions,getCashFlowSummary:service.getCashFlowSummary,getIncomeSummary:service.getIncomeSummary,getSpendingSummary:service.getSpendingSummary,getUpcomingBills:service.getUpcomingBills,getSubscriptions:service.getSubscriptions,getFinancialGoals:service.getFinancialGoals,getGoalProgress:service.getGoalProgress,getLiabilities:service.getLiabilities,
  getGigPlatforms:service.getGigPlatforms,getGigOrders:service.getGigOrders,getGigEarningsSummary:service.getGigEarningsSummary,getGigEarningsForRange:service.getGigEarningsForRange,getGigPlatformComparison:service.getGigPlatformComparison,getGigGoalProgress:service.getGigGoalProgress,getPendingGigPayouts:service.getPendingGigPayouts,getGigPayouts:service.getGigPayouts,
  getEstimatedWorkEarnings:service.getEstimatedWorkEarnings,getMoneySummary:service.getMoneySummary,getUpcomingFinancialActions:service.getUpcomingFinancialActions,
  getLifestyle:service.getLifestyle,
  getMovementActivities:service.getMovementActivities,getMovementForDate:service.getMovementForDate,getMovementSummary:service.getMovementSummary,getMovementTypes:service.getMovementTypes,getMovementPlans:service.getMovementPlans,getRecommendedMovement:service.getRecommendedMovement,getMovementGoals:service.getMovementGoals,getMovementGoalProgress:service.getMovementGoalProgress,
  getHobbies:service.getHobbies,getCurrentHobbies:service.getCurrentHobbies,getHobby:service.getHobby,getHobbyProjects:service.getHobbyProjects,getActiveHobbyProjects:service.getActiveHobbyProjects,getHobbyRecommendation:service.getHobbyRecommendation,getHobbyResources:service.getHobbyResources,
  getGrowthAreas:service.getGrowthAreas,getGrowthGoals:service.getGrowthGoals,getActiveGrowthGoals:service.getActiveGrowthGoals,getGrowthGoal:service.getGrowthGoal,getGrowthMilestones:service.getGrowthMilestones,getRecommendedGrowthStep:service.getRecommendedGrowthStep,getGrowthWins:service.getGrowthWins,getRecentGrowthWins:service.getRecentGrowthWins,
  getWorkHQ:service.getWorkHQ,
  getWorkSessionsForDate:service.getWorkSessionsForDate,
  getWorkSessionsForRange:service.getWorkSessionsForRange,
  getUpcomingWorkSessions:service.getUpcomingWorkSessions,
  getWorkHoursForRange:service.getWorkHoursForRange,
  getDegreeProgress:service.getDegreeProgress,
  getLegacyWorkDegreeProgress:service.getLegacyWorkDegreeProgress,
  getAcademicPrograms:service.getAcademicPrograms,
  getActiveAcademicPrograms:service.getActiveAcademicPrograms,
  getAcademicProgram:service.getAcademicProgram,
  getAcademicProgramSummary:service.getAcademicProgramSummary,
  getDegreeProgressByLevel:service.getDegreeProgressByLevel,
  getActiveCourses:service.getActiveCourses,
  getCurrentFocusCourse:service.getCurrentFocusCourse,
  getCourseAssignments:service.getCourseAssignments,
  getTransferSummary:service.getTransferSummary,
  getLatestTransferEvaluation:service.getLatestTransferEvaluation,
  getUpcomingAcademicDeadlines:service.getUpcomingAcademicDeadlines,
  getRecommendedAcademicNextStep:service.getRecommendedAcademicNextStep,
  getStudySessions:service.getStudySessions,
  getCompletedPrograms:service.getCompletedPrograms,
  getTodayActions:service.getTodayActions,
  getAvailableActions:service.getAvailableActions,
  getLowEnergyActions:service.getLowEnergyActions,
  getOverdueHardDeadlines:service.getOverdueHardDeadlines,
  getActiveRoutines:service.getActiveRoutines,
  getRoutineProgress:service.getRoutineProgress,
  getDailyShitSections:service.getDailyShitSections,
  getRecommendedActions:service.getRecommendedActions,
  createAction:service.createAction,
  evaluateToday:service.evaluateToday,
  listBackups:service.listBackups,
  getBackup:service.getBackup,
  schemaVersion:service.schemaVersion
 };
}
export async function cloudSync(){const result=await hydrateFromCloudIfSafer();return{ok:!!readSession(),migrated:!!result?.hydrated}}
