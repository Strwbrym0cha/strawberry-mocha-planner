export const TASKS_VERSION=1;

const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const pad=n=>String(n).padStart(2,'0');
export const localDateKey=(value=new Date())=>{const d=value instanceof Date?value:new Date(value);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const makeId=()=>`task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const allowed=(value,values,fallback)=>values.includes(value)?value:fallback;

export const TASK_OPTIONS={
  energy:['low','medium','high'],
  initiation:['easy','sticky'],
  mode:['any','home','study','boss','errand','bedtime'],
  minutes:[5,15,30,60]
};

export function normalizeTask(value={}){
  const item=value&&typeof value==='object'?value:{};
  const minutes=Number(item.minutes||item.estimateMinutes||15);
  return{
    ...item,
    id:text(item.id)||makeId(),
    text:text(item.text||item.title)||'Untitled task',
    done:item.done===true||item.completed===true,
    date:text(item.date),
    protected:item.protected===true||item.isProtected===true||item.hardBoundary===true,
    energy:allowed(item.energy,TASK_OPTIONS.energy,'medium'),
    initiation:allowed(item.initiation,TASK_OPTIONS.initiation,'easy'),
    mode:allowed(item.mode,TASK_OPTIONS.mode,'any'),
    minutes:TASK_OPTIONS.minutes.includes(minutes)?minutes:15,
    createdAt:text(item.createdAt),
    completedAt:text(item.completedAt),
    source:text(item.source)||'manual',
    sourceProposalId:text(item.sourceProposalId)
  };
}

export const normalizeTasks=value=>list(value).map(normalizeTask);

export function createTask(input={}){
  const now=new Date().toISOString();
  return normalizeTask({...input,id:input.id||makeId(),createdAt:input.createdAt||now,done:false,completedAt:''});
}

export function addTask(tasks,input={}){
  const task=createTask(input);
  return{tasks:[...normalizeTasks(tasks),task],task};
}

export function toggleTask(tasks,id){
  const now=new Date().toISOString();
  return normalizeTasks(tasks).map(task=>task.id===String(id)?{...task,done:!task.done,completedAt:task.done?'':now}:task);
}

export function deleteTask(tasks,id){
  return normalizeTasks(tasks).filter(task=>task.id!==String(id));
}

const energyRank={low:0,medium:1,high:2};
const modeMatches=(taskMode,activeMode)=>taskMode==='any'||taskMode===activeMode||(taskMode==='home'&&['normal','home-reset','soft-reset'].includes(activeMode));

export function rankTasks(tasks,policy={},today=localDateKey()){
  const ceiling=energyRank[policy.taskEnergyCeiling]??1;
  const activeMode=policy.context?.mode||'normal';
  return normalizeTasks(tasks)
    .filter(task=>!task.done)
    .filter(task=>!task.date||task.date<=today)
    .map(task=>{
      let score=0;
      const reasons=[];
      if(task.protected){score+=70;reasons.push('protected')}
      if(task.date&&task.date<today){score+=45;reasons.push('overdue')}
      else if(task.date===today){score+=30;reasons.push('due today')}
      if(modeMatches(task.mode,activeMode)){score+=18;reasons.push('fits current mode')}
      if(energyRank[task.energy]<=ceiling){score+=22;reasons.push('fits energy')}
      else score-=45;
      if(policy.initiationStyle==='tiny-start'&&task.minutes<=15){score+=20;reasons.push('small start')}
      if(policy.initiationStyle==='tiny-start'&&task.initiation==='sticky')score-=10;
      if(policy.focusScope==='single-next-step'&&task.minutes<=15)score+=8;
      return{task,score,reasons};
    })
    .sort((a,b)=>b.score-a.score||Number(a.task.minutes)-Number(b.task.minutes)||a.task.text.localeCompare(b.task.text));
}

export function recommendTasks(tasks,policy={},today=localDateKey()){
  const count=Math.max(1,Number(policy.choiceCount)||1);
  return rankTasks(tasks,policy,today).slice(0,count);
}
