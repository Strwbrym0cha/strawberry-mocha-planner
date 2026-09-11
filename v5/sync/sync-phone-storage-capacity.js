import{byteSize,defaultIndexedDbBackupStore}from'./sync-phone-backup-store.js';
import{katosStorageCapacityReport}from'./sync-storage.js';

export const PHONE_STORAGE_MIGRATION_PREFIX='sm_v5_indexeddb_migrated_backup_';
export const PHONE_STORAGE_PREPARATION_KEY='sm_v5_phone_storage_preparation';
const fail=(code,message)=>{const error=new Error(message);error.code=code;throw error};
const nowValue=now=>typeof now==='function'?now():now;

function migrationRecord({row,raw,deviceId,stamp,index}){
  return{backupId:`${PHONE_STORAGE_MIGRATION_PREFIX}${stamp}_${index}`,format:'katos-localstorage-backup-migration',version:1,createdAt:new Date(stamp).toISOString(),deviceId,sourceKey:row.key,purpose:row.backupPurpose,sourceUtf8Bytes:row.utf8Bytes,rawPayload:raw,rawPayloadBytes:byteSize(raw),sourcePlannerOrRecoveryHash:row.plannerOrRecoveryHash||null};
}

export async function migrateEligibleKatOSBackups({storage=localStorage,deviceId='unknown-device',indexedDbStore=null,now=Date.now,incomingCanonicalBytes=0}={}){
  const before=katosStorageCapacityReport(storage,{incomingCanonicalBytes}),store=indexedDbStore||defaultIndexedDbBackupStore(),stamp=nowValue(now),migrated=[];
  for(let index=0;index<before.inventory.length;index++){
    const row=before.inventory[index];if(!row.safeToMigrate)continue;
    const raw=storage.getItem(row.key);
    if(raw===null)continue;
    const record=migrationRecord({row,raw,deviceId,stamp,index});
    try{await store.put(record);}catch(error){fail(error?.code||'PHONE_STORAGE_MIGRATION_WRITE_FAILED',`Could not migrate ${row.key} to IndexedDB: ${error?.message||'write failed.'}`);}
    let readBack;try{readBack=await store.get(record.backupId);}catch(error){fail(error?.code||'PHONE_STORAGE_MIGRATION_READ_FAILED',`Could not verify migrated ${row.key}: ${error?.message||'read failed.'}`);}
    if(!readBack||readBack.format!==record.format||readBack.sourceKey!==row.key||readBack.rawPayload!==raw||readBack.rawPayloadBytes!==record.rawPayloadBytes)fail('PHONE_STORAGE_MIGRATION_VERIFY_FAILED',`Migrated ${row.key} did not verify byte-for-byte. Its localStorage source was kept.`);
    // Detect a concurrent/local mutation before deleting precisely this verified source.
    if(storage.getItem(row.key)!==raw)fail('PHONE_STORAGE_MIGRATION_SOURCE_CHANGED',`${row.key} changed during migration. Its localStorage source was kept.`);
    try{storage.removeItem(row.key);}catch(error){fail('PHONE_STORAGE_MIGRATION_SOURCE_REMOVE_FAILED',`Verified IndexedDB copy exists, but ${row.key} could not be removed: ${error?.message||'remove failed.'}`);}
    migrated.push({key:row.key,sizeBytes:row.utf8Bytes,backupId:record.backupId,verified:true,purpose:row.backupPurpose,hash:row.plannerOrRecoveryHash||null});
  }
  const after=katosStorageCapacityReport(storage,{incomingCanonicalBytes});
  const result={ok:true,status:'Phone storage prepared',before,after,migrated,freedBytes:Math.max(0,before.katosLocalStorageBytes-after.katosLocalStorageBytes),cloudMutated:false,normalSync:'NOT_ENABLED'};
  // This receipt holds only key names, sizes, IDs, and verification outcomes—not planner data.
  const receipt={preparedAt:new Date(stamp).toISOString(),before:{katosLocalStorageBytes:before.katosLocalStorageBytes,inventory:before.inventory.slice(0,5)},after:{katosLocalStorageBytes:after.katosLocalStorageBytes,requiredHeadroomBytes:after.requiredHeadroomBytes},migrated,freedBytes:result.freedBytes};
  try{storage.setItem(PHONE_STORAGE_PREPARATION_KEY,JSON.stringify(receipt));result.receiptStored=true;}catch{result.receiptStored=false;}
  return result;
}

export function phoneStoragePreparationRequired(storage=localStorage,{incomingCanonicalBytes=0}={}){
  const report=katosStorageCapacityReport(storage,{incomingCanonicalBytes});
  return{required:report.requiresPreparation,report};
}

export function readPhoneStoragePreparationReceipt(storage=localStorage){
  try{const receipt=JSON.parse(storage.getItem(PHONE_STORAGE_PREPARATION_KEY)||'null');return receipt&&typeof receipt==='object'?receipt:null;}catch{return null}
}
