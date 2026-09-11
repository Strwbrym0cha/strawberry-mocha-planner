import{stableSerialize}from'./sync-envelope.js';

export const PHONE_BACKUP_DB_NAME='katos-recovery';
export const PHONE_BACKUP_STORE='device-bootstrap-backups';

export const isQuotaExceededError=error=>!!error&&(error.name==='QuotaExceededError'||error.name==='NS_ERROR_DOM_QUOTA_REACHED'||error.code===22||error.code===1014||/quota(?: has)? exceeded|storage.*full/i.test(String(error.message||'')));
export const byteSize=value=>new TextEncoder().encode(typeof value==='string'?value:stableSerialize(value)).byteLength;

const idbError=(code,message,cause)=>{const error=new Error(message);error.code=code;error.cause=cause;return error};
const requestValue=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('IndexedDB request failed.'));});
const transactionDone=transaction=>new Promise((resolve,reject)=>{transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error||new Error('IndexedDB transaction failed.'));transaction.onabort=()=>reject(transaction.error||new Error('IndexedDB transaction aborted.'));});

export async function openPhoneBackupStore(indexedDbFactory=globalThis.indexedDB){
  if(!indexedDbFactory?.open)throw idbError('PHONE_BACKUP_INDEXEDDB_UNAVAILABLE','IndexedDB is unavailable for the required phone backup.');
  let request;
  try{request=indexedDbFactory.open(PHONE_BACKUP_DB_NAME,1)}catch(error){throw idbError('PHONE_BACKUP_INDEXEDDB_OPEN_FAILED','IndexedDB could not open the phone backup store.',error)}
  request.onupgradeneeded=()=>{const database=request.result;if(!database.objectStoreNames.contains(PHONE_BACKUP_STORE))database.createObjectStore(PHONE_BACKUP_STORE,{keyPath:'backupId'});};
  try{return await requestValue(request)}catch(error){throw idbError('PHONE_BACKUP_INDEXEDDB_OPEN_FAILED','IndexedDB could not open the phone backup store.',error)}
}

export async function createIndexedDbPhoneBackup(record,{indexedDbFactory=globalThis.indexedDB}={}){
  const database=await openPhoneBackupStore(indexedDbFactory);
  try{
    const transaction=database.transaction(PHONE_BACKUP_STORE,'readwrite'),store=transaction.objectStore(PHONE_BACKUP_STORE);
    store.put(record);await transactionDone(transaction);
  }catch(error){throw idbError(isQuotaExceededError(error)?'PHONE_BACKUP_INDEXEDDB_QUOTA_EXCEEDED':'PHONE_BACKUP_INDEXEDDB_WRITE_FAILED','IndexedDB could not write the required phone backup.',error)}
  finally{try{database.close?.()}catch{}}
}

export async function readIndexedDbPhoneBackup(backupId,{indexedDbFactory=globalThis.indexedDB}={}){
  const database=await openPhoneBackupStore(indexedDbFactory);
  try{
    const transaction=database.transaction(PHONE_BACKUP_STORE,'readonly'),record=await requestValue(transaction.objectStore(PHONE_BACKUP_STORE).get(backupId));
    await transactionDone(transaction);return record||null;
  }catch(error){throw idbError('PHONE_BACKUP_INDEXEDDB_READ_FAILED','IndexedDB could not read back the phone backup.',error)}
  finally{try{database.close?.()}catch{}}
}

export function defaultIndexedDbBackupStore(indexedDbFactory=globalThis.indexedDB){
  return Object.freeze({put:record=>createIndexedDbPhoneBackup(record,{indexedDbFactory}),get:backupId=>readIndexedDbPhoneBackup(backupId,{indexedDbFactory})});
}
