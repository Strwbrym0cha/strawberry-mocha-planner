const list=v=>Array.isArray(v)?v:[];
const money=v=>Math.round((Number(v)||0)*100)/100;
const text=v=>String(v??'').trim();

export function adjustAccountBalance(state,accountId,delta){
 const id=text(accountId);if(!id||!delta)return state;
 const next=structuredClone(state||{});next.money=next.money||{};
 const accounts=list(next.money.accounts);const index=accounts.findIndex(a=>String(a?.id)===id);if(index<0)return next;
 accounts[index]={...accounts[index],balance:money(money(accounts[index].balance)+money(delta)),updatedAt:new Date().toISOString()};
 next.money.accounts=accounts;return next;
}

export function applyLedgerEntryToAccounts(state,entry,direction=1){
 const row=entry||{},amount=money(row.amount)*direction;let next=state;
 if(row.kind==='income'&&row.accountId)next=adjustAccountBalance(next,row.accountId,amount);
 if(row.kind==='expense'&&row.accountId)next=adjustAccountBalance(next,row.accountId,-amount);
 if(row.kind==='transfer'){
  if(row.accountId)next=adjustAccountBalance(next,row.accountId,-amount);
  if(row.toAccountId)next=adjustAccountBalance(next,row.toAccountId,amount);
 }
 return next;
}

export function syncPaycheckAccountBalance(state,nextPaycheck,priorPaycheck=null){
 let next=state;
 const prior=priorPaycheck||{};
 const oldReceived=(prior.status==='received'||prior.received===true)?money(prior.receivedAmount??prior.actualNet??prior.actualAmount??prior.amount):0;
 const newReceived=(nextPaycheck?.status==='received'||nextPaycheck?.received===true)?money(nextPaycheck.receivedAmount??nextPaycheck.actualNet??nextPaycheck.actualAmount??nextPaycheck.amount):0;
 const oldAccount=text(prior.accountId),newAccount=text(nextPaycheck?.accountId);
 if(oldAccount&&oldReceived)next=adjustAccountBalance(next,oldAccount,-oldReceived);
 if(newAccount&&newReceived)next=adjustAccountBalance(next,newAccount,newReceived);
 return next;
}
