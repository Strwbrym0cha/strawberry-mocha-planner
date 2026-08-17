export const WORK_DAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
export const emptyWorkWeek=()=>Object.fromEntries(WORK_DAYS.map(day=>[day,[]]));
const text=value=>typeof value==='string'?value:'';
const validTime=value=>/^\d{2}:\d{2}$/.test(text(value));
export function normalizeWorkSchedule(value){const weekly=emptyWorkWeek(),source=value&&typeof value==='object'?value:{};for(const day of WORK_DAYS){const shifts=Array.isArray(source.weekly?.[day])?source.weekly[day]:[];weekly[day]=shifts.filter(shift=>shift&&typeof shift==='object').map(shift=>({id:text(shift.id)||`${day}-${text(shift.start)}-${text(shift.end)}`,start:validTime(shift.start)?shift.start:'',end:validTime(shift.end)?shift.end:''}))}return{mode:text(source.mode)||'flexible',weekly}}
export const workDayForDate=date=>WORK_DAYS[new Date(`${date}T12:00:00`).getDay()]||'sunday';
export const shiftsForDate=(schedule,date)=>normalizeWorkSchedule(schedule).weekly[workDayForDate(date)]||[];
export const shiftMinutes=shift=>{if(!shift?.start||!shift?.end)return 0;const[sh,sm]=shift.start.split(':').map(Number),[eh,em]=shift.end.split(':').map(Number);return Math.max(0,(eh*60+em)-(sh*60+sm))};
export const shiftLabel=shift=>shift?.start&&shift?.end?`${shift.start} – ${shift.end}`:shift?.start||'Time to choose';
