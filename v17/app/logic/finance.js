import{moneyTotals}from'../data.js?v=22.1.16-20260817';
const list=value=>Array.isArray(value)?value:[];
export const financeSummary=state=>{const totals=moneyTotals(state?.money);return{available:totals.available,cash:totals.cash,unpaidBills:totals.bills,unpaidBillCount:list(state?.money?.bills).filter(bill=>!bill?.paid).length}};
/** Explicit metadata only; this does not guess spending from task text. */
export function financeSafetyForTask(state,task){const requiresMoney=task?.requiresMoney===true||Number.isFinite(Number(task?.estimatedCost));if(!requiresMoney)return{applicable:false};const summary=financeSummary(state),estimatedCost=Number(task?.estimatedCost)||0;return{applicable:true,estimatedCost,summary,withinAvailable:estimatedCost<=summary.available,reason:estimatedCost>summary.available?'estimated_cost_exceeds_available':'estimated_cost_within_available'};}
