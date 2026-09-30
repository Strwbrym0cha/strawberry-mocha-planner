const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const number=value=>Number.isFinite(Number(value))?Number(value):0;

export function clockMinutes(value){
 const match=/^(\d{1,2}):(\d{2})$/.exec(text(value));
 if(!match)return null;
 const hours=Number(match[1]),minutes=Number(match[2]);
 return hours>=0&&hours<24&&minutes>=0&&minutes<60?hours*60+minutes:null;
}

export function formatMinutes(value){
 const total=Math.max(0,Math.round(number(value))),hours=Math.floor(total/60),minutes=total%60;
 return[hours?`${hours}h`:'',minutes?`${minutes}m`:''].filter(Boolean).join(' ')||'0m';
}

export function formatClock(value){
 const total=Math.max(0,Math.min(1439,Math.round(number(value)))),hours=Math.floor(total/60),minutes=total%60,suffix=hours>=12?'PM':'AM',display=hours%12||12;
 return`${display}:${String(minutes).padStart(2,'0')} ${suffix}`;
}

function normalizeFixed(row,index){
 const start=clockMinutes(row.startTime??row.time),explicitEnd=clockMinutes(row.endTime),duration=Math.max(1,number(row.duration??row.minutes)||60),end=explicitEnd!=null&&explicitEnd>start?explicitEnd:Math.min(1440,(start??0)+duration),prep=Math.max(0,number(row.prepMinutes));
 if(start==null)return null;
 return{...row,key:text(row.key)||`fixed-${index}`,title:text(row.title)||'Scheduled block',kind:text(row.kind)||'fixed',start,end,prep,readyAt:Math.max(0,start-prep),fixed:true};
}

function normalizeFlexible(row,index){
 return{...row,key:text(row.key)||`flex-${index}`,title:text(row.title)||'Flexible thing',kind:text(row.kind)||'task',duration:Math.max(5,number(row.duration??row.minutes)||15),priority:number(row.priority),firstMove:text(row.firstMove)||`Open what you need for ${text(row.title)||'this'}.`,fixed:false};
}

function flowRows(fixed,nowMinutes,dayEnd){
 const rows=[];let cursor=Math.max(0,nowMinutes);
 for(const block of fixed.filter(row=>row.end>nowMinutes)){
  const prepStart=Math.max(cursor,block.readyAt);
  if(prepStart>cursor)rows.push({kind:'pocket',start:cursor,end:prepStart,title:'Flexible pocket'});
  if(block.prep&&block.start>prepStart)rows.push({kind:'prep',start:prepStart,end:block.start,title:`Prep for ${block.title}`});
  rows.push({...block,kind:block.kind||'fixed'});
  cursor=Math.max(cursor,block.end);
 }
 if(cursor<dayEnd)rows.push({kind:'pocket',start:cursor,end:dayEnd,title:'Flexible time'});
 return rows.filter(row=>row.end>row.start);
}

export function buildAdaptiveDay({nowMinutes=0,fixed=[],flexible=[],dayEnd=22*60}={}){
 const now=Math.max(0,Math.min(1439,number(nowMinutes))),fixedRows=list(fixed).map(normalizeFixed).filter(Boolean).sort((a,b)=>a.start-b.start||a.end-b.end),flexRows=list(flexible).map(normalizeFlexible).sort((a,b)=>b.priority-a.priority||a.duration-b.duration||a.title.localeCompare(b.title));
 const active=fixedRows.find(row=>row.start<=now&&row.end>now)||null,next=fixedRows.find(row=>row.start>now)||null,pocketEnd=active?now:next?Math.max(now,next.readyAt):Math.max(now,dayEnd),pocketMinutes=Math.max(0,pocketEnd-now),fits=flexRows.filter(row=>row.duration<=pocketMinutes),recommendation=active?null:(fits[0]||(!next&&flexRows[0])||null),flow=flowRows(fixedRows,now,Math.max(now,dayEnd));
 const status=active?'active':next&&pocketMinutes===0?'prep':next?'pocket':'open';
 return{now,status,active,next,pocketMinutes,pocketEnd,recommendation,fixed:fixedRows,flexible:flexRows,flow};
}
