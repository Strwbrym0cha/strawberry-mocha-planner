export const MONEY_VERSION=1;

const list=value=>Array.isArray(value)?value:[];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const text=value=>String(value??'').trim();
const number=value=>Math.max(0,Number(value)||0);
const makeId=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
const pad=value=>String(value).padStart(2,'0');
export const localDateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};

export const DEFAULT_MONEY={earnings:[],accounts:[],bills:[],spending:[],savingsGoals:[],debts:[]};

export function normalizeEarning(value,index=0){
  const saved=object(value),kind=['paycheck','gig'].includes(saved.kind)?saved.kind:'paycheck';
  const allowedStatus=kind==='gig'?['earned','received']:['expected','received'];
  const status=allowedStatus.includes(saved.status)?saved.status:allowedStatus[0];
  const hours=number(saved.hours),hourlyRate=number(saved.hourlyRate);
  const estimatedGross=number(saved.estimatedGross)||(hours&&hourlyRate?Math.round(hours*hourlyRate*100)/100:0);
  return{
    id:text(saved.id)||`earning-${index}`,
    kind,
    label:text(saved.label)||(kind==='gig'?'Side Quest':'Paycheck'),
    employer:text(saved.employer),
    platform:text(saved.platform),
    date:text(saved.date),
    payPeriodStart:text(saved.payPeriodStart),
    payPeriodEnd:text(saved.payPeriodEnd),
    hours,
    hourlyRate,
    estimatedGross,
    actualGross:number(saved.actualGross),
    receivedAmount:number(saved.receivedAmount||saved.actualNet),
    grossEarned:number(saved.grossEarned),
    tips:number(saved.tips),
    expenses:number(saved.expenses),
    miles:number(saved.miles),
    expectedDate:text(saved.expectedDate),
    receivedDate:text(saved.receivedDate),
    status,
    note:text(saved.note),
    sourceWorkId:text(saved.sourceWorkId),
    createdAt:text(saved.createdAt)||new Date().toISOString()
  };
}

export function normalizeAccount(value,index=0){const saved=object(value);return{id:text(saved.id)||`account-${index}`,name:text(saved.name)||'Account',type:['checking','savings','cash','other'].includes(saved.type)?saved.type:'checking',balance:number(saved.balance),createdAt:text(saved.createdAt)}}
export function normalizeBill(value,index=0){const saved=object(value);return{id:text(saved.id)||`bill-${index}`,name:text(saved.name)||'Bill',amount:number(saved.amount),dueDate:text(saved.dueDate),recurring:saved.recurring!==false,paid:saved.paid===true,createdAt:text(saved.createdAt)}}
export function normalizeSpending(value,index=0){const saved=object(value),loggedAt=text(saved.loggedAt)||new Date().toISOString();return{id:text(saved.id)||`spend-${index}`,description:text(saved.description)||'Spending',amount:number(saved.amount),category:text(saved.category)||'Other',date:text(saved.date)||localDateKey(loggedAt),loggedAt,source:text(saved.source)||'manual'}}
export function normalizeSavingsGoal(value,index=0){const saved=object(value);return{id:text(saved.id)||`goal-${index}`,name:text(saved.name)||'Savings goal',current:number(saved.current),target:number(saved.target),createdAt:text(saved.createdAt)}}
export function normalizeDebt(value,index=0){const saved=object(value);return{id:text(saved.id)||`debt-${index}`,name:text(saved.name)||'Debt',balance:number(saved.balance),apr:number(saved.apr),minimum:number(saved.minimum),dueDate:text(saved.dueDate),createdAt:text(saved.createdAt)}}

export function normalizeMoney(value){
  const saved=object(value);
  return{
    earnings:list(saved.earnings).map(normalizeEarning),
    accounts:list(saved.accounts).map(normalizeAccount),
    bills:list(saved.bills).map(normalizeBill),
    spending:list(saved.spending).map(normalizeSpending),
    savingsGoals:list(saved.savingsGoals).map(normalizeSavingsGoal),
    debts:list(saved.debts).map(normalizeDebt)
  };
}

export function addPaycheck(money,input={}){
  const current=normalizeMoney(money),now=new Date().toISOString();
  const earning=normalizeEarning({...input,id:makeId('paycheck'),kind:'paycheck',status:input.status==='received'?'received':'expected',createdAt:now});
  return{...current,earnings:[...current.earnings,earning]};
}
export function addGigEarning(money,input={}){
  const current=normalizeMoney(money),now=new Date().toISOString();
  const earning=normalizeEarning({...input,id:makeId('gig'),kind:'gig',status:input.status==='received'?'received':'earned',date:text(input.date)||localDateKey(),createdAt:now});
  return{...current,earnings:[...current.earnings,earning]};
}
export function updateEarning(money,id,patch={}){const current=normalizeMoney(money);return{...current,earnings:current.earnings.map(item=>item.id===String(id)?normalizeEarning({...item,...patch,id:item.id,kind:item.kind,createdAt:item.createdAt}):item)}}
export function deleteEarning(money,id){const current=normalizeMoney(money);return{...current,earnings:current.earnings.filter(item=>item.id!==String(id))}}
export function markEarningReceived(money,id,receivedAmount,receivedDate=localDateKey()){return updateEarning(money,id,{status:'received',receivedAmount:number(receivedAmount),receivedDate:text(receivedDate)||localDateKey()})}

