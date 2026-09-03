export const REMINDERS_VERSION=1;

const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const makeId=()=>`ping-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

export function normalizeReminder(value={}){
  const item=value&&typeof value==='object'?value:{};
  return{
    ...item,
    id:text(item.id)||makeId(),
    title:text(item.title||item.name)||'Reminder',
    date:text(item.date),
    time:text(item.time),
    timing:item.timing==='before_bed'?'before_bed':'specific',
    completed:item.completed===true,
    repeat:text(item.repeat),
    createdAt:text(item.createdAt),
    completedAt:text(item.completedAt),
    source:text(item.source)||'manual',
    sourceProposalId:text(item.sourceProposalId)
  };
}

export const normalizeReminders=value=>list(value).map(normalizeReminder);

export function createReminder(input={}){
  const now=new Date().toISOString();
  return normalizeReminder({...input,id:input.id||makeId(),createdAt:input.createdAt||now,completed:false,completedAt:''});
}

export function addReminder(reminders,input={}){
  const reminder=createReminder(input);
  return{reminders:[...normalizeReminders(reminders),reminder],reminder};
}

export function toggleReminder(reminders,id){
  const now=new Date().toISOString();
  return normalizeReminders(reminders).map(item=>item.id===String(id)?{...item,completed:!item.completed,completedAt:item.completed?'':now}:item);
}

export function deleteReminder(reminders,id){
  return normalizeReminders(reminders).filter(item=>item.id!==String(id));
}
