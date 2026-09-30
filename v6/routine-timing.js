const text=value=>String(value??'').trim();
const clockValue=value=>{const match=text(value).match(/^(\d{1,2}):(\d{2})$/);return match?Number(match[1])*60+Number(match[2]):null};

export function routineFitsNow(routine,minutes){
 const now=Number.isFinite(Number(minutes))?Number(minutes):new Date().getHours()*60+new Date().getMinutes();
 const preferred=clockValue(routine?.preferredTime);if(preferred!==null)return Math.abs(preferred-now)<=150;
 const part=text(routine?.daypart||routine?.preferredDaypart).toLowerCase();if(!part||['anytime','any time','flexible'].includes(part))return true;
 if(/morning|am/.test(part))return now>=240&&now<720;
 if(/afternoon|midday/.test(part))return now>=720&&now<1020;
 if(/evening/.test(part))return now>=1020&&now<1260;
 if(/night|bed/.test(part))return now>=1200||now<240;
 return true;
}