export function addAccount(money,input={}){const current=normalizeMoney(money),item=normalizeAccount({...input,id:makeId('account'),createdAt:new Date().toISOString()});return{...current,accounts:[...current.accounts,item]}}
export function deleteAccount(money,id){const current=normalizeMoney(money);return{...current,accounts:current.accounts.filter(item=>item.id!==String(id))}}
export function addBill(money,input={}){const current=normalizeMoney(money),item=normalizeBill({...input,id:makeId('bill'),createdAt:new Date().toISOString()});return{...current,bills:[...current.bills,item]}}
export function toggleBillPaid(money,id){const current=normalizeMoney(money);return{...current,bills:current.bills.map(item=>item.id===String(id)?{...item,paid:!item.paid}:item)}}
export function deleteBill(money,id){const current=normalizeMoney(money);return{...current,bills:current.bills.filter(item=>item.id!==String(id))}}
export function addSpending(money,input={}){const current=normalizeMoney(money),item=normalizeSpending({...input,id:makeId('spend'),loggedAt:new Date().toISOString()});return{...current,spending:[...current.spending,item]}}
export function deleteSpending(money,id){const current=normalizeMoney(money);return{...current,spending:current.spending.filter(item=>item.id!==String(id))}}
export function addSavingsGoal(money,input={}){const current=normalizeMoney(money),item=normalizeSavingsGoal({...input,id:makeId('goal'),createdAt:new Date().toISOString()});return{...current,savingsGoals:[...current.savingsGoals,item]}}
export function deleteSavingsGoal(money,id){const current=normalizeMoney(money);return{...current,savingsGoals:current.savingsGoals.filter(item=>item.id!==String(id))}}
export function addDebt(money,input={}){const current=normalizeMoney(money),item=normalizeDebt({...input,id:makeId('debt'),createdAt:new Date().toISOString()});return{...current,debts:[...current.debts,item]}}
export function deleteDebt(money,id){const current=normalizeMoney(money);return{...current,debts:current.debts.filter(item=>item.id!==String(id))}}

export function earningAmount(item){
  const earning=normalizeEarning(item);
  if(earning.status==='received')return earning.receivedAmount||earning.actualGross||earning.grossEarned||earning.estimatedGross;
  if(earning.kind==='gig')return earning.grossEarned;
  return earning.estimatedGross;
}
export function gigNetBeforeTax(item){const earning=normalizeEarning(item);return Math.max(0,Math.round((earning.grossEarned-earning.expenses)*100)/100)}

export function moneyCafeSnapshot(money,nowValue=new Date()){
  const current=normalizeMoney(money),today=localDateKey(nowValue);
  const totalCash=Math.round(current.accounts.reduce((sum,item)=>sum+item.balance,0)*100)/100;
  const expected=current.earnings.filter(item=>item.status!=='received'&&item.expectedDate&&item.expectedDate>=today).sort((a,b)=>a.expectedDate.localeCompare(b.expectedDate));
  const nextPayday=expected[0]||null;
  const horizon=nextPayday?.expectedDate||(()=>{const d=new Date(`${today}T12:00:00`);d.setDate(d.getDate()+14);return localDateKey(d)})();
  const billsBefore=current.bills.filter(item=>!item.paid&&item.dueDate&&item.dueDate>=today&&item.dueDate<=horizon);
  const dueBeforePayday=Math.round(billsBefore.reduce((sum,item)=>sum+item.amount,0)*100)/100;
  const safeToUse=Math.round((totalCash-dueBeforePayday)*100)/100;
  const receivedIncome=Math.round(current.earnings.filter(item=>item.status==='received').reduce((sum,item)=>sum+earningAmount(item),0)*100)/100;
  const pendingEarned=Math.round(current.earnings.filter(item=>item.kind==='gig'&&item.status==='earned').reduce((sum,item)=>sum+item.grossEarned,0)*100)/100;
  const expectedPay=Math.round(current.earnings.filter(item=>item.kind==='paycheck'&&item.status==='expected').reduce((sum,item)=>sum+item.estimatedGross,0)*100)/100;
  const todaySpending=Math.round(current.spending.filter(item=>item.date===today).reduce((sum,item)=>sum+item.amount,0)*100)/100;
  return{today,totalCash,nextPayday,billsBefore,dueBeforePayday,safeToUse,receivedIncome,pendingEarned,expectedPay,todaySpending};
}
