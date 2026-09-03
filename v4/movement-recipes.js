const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const number=value=>Number.isFinite(Number(value))?Number(value):0;

export const MOVEMENT_TYPES=['Strength','Pilates','Walking','Cardio','Recovery','Fun Movement','Other'];
export const EFFORTS=['easy','medium','hard'];

export function normalizeMovementRecipe(value,{id,now=new Date().toISOString()}={}){
  const source=value&&typeof value==='object'?value:{};
  return {...source,id:text(source.id)||text(id),name:text(source.name)||'Movement recipe',type:MOVEMENT_TYPES.includes(source.type)?source.type:'Other',minutes:Math.max(1,number(source.minutes)||10),effort:EFFORTS.includes(text(source.effort).toLowerCase())?text(source.effort).toLowerCase():'medium',instructions:text(source.instructions),notes:text(source.notes),lowEnergyVersion:text(source.lowEnergyVersion),createdAt:text(source.createdAt)||now,updatedAt:now};
}

export function upsertMovementRecipe(rows,input,{id,now}={}){
  const prior=list(rows).find(row=>String(row.id)===String(input.id||id));
  const recipe=normalizeMovementRecipe({...prior,...input,id:input.id||id||prior?.id},{id:input.id||id,now});
  return prior?list(rows).map(row=>String(row.id)===String(recipe.id)?recipe:row):[...list(rows),recipe];
}

export function removeMovementRecipe(rows,id){return list(rows).filter(row=>String(row.id)!==String(id));}

export function movementLoggerPrefill(recipe){const type={Strength:'strength',Pilates:'pilates',Walking:'walk',Cardio:'treadmill',Recovery:'stretch','Fun Movement':'other',Other:'other'}[text(recipe?.type)]||'other';return{type,minutes:Math.max(1,number(recipe?.minutes)||10),effort:EFFORTS.includes(text(recipe?.effort).toLowerCase())?text(recipe.effort).toLowerCase():'medium'};}
