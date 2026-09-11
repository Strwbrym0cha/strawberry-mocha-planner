import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{commitNormalSyncCAS,observeNormalSyncCloud}from'./sync-normal-cas.js';
import{ensureDeviceBootstrapState,normalSyncEnabled}from'./sync-device-bootstrap.js';
import{createSafeSyncEngine,SYNC_STATES}from'./sync-engine.js';
import{ensureSingleDeviceIpadMode,isSingleDeviceIpadMode,SINGLE_DEVICE_IPAD_MODE,singleDeviceStatus}from'./single-device-mode.js';

class Storage{constructor(values={}){this.values=new Map(Object.entries(values))}get length(){return this.values.size}key(index){return[...this.values.keys()][index]??null}getItem(key){return this.values.has(key)?this.values.get(key):null}setItem(key,value){this.values.set(String(key),String(value))}removeItem(key){this.values.delete(key)}}
const storage=new Storage({'sm_recovery_lock':'1','sm_v5_device_sync_status':JSON.stringify({state:'DEVICE_BOOTSTRAP_REQUIRED'})});
assert.equal(isSingleDeviceIpadMode(storage),true,'single-device iPad mode is the default');assert.equal(ensureSingleDeviceIpadMode(storage).mode,SINGLE_DEVICE_IPAD_MODE);assert.equal(ensureDeviceBootstrapState(storage).state,'IPAD_ONLY_LOCAL');assert.equal(normalSyncEnabled(storage),false);assert.deepEqual(singleDeviceStatus(storage).cloudSync,'OFF');
let cloudCalls=0;const engine={fetchCloudDiagnostics:async()=>{cloudCalls++;return{ok:true}},authentication:async()=>{cloudCalls++;return null},requestEndpoint:async()=>{cloudCalls++;return null}};
assert.equal((await observeNormalSyncCloud({storage,engine})).state,'SINGLE_DEVICE_IPAD');assert.equal((await commitNormalSyncCAS({storage,engine})).code,'SINGLE_DEVICE_IPAD');assert.equal(cloudCalls,0,'iPad-only mode blocks CAS and cloud observation before any network request');
const safeEngine=createSafeSyncEngine({storage,fetchFunction:async()=>{cloudCalls++;throw new Error('must not fetch on startup')}});assert.equal(safeEngine.state,SYNC_STATES.IPAD_ONLY_LOCAL);assert.equal(cloudCalls,0,'constructing normal V5 sync support has no planner network side effect');assert.equal((await safeEngine.push()).ok,false);assert.equal((await safeEngine.pull()).ok,false);assert.equal((await safeEngine.seed()).ok,false);
const bootstrap=await readFile(new URL('../bootstrap.js',import.meta.url),'utf8'),lab=await readFile(new URL('./sync-lab.js',import.meta.url),'utf8');
assert.match(bootstrap,/ensureSingleDeviceIpadMode/);assert.doesNotMatch(bootstrap,/recovery-storage-guard/,'the recovery lock no longer installs a normal-use local write blocker');assert.match(lab,/renderIpadOnlyStorage/);assert.match(lab,/Advanced Recovery Tools/);assert.doesNotMatch(lab,/\$\{oneTimeRecoverySection\(report\)\}/);assert.doesNotMatch(lab,/\$\{phoneBootstrapSection\(report\)\}/);
console.log('iPad-only mode defaults local, blocks sync before network activity, preserves dormant recovery code, and keeps advanced diagnostics opt-in.');
