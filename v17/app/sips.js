const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const localDateKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const clampNumber=(value,fallback,min=0,max=10000)=>{const number=Number(value);return Number.isFinite(number)?Math.min(max,Math.max(min,number)):fallback};
const isPositiveNumber=value=>Number.isFinite(Number(value))&&Number(value)>0;

export const DEFAULT_SIPS={drink:'Water',servingOz:32,goalOz:64,entries:[]};

export function normalizeSips(value){
 const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 return{
  ...DEFAULT_SIPS,
  ...source,
  drink:text(source.drink)||DEFAULT_SIPS.drink,
  servingOz:clampNumber(source.servingOz,DEFAULT_SIPS.servingOz,1,128),
  goalOz:clampNumber(source.goalOz,DEFAULT_SIPS.goalOz,1,512),
  entries:list(source.entries).filter(entry=>entry&&typeof entry==='object').map(entry=>({
   id:text(entry.id)||`sip-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
   date:text(entry.date)||localDateKey(),
   drink:text(entry.drink)||text(source.drink)||DEFAULT_SIPS.drink,
   amountOz:clampNumber(entry.amountOz,0,0,512),
   createdAt:text(entry.createdAt)||new Date().toISOString()
  }))
 };
}

export const sipsForDate=(state,date=localDateKey())=>normalizeSips(state?.sips).entries.filter(entry=>entry.date===date);
export function sipsSummary(state,date=localDateKey()){
 const sips=normalizeSips(state?.sips),entries=sipsForDate(state,date),totalOz=entries.reduce((sum,entry)=>sum+Number(entry.amountOz||0),0);
 return{...sips,date,entries,totalOz,remainingOz:Math.max(0,sips.goalOz-totalOz),goalMet:totalOz>=sips.goalOz,progress:sips.goalOz?Math.min(100,Math.round(totalOz/sips.goalOz*100)):0};
}

export function createSipsActions(store){
 const update=updater=>{let result={ok:false,error:'Sips could not update.'};store.update(state=>{const current=normalizeSips(state.sips),next=updater(current);result=next?.result||result;return next?.sips?{...state,sips:next.sips}:state});return result};
 return{
  log(amountOz){const amount=clampNumber(amountOz,0,0,512);if(!amount)return{ok:false,error:'Choose an amount greater than 0 oz.'};return update(sips=>{const entry={id:`sip-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date:localDateKey(),drink:sips.drink,amountOz:amount,createdAt:new Date().toISOString()};return{sips:{...sips,entries:[...sips.entries,entry]},result:{ok:true,entry}}})},
  logServing(){return this.log(normalizeSips(store.get()?.sips).servingOz)},
  setDrink(drink){drink=text(drink);if(!drink)return{ok:false,error:'Give the drink a name first.'};return update(sips=>({sips:{...sips,drink},result:{ok:true,drink}}))},
  setServingOz(value){if(!isPositiveNumber(value))return{ok:false,error:'Serving size must be at least 1 oz.'};const servingOz=clampNumber(value,1,1,128);return update(sips=>({sips:{...sips,servingOz},result:{ok:true,servingOz}}))},
  setGoalOz(value){if(!isPositiveNumber(value))return{ok:false,error:'Goal must be at least 1 oz.'};const goalOz=clampNumber(value,1,1,512);return update(sips=>({sips:{...sips,goalOz},result:{ok:true,goalOz}}))}
 };
}
