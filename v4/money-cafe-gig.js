const list=v=>Array.isArray(v)?v:[];
const GIG=new Set(['doordash','shipt','other-gig']);

export const normalizeGigSource=v=>{
  const s=String(v||'').toLowerCase().replace(/\s+/g,'-');
  return s==='other'||s==='othergig'?'other-gig':GIG.has(s)?s:'';
};

export const isGigIncome=e=>GIG.has(normalizeGigSource(e?.incomeSource||e?.gigSource||e?.source));
export const gigAmount=e=>Number(e?.receivedAmount??e?.amount??e?.actualGross??e?.estimatedGross??e?.grossEarned??0)||0;
export const incomeDateKey=e=>String(e?.receivedDate||e?.date||e?.expectedDate||'').slice(0,10);

export function createGigEarning({source,amount,date,note=''}){
  const n=Number(amount);
  if(!GIG.has(normalizeGigSource(source))||!Number.isFinite(n)||n<=0||!date)return null;
  return{
    id:`gig-${Date.now()}`,
    kind:'gig',
    label:normalizeGigSource(source),
    incomeSource:normalizeGigSource(source),
    amount:n,
    receivedAmount:n,
    estimatedGross:n,
    status:'received',
    expectedDate:date,
    receivedDate:date,
    date,
    note:String(note||'').trim(),
    createdAt:new Date().toISOString()
  };
}

export function gigSummary(earnings,from,to){
  const rows=list(earnings)
    .filter(isGigIncome)
    .filter(e=>!from||incomeDateKey(e)>=from)
    .filter(e=>!to||incomeDateKey(e)<=to);
  return{
    total:rows.reduce((n,e)=>n+gigAmount(e),0),
    bySource:Object.fromEntries([...GIG].map(s=>[
      s,
      rows.filter(e=>normalizeGigSource(e.incomeSource||e.gigSource||e.source)===s).reduce((n,e)=>n+gigAmount(e),0)
    ]))
  };
}

export function paycheckReceivedAmount(e={}){
  return Number(e?.receivedAmount??e?.actualNet??e?.amount??e?.actualGross??e?.estimatedGross??0)||0;
}

export function isReceivedPaycheck(e={}){
  if(isGigIncome(e))return false;
  if((e?.kind||'paycheck')!=='paycheck')return false;
  return e?.status==='received'||paycheckReceivedAmount(e)>0&&Boolean(e?.receivedDate);
}

export function receivedIncomeSummary(earnings,from,to){
  const rows=list(earnings).filter(e=>{
    const d=incomeDateKey(e);
    return d&&(!from||d>=from)&&(!to||d<=to);
  });
  const gig=rows.filter(isGigIncome).reduce((n,e)=>n+gigAmount(e),0);
  const paycheck=rows.filter(isReceivedPaycheck).reduce((n,e)=>n+paycheckReceivedAmount(e),0);
  return{paycheck,gig,total:paycheck+gig};
}
