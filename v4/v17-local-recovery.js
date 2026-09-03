const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const list=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const money=v=>Math.round(num(v)*100)/100;
const DAY_NUM={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};

export function collection(value){
  if(Array.isArray(value))return value.filter(Boolean);
  if(value&&typeof value==='object')return Object.entries(value).map(([key,row])=>{
    const base=row&&typeof row==='object'&&!Array.isArray(row)?row:{amount:num(row)};
    return {...base,id:text(base.id)||key,name:text(base.name)||key};
  }).filter(Boolean);
  return[];
}

function sourceName(value=''){
  const s=text(value).toLowerCase().replace(/\s+/g,'-');
  if(s.includes('door'))return'doordash';
  if(s.includes('shipt'))return'shipt';
  return'other-gig';
}
function gigEntry(row={},index=0){
  const source=sourceName(row.platform||row.source||row.label),date=text(row.date)||new Date().toISOString().slice(0,10),amount=money(num(row.earnings)+num(row.tips));
  return{...row,id:text(row.id)||`v17-gig-${index}`,kind:'gig',label:source,incomeSource:source,gigSource:source,amount,receivedAmount:amount,estimatedGross:amount,status:'received',expectedDate:date,receivedDate:date,date,hours:num(row.hours),miles:num(row.miles),note:text(row.note),createdAt:text(row.createdAt)||`${date}T12:00:00.000Z`};
}
function incomeEntry(row={},index=0){
  const amount=money(row.amount);
  return{...row,id:text(row.id)||`v17-income-${index}`,label:text(row.name)||`Income ${index+1}`,employer:text(row.name),kind:text(row.kind)||'paycheck',expectedAmount:amount,amount,status:text(row.status)||'planned',frequency:text(row.frequency||row.repeat),createdAt:text(row.createdAt)||new Date().toISOString()};
}
function dueParts(value){
  const raw=text(value);
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return{due:raw,dueDate:raw,dueDay:Number(raw.slice(-2))};
  const n=Number(raw.match(/\d+/)?.[0]);
  return n>0&&n<=31?{due:String(n),dueDay:n}:{};
}
function billEntry(row={},index=0){
  const due=text(row.due)||text(row.dueDate)||text(row.dueDay),amount=money(row.amount??row.typicalAmount);
  return{...row,id:text(row.id)||`v17-bill-${index}`,name:text(row.name)||`Bill ${index+1}`,amount,typicalAmount:money(row.typicalAmount??amount),repeat:text(row.repeat)||'Monthly',...dueParts(due)};
}
function subscriptionEntry(row={},index=0){
  const raw=text(row.cycle||row.frequency||row.repeat).toLowerCase(),cycle=raw==='weekly'?'weekly':raw==='quarterly'?'quarterly':raw==='yearly'?'yearly':'monthly';
  const due=text(row.due)||text(row.nextCharge)||text(row.nextDate)||text(row.dueDay),parts=dueParts(due);
  return{...row,id:text(row.id)||`v17-sub-${index}`,name:text(row.name||row.label)||`Subscription ${index+1}`,amount:money(row.amount),cycle,frequency:cycle,dueDay:num(row.dueDay)||num(parts.dueDay),nextCharge:text(row.nextCharge||row.nextDate)||(/^\d{4}-\d{2}-\d{2}$/.test(due)?due:''),notes:text(row.notes||row.note),active:row.active!==false};
}
function workRules(schedule={}){
  const groups=new Map();
  for(const [day,dayNum] of Object.entries(DAY_NUM))for(const shift of collection(obj(schedule).weekly?.[day])){
    const start=text(shift.start),end=text(shift.end);if(!start&&!end)continue;
    const key=`${start}|${end}`,group=groups.get(key)||{startTime:start,endTime:end,days:[]};group.days.push(dayNum);groups.set(key,group);
  }
  return [...groups.values()].map((group,index)=>({id:`v17-work-rule-${index}`,label:'Work shift',repeat:'weekly',days:[...new Set(group.days)].sort((a,b)=>a-b),startTime:group.startTime,endTime:group.endTime,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}));
}
function dayReviews(source={}){
  const notes={...obj(source.days),...obj(source.dayNotes)};
  return Object.entries(notes).map(([date,row])=>{const r=obj(row);return{id:`v17-day-review-${date}`,date,mood:text(r.mood),energy:text(r.energy),movement:text(r.movement),note:text(r.notes||r.note||r.text),savedAt:text(r.savedAt||r.updatedAt||r.createdAt)||`${date}T12:00:00.000Z`}});
}
function dedupe(rows=[]){const seen=new Set();return rows.filter((row,index)=>{const key=text(row?.id)||`${text(row?.kind)}|${text(row?.date)}|${text(row?.name||row?.label)}|${index}`;if(seen.has(key))return false;seen.add(key);return true})}

export function prepareV17Recovery(input={}){
  const source=structuredClone(obj(input)),m=obj(source.money),work=obj(source.work),insights=obj(source.insights);
  const existingEarnings=collection(m.earnings),income=collection(m.income).map(incomeEntry),gigs=collection(source.gigWork).map(gigEntry);
  const shiftSchedules=dedupe([...collection(work.shiftSchedules),...workRules(source.workSchedule)]);
  source.money={...m,
    bills:collection(m.bills).map(billEntry),
    subscriptions:collection(m.subscriptions).map(subscriptionEntry),
    income:collection(m.income),
    earnings:dedupe([...existingEarnings,...income,...gigs]),
    accounts:collection(m.accounts),ledger:collection(m.ledger),transactions:collection(m.transactions),debts:collection(m.debts),savings:collection(m.savings),savingsGoals:collection(m.savingsGoals),spending:collection(m.spending)
  };
  source.work={...work,shiftSchedules};
  const reviews=dayReviews(source);
  source.insights={...insights,dayReviews:dedupe([...collection(insights.dayReviews),...reviews])};
  return source;
}

if(typeof window!=='undefined'&&typeof document!=='undefined'){
  const store=window.__KATOS_V4_DEPS?.store,V4_KEY=store?.V4_KEY||'sm_v4_beta',BACKUP_PREFIX='sm_v4_beta_before_restore_';
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-katos-recovery-restore]');if(!button||button.disabled)return;
    const overlay=document.querySelector('.katos-recovery-overlay'),candidates=Array.isArray(overlay?.__katosRecoveryCandidates)?overlay.__katosRecoveryCandidates:[],candidate=candidates.find(c=>c.id===button.dataset.katosRecoveryRestore);
    if(!candidate||candidate.format!=='v16')return;
    event.preventDefault();event.stopImmediatePropagation();
    const label=`${candidate.kind||'Newer KatOS copy'}${candidate.updatedAt?` from ${new Date(candidate.updatedAt).toLocaleString()}`:''}`;
    if(!confirm(`Restore ${label}?\n\nKatOS will back up the current V4 data first, then translate the newer planner snapshot into V4.`))return;
    try{
      const current=localStorage.getItem(V4_KEY);if(current)localStorage.setItem(`${BACKUP_PREFIX}${new Date().toISOString().replace(/[:.]/g,'-')}`,current);
      const restored=store?.importV16?.(prepareV17Recovery(candidate.state));if(!restored)throw new Error('The newer planner snapshot could not be translated.');store.saveState(restored);location.reload();
    }catch(error){alert(`Restore failed: ${error?.message||error}`)}
  },true);
}
