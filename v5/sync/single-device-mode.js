export const SINGLE_DEVICE_IPAD_MODE='single-device-ipad';
export const OPERATING_MODE_KEY='sm_v5_operating_mode';

// New and legacy installs default to the user-selected local iPad experience.
// A future cross-device project must explicitly opt in; deployments never do so.
export function operatingMode(storage=localStorage){
  try{return storage.getItem(OPERATING_MODE_KEY)||SINGLE_DEVICE_IPAD_MODE;}catch{return SINGLE_DEVICE_IPAD_MODE}
}

export const isSingleDeviceIpadMode=(storage=localStorage)=>operatingMode(storage)===SINGLE_DEVICE_IPAD_MODE;

export function ensureSingleDeviceIpadMode(storage=localStorage){
  if(!isSingleDeviceIpadMode(storage))storage.setItem(OPERATING_MODE_KEY,SINGLE_DEVICE_IPAD_MODE);
  return{mode:SINGLE_DEVICE_IPAD_MODE,plannerStorage:'LOCAL',cloudSync:'OFF',recoveryArchive:'PRESERVED'};
}

export function singleDeviceStatus(storage=localStorage){
  return{mode:operatingMode(storage),ipadOnly:isSingleDeviceIpadMode(storage),plannerStorage:'LOCAL',cloudSync:'OFF',recoveryArchive:'PRESERVED',lastVerifiedRecoveryRevision:6};
}
