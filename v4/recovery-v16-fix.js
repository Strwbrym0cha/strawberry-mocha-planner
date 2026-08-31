const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const clone=v=>structuredClone(v);

export function legacyRows(value){
  if(Array.isArray(value))return value.filter(Boolean);
  if(value&&typeof value==='object')return Object.entries(value).map(([key,row])=>{
    if(row&&typeof row==='object'&&!Array.isArray(row))return{id:text(row.id)||key,name:text(row.name)||key,...row};
    return{id:key,name:key,amount:num(row)};
  }).filter(Boolean);
  return[];
}

function gigSource(value=''){
  const source=text(value).toLowerCase().replace(/\s+/g,'-');
  if(source.includes('door'))return'doordash';
  if(source.includes('shipt'))return'shipt';
  return'other-gig';
}
function legacyGig(row={},index=0){
  row=obj(row);const base=num(row.earnings??row.amount),tips=num(row.tips),amount=Math.round((base+tips)*100)/100,date=text(row.date||row.receivedDate||row.expectedDate);
  return{...row,id:text(row.id)||`gig-v17-${index}`,kind:'gig',label:gigSource(row.platform||row.source||row.label),incomeSource:gigSource(row.platform||row.source||row.label),platform:text(row.platform),amount,receivedAmount:amount,estimatedGross:amount,status:'received',expectedDate:date,receivedDate:date,date,baseEarnings:base,tips,hours:num(row.hours),miles:num(row.miles),note:text(row.note),createdAt:text(row.createdAt)||date};
}
function legacyIncome(row={},index=0){
  row=obj(row);const amount=Math.round(num(row.amount)*100)/100,date=text(row.date||row.receivedDate||row.expectedDate);
  return{...row,id:text(row.id)||`income-v17-${index}`,label:text(row.name)||`Income ${index+1}`,employer:text(row.name),kind:'paycheck',expectedAmount:amount,amount,receivedAmount:row.receivedAmount==null?undefined:num(row.receivedAmount),status:text(row.status)||'planned',frequency:text(row.frequency||row.repeat),expectedDate:date,receivedDate:text(row.receivedDate),createdAt:text(row.createdAt)||date};
}
function legacyBill(row={},index=0,{subscription=false}={}){
  row=obj(row);const amount=Math.round(num(row.amount??row.typicalAmount)*100)/100;
  return{...row,id:subscription?`subscription-${text(row.id)||index}`:text(row.id)||`bill-v17-${index}`,name:text(row.name)||(subscription?`Subscription ${index+1}`:`Bill ${index+1}`),amount,typicalAmount:num(row.typicalAmount)||amount,kind:subscription?'subscription':text(row.kind)||'bill',subscription,recurring:text(row.repeat).toLowerCase()!=='one-time',due:text(row.due||row.dueDate),paid:row.paid===true};
}
function savingsGoal(row={},index=0){row=obj(row);return{...row,id:text(row.id)||`savings-v17-${index}`,name:text(row.name)||`Savings ${index+1}`,current:num(row.current??row.amount),target:num(row.target)};}
function mergeById(rows=[]){const out=[],seen=new Set();for(const row of rows){const id=text(row?.id);const key=id||JSON.stringify(row);if(seen.has(key))continue;seen.add(key);out.push(row)}return out;}

export function prepareV16ForImport(input={}){
  const source=clone(obj(input)),money=obj(source.money);
  const existingEarnings=legacyRows(money.earnings);
  const income=legacyRows(money.income).map(legacyIncome);
  const gigs=legacyRows(source.gigWork).map(legacyGig);
  const bills=legacyRows(money.bills).map((row,index)=>legacyBill(row,index));
  const subscriptions=legacyRows(money.subscriptions).map((row,index)=>legacyBill(row,index,{subscription:true}));
  const savingsExisting=legacyRows(money.savingsGoals);
  const savings=savingsExisting.length?savingsExisting:legacyRows(money.savings).map(savingsGoal);
  const onHand=obj(money.onHand),cash=obj(money.cash);
  source.money={
    ...money,
    earnings:mergeById([...existingEarnings,...income,...gigs]),
    income:legacyRows(money.income),
    bills:mergeById([...bills,...subscriptions]),
    subscriptions:legacyRows(money.subscriptions),
    debts:legacyRows(money.debts),
    savingsGoals:savings,
    accounts:legacyRows(money.accounts),
    cash:Object.keys(cash).length?cash:(Object.keys(onHand).length?{amount:num(onHand.amount??onHand.balance),note:text(onHand.note),updatedAt:text(onHand.updatedAt)}:cash)
  };
  return source;
}

function installRestoreBridge(){
  if(typeof document==='undefined'||typeof window==='undefined')return;
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-katos-recovery-restore]');if(!button||button.disabled)return;
    const overlay=document.querySelector('.katos-recovery-overlay'),candidates=Array.isArray(overlay?.__katosRecoveryCandidates)?overlay.__katosRecoveryCandidates:[],candidate=candidates.find(c=>c.id===button.dataset.katosRecoveryRestore);
    if(!candidate||candidate.format!=='v16')return;
    event.preventDefault();event.stopImmediatePropagation();
    const store=window.__KATOS_V4_DEPS?.store;if(!store)return;
    const when=candidate.updatedAt?new Date(candidate.updatedAt).toLocaleString():'unknown date';
    if(!window.confirm(`Restore ${candidate.kind||'newer KatOS copy'} from ${when}?\n\nKatOS will back up the current V4 data first, including the copy you have right now.`))return;
    try{
      const key=store.V4_KEY||'sm_v4_beta',current=window.localStorage.getItem(key);if(current)window.localStorage.setItem(`sm_v4_beta_before_restore_${new Date().toISOString().replace(/[:.]/g,'-')}`,current);
      const prepared=prepareV16ForImport(candidate.state),restored=store.importV16(prepared);store.saveState(restored);window.location.reload();
    }catch(error){window.alert(`Restore failed: ${error?.message||error}`)}
  },true);
}
installRestoreBridge();
