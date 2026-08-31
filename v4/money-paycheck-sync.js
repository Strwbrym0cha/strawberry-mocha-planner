const text=v=>String(v??'').trim();
const num=v=>Math.max(0,Number(v)||0);
const list=v=>Array.isArray(v)?v:[];

export function receivedAmount(paycheck){
 return num(paycheck?.receivedAmount??paycheck?.actualNet??paycheck?.actualAmount??paycheck?.amount);
}

export function normalizePaycheckCompatibility(paycheck){
 const p={...(paycheck||{})};
 const received=receivedAmount(p);
 if((p.status==='received'||received>0)&&received>0){
  p.status='received';
  p.received=true;
  p.receivedAmount=received;
  p.actualAmount=received;
  p.actualNet=received;
 }
 return p;
}

function samePaycheckLedgerRow(row,paycheck,prior){
 if(!row||!paycheck)return false;
 const pid=String(paycheck.id||'');
 if(row.sourceType==='paycheck'&&String(row.sourceId||'')===pid)return true;
 if(String(row.id||'')===`paycheck-${pid}`||String(row.id||'')===pid)return true;
 if(!prior)return false;
 const rowKind=String(row.kind||row.type||'').toLowerCase();
 if(rowKind&&rowKind!=='income')return false;
 const priorDate=text(prior.receivedDate||prior.date||prior.expectedDate);
 const rowDate=text(row.date||row.receivedDate||row.expectedDate);
 if(priorDate&&rowDate&&priorDate!==rowDate)return false;
 const rowLabel=text(row.label||row.name||row.description).toLowerCase();
 const priorLabel=text(prior.label||prior.employer||'Paycheck').toLowerCase();
 if(rowLabel&&priorLabel&&rowLabel!==priorLabel&&rowLabel!=='paycheck')return false;
 const oldAmounts=[prior.receivedAmount,prior.actualNet,prior.actualAmount,prior.amount,prior.netAmount].map(num).filter(Boolean);
 return oldAmounts.length?oldAmounts.includes(num(row.amount)):false;
}

export function syncPaycheckIntoExistingLedger(state,paycheck,prior=null){
 const next=structuredClone(state||{});
 next.money=next.money||{};
 const ledger=list(next.money.ledger);
 if(!ledger.length)return next;
 const normalized=normalizePaycheckCompatibility(paycheck);
 const received=receivedAmount(normalized);
 const receivedNow=(normalized.status==='received'||normalized.received===true)&&received>0;
 const matchIndex=ledger.findIndex(row=>samePaycheckLedgerRow(row,normalized,prior));
 if(!receivedNow){
  if(matchIndex>=0&&(ledger[matchIndex]?.sourceType==='paycheck'||String(ledger[matchIndex]?.id||'').startsWith('paycheck-'))){
   next.money.ledger=ledger.filter((_,i)=>i!==matchIndex);
  }
  return next;
 }
 const entry={
  ...(matchIndex>=0?ledger[matchIndex]:{}),
  id:matchIndex>=0?ledger[matchIndex].id:`paycheck-${normalized.id}`,
  kind:'income',
  label:text(normalized.label||normalized.employer)||'Paycheck',
  amount:received,
  date:text(normalized.receivedDate||normalized.expectedDate)||new Date().toISOString().slice(0,10),
  category:text(ledger[matchIndex]?.category)||'Paycheck',
  note:text(normalized.note),
  sourceType:'paycheck',
  sourceId:String(normalized.id||''),
  updatedAt:new Date().toISOString()
 };
 if(matchIndex>=0)next.money.ledger=ledger.map((row,i)=>i===matchIndex?entry:row);
 else next.money.ledger=[...ledger,entry];
 return next;
}

export function repairPaycheckCompatibility(state){
 const original=state||{};
 const earnings=list(original?.money?.earnings);
 let changed=false;
 const repaired=earnings.map(row=>{
  if((row?.kind||'paycheck')!=='paycheck')return row;
  const next=normalizePaycheckCompatibility(row);
  const keys=['status','received','receivedAmount','actualAmount','actualNet'];
  if(keys.some(k=>next[k]!==row?.[k]))changed=true;
  return next;
 });
 if(!changed)return{state:original,changed:false};
 const next=structuredClone(original);
 next.money={...(next.money||{}),earnings:repaired};
 return{state:next,changed:true};
}
