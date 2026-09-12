const list=value=>Array.isArray(value)?value:[];
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const cents=value=>Math.round(number(value)*100)/100;
const day=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value):'';
const dayNumber=value=>{const [year,month,date]=String(value).split('-').map(Number);return Date.UTC(year,month-1,date)/86400000};
const sourceOf=row=>String(row?.source||row?.platform||row?.label||row?.shiftLabel||'').trim().toLowerCase();

export function chooseTrackedGigGoal(goals=[],today=''){
 const rows=list(goals).filter(row=>!row?.archivedAt&&row?.active!==false&&number(row?.targetAmount)>0);
 if(!rows.length)return null;
 const current=rows.filter(row=>(!day(row.startDate)||row.startDate<=today)&&(!day(row.endDate)||row.endDate>=today));
 const pool=current.length?current:rows.filter(row=>day(row.startDate)&&row.startDate>today);
 return(pool.length?pool:rows).slice().sort((a,b)=>{
  const custom=Number(b.period==='custom')-Number(a.period==='custom');
  if(custom)return custom;
  const end=String(a.endDate||'9999-12-31').localeCompare(String(b.endDate||'9999-12-31'));
  return end||String(b.createdAt||'').localeCompare(String(a.createdAt||''));
 })[0]||null;
}

export function buildGigGoalRunway({goal,progress={},shifts=[],platforms=[],today}={}){
 if(!goal)return null;
 const from=day(progress?.range?.from)||day(goal.startDate)||today;
 const to=day(progress?.range?.to)||day(goal.endDate)||from;
 const target=Math.max(0,cents(goal.targetAmount));
 const earned=Math.max(0,cents(progress.earned));
 const platform=goal.platformId?list(platforms).find(row=>String(row?.id)===String(goal.platformId)):null;
 const platformName=String(platform?.name||'').trim().toLowerCase();
 const planned=cents(list(shifts).filter(row=>{
  const status=String(row?.status||'planned').toLowerCase();
  if(row?.archivedAt||row?.summaryOrderId||['completed','canceled','cancelled','archived'].includes(status))return false;
  if(!day(row?.date)||row.date<from||row.date>to)return false;
  if(platformName&&!sourceOf(row).includes(platformName)&&!platformName.includes(sourceOf(row)))return false;
  return number(row?.targetAmount)>0;
 }).reduce((sum,row)=>sum+number(row.targetAmount),0));
 const covered=cents(Math.min(target,earned+planned));
 const remaining=cents(Math.max(0,target-earned));
 const unplanned=cents(Math.max(0,target-earned-planned));
 const totalDays=Math.max(1,dayNumber(to)-dayNumber(from)+1);
 const elapsedDays=Math.min(totalDays,Math.max(0,dayNumber(today)-dayNumber(from)+1));
 const daysLeft=Math.max(0,dayNumber(to)-dayNumber(today)+1);
 const paceTarget=target*(elapsedDays/totalDays);
 const expired=today>to&&remaining>0;
 let status='needs-plan',statusLabel=`${unplanned.toFixed(2)} still needs a shift`;
 if(remaining<=0){status='complete';statusLabel='Goal complete';}
 else if(planned>=remaining){status='covered';statusLabel='On track · planned shifts cover it';}
 else if(!expired&&earned>=paceTarget){status='on-pace';statusLabel='On pace · finish planning the rest';}
 else if(expired){status='expired';statusLabel='Deadline passed · update or extend it';}
 const dailyNeeded=daysLeft?cents(unplanned/daysLeft):unplanned;
 return{goal,from,to,target,earned,planned,covered,remaining,unplanned,totalDays,elapsedDays,daysLeft,dailyNeeded,status,statusLabel,earnedPercent:target?Math.min(100,earned/target*100):0,plannedPercent:target?Math.min(100-earned/target*100,planned/target*100):0,coveredPercent:target?Math.min(100,covered/target*100):0};
}
