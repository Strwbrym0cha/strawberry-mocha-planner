import{STORAGE_KEYS}from'./sync-storage.js';

export const DEVICE_ID_KEY='sm_v5_device_id';

function randomId(cryptoObject=globalThis.crypto){
  const value=cryptoObject?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;
  return`katos-device-${value}`;
}

export function getOrCreateDeviceId(storage=localStorage,cryptoObject=globalThis.crypto){
  const existing=String(storage.getItem(DEVICE_ID_KEY)||'').trim();
  if(existing)return existing;
  const id=randomId(cryptoObject);storage.setItem(DEVICE_ID_KEY,id);return id;
}

export function friendlyDeviceLabel(navigatorObject=globalThis.navigator,matchMediaFunction=globalThis.matchMedia){
  const agent=String(navigatorObject?.userAgent||'');
  const platform=String(navigatorObject?.platform||'');
  const touch=Number(navigatorObject?.maxTouchPoints||0);
  const ipad=/iPad/i.test(agent)||(platform==='MacIntel'&&touch>1);
  const iphone=/iPhone/i.test(agent);
  const standalone=!!navigatorObject?.standalone||!!matchMediaFunction?.('(display-mode: standalone)')?.matches;
  if(ipad)return standalone?'iPad Home Screen':'Safari on iPad';
  if(iphone)return standalone?'iPhone Home Screen':'Safari on iPhone';
  return'Unknown browser container';
}

export function localDeviceDiagnostics(storage=localStorage,navigatorObject=globalThis.navigator,matchMediaFunction=globalThis.matchMedia){
  return{deviceId:getOrCreateDeviceId(storage),label:friendlyDeviceLabel(navigatorObject,matchMediaFunction),recoveryMode:storage.getItem(STORAGE_KEYS.recoveryLock)==='1'};
}
