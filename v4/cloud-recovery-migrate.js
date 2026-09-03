const list=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const text=v=>String(v??'').trim();
const clone=v=>structuredClone(v);

const DAY_INDEX={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};

export function cloudItemCount(state){
  const s=obj(state),life=obj(s.life),money=obj(s.money),education=obj(s.education),work=obj(s.work),growth=obj(s.growth),nourish=obj(s.nourish),newNoms=obj(nourish.noms),oldNoms=obj(s.noms),oldSchedule=obj(obj(s.workSchedule).weekly);
  const arrayCount=[
    life.tasks,life.reminders,life.routines,life.events,life.threads,
    money.ledger,money.transactions,money.earnings,money.accounts,money.bills,money.spending,money.savingsGoals,money.debts,
    education.courses,education.items,education.programs,education.sessions,
    work.items,work.shifts,work.training,work.career,work.shiftSchedules,
    growth.goals,growth.wins,
    newNoms.foods,newNoms.recipes,newNoms.groceries,
    s.tasks,s.reminders,s.routines,s.habits,s.events,s.projects,s.goals,s.wins,s.courses,s.schoolTasks,s.workItems,s.brainNotes,s.priorities,
    oldNoms.foods,oldNoms.pantry,oldNoms.recipes,oldNoms.groceries,
    money.income,money.expenses
  ].reduce((n,rows)=>n+list(rows).length,0);
  const objectCount=Object.keys(obj(s.dayNotes)).length+Object.values(oldSchedule).reduce((n,rows)=>n+list(rows).length,0);
  return arrayCount+objectCount;
}

function mood(value){
  const v=text(value).toLowerCase();
  if(['loved','great','amazing','happy','excellent'].includes(v))return'great';
  if(v==='good')return'good';
  if(['okay','ok','medium','normal'].includes(v))return'okay';
  if(['meh','fine'].includes(v))return'meh';
  if(['rough','bad','awful','sad','terrible'].includes(v))return'rough';
  return'';
}
function energy(value){
  const v=text(value).toLowerCase();
  if(['high','energized','energetic'].includes(v))return'high';
  if(v==='good')return'good';
  if(['medium','okay','ok','normal'].includes(v))return'okay';
  if(v==='low')return'low';
  if(['drained','exhausted','dead'].includes(v))return'drained';
  return'';
}
function legacyDayReviews(source){
  return Object.entries(obj(source?.dayNotes)).map(([date,value])=>{
    const note=obj(value),stamp=text(note.savedAt||note.updatedAt||note.createdAt);
    return{
      id:text(note.id)||`cloud-day-${date}`,
      date,
      mood:mood(note.mood),
      energy:energy(note.energy),
      happened:text(note.happened||note.notes||note.note),
      proud:text(note.proud),
      tomorrow:text(note.tomorrow),
      helped:text(note.helped),
      hard:text(note.hard),
      movement:text(note.movement),
      legacyMood:text(note.mood),
      legacyEnergy:text(note.energy),
      createdAt:stamp||new Date().toISOString(),
      updatedAt:stamp||new Date().toISOString(),
      source:'supabase-legacy-day-note'
    };
  });
}
function legacyShiftSchedules(source){
  const weekly=obj(obj(source?.workSchedule).weekly),rules=[];
  for(const [dayName,blocks] of Object.entries(weekly)){
    const day=DAY_INDEX[String(dayName).toLowerCase()];if(day===undefined)continue;
    list(blocks).forEach((block,index)=>{
      block=obj(block);const start=text(block.start||block.startTime),end=text(block.end||block.endTime);if(!start&&!end)return;
      rules.push({
        id:`cloud-work-${day}-${index}-${start.replace(':','')}-${end.replace(':','')}`,
        label:text(block.label)||'Work shift',
        repeat:'weekly',days:[day],startDate:'',endDate:'',startTime:start,endTime:end,
        source:'supabase-legacy-work-schedule',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
      });
    });
  }
  return rules;
}
function mergeBy(rows,key){const seen=new Set();return rows.filter(row=>{const value=text(row?.[key]);if(!value||seen.has(value))return false;seen.add(value);return true})}

export function finishCloudRestore(restored,source){
  const next=clone(obj(restored)),insights=obj(next.insights),work=obj(next.work);
  const reviews=mergeBy([...list(insights.dayReviews),...legacyDayReviews(source)],'date');
  const shiftSchedules=mergeBy([...list(work.shiftSchedules),...legacyShiftSchedules(source)],'id');
  next.insights={...insights,dayReviews:reviews};
  next.work={...work,shiftSchedules};
  next.meta={...obj(next.meta),cloudLegacyMigrationAt:new Date().toISOString()};
  return next;
}
