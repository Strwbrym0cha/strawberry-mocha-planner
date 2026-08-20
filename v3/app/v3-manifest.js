export const V3_MANIFEST_VERSION=3;

export const V3_REPLACEMENT_POLICY={
  generation:'v3',
  currentAlpha:'alpha.12',
  rule:'replace-absorb-retire',
  allowLegacyDataReadForMigration:true,
  allowLegacyRuntimeImports:false,
  allowLegacyUiEmbedding:false,
  allowLegacyFeatureFallback:false,
  rootCutoverReady:false
};

export const V3_FEATURES=[
  {id:'adaptive-home',label:'Adaptive Home',status:'complete',strategy:'replace',critical:true},
  {id:'current-context',label:'Current Context',status:'complete',strategy:'replace',critical:true},
  {id:'kat-model',label:'Kat Model',status:'complete',strategy:'replace',critical:true},
  {id:'constitution',label:'Kat Constitution',status:'complete',strategy:'replace',critical:true},
  {id:'brain',label:'KatOS Brain',status:'complete',strategy:'replace',critical:true},
  {id:'behavior-support',label:'Behavior Support',status:'complete',strategy:'replace',critical:false},
  {id:'tasks',label:'Sweet To-Dos',status:'complete',strategy:'replace',critical:true},
  {id:'little-pings',label:'Little Pings',status:'complete',strategy:'replace',critical:true},
  {id:'mochini-core',label:'Mochini Core',status:'partial',strategy:'replace',critical:true},
  {id:'sips',label:'Sip Station',status:'complete',strategy:'replace',critical:false},
  {id:'motion',label:'Motion Meadow',status:'complete',strategy:'replace',critical:false},
  {id:'noms',label:'Noms Nook',status:'complete',strategy:'replace',critical:false},
  {id:'boss-bitch',label:'Boss Bitch',status:'complete',strategy:'replace',critical:false},
  {id:'money-cafe',label:'Money Cafe',status:'complete',strategy:'replace',critical:false},
  {id:'routines',label:'Routines V3',status:'complete',strategy:'replace',critical:true,completedIn:'alpha.10'},
  {id:'berry-busy',label:'Berry Busy V3 / Time Map',status:'complete',strategy:'replace',critical:true,completedIn:'alpha.10'},
  {id:'study-nook',label:'Study Nook V3',status:'complete',strategy:'replace',critical:true,completedIn:'alpha.12-merged'},
  {id:'projects',label:'Threads / Project Patch V3',status:'complete',strategy:'replace',critical:true,completedIn:'alpha.12-merged'},
  {id:'goals-growth-wins',label:'Goals + Growth + Wins',status:'complete',strategy:'absorb',critical:true,completedIn:'alpha.12-merged'},
  {id:'soft-reset-patterns',label:'Soft Reset + Pattern Lab Experience',status:'complete',strategy:'absorb',critical:true,completedIn:'alpha.12-merged'},
  {id:'control-center',label:'Control Center',status:'planned',strategy:'absorb',critical:true,target:'alpha.14-merged'},
  {id:'archive',label:'Memory / Archive',status:'planned',strategy:'replace',critical:true,target:'alpha.14-merged'},
  {id:'mochini-complete',label:'Mochini V3 Completion',status:'planned',strategy:'replace',critical:true,target:'alpha.14-merged'},
  {id:'cloud-sync',label:'V3 Cloud + Account Sync',status:'planned',strategy:'replace',critical:true,target:'alpha.14-merged'},
  {id:'v2-migration',label:'V2 to V3 Data Migration',status:'planned',strategy:'replace',critical:true,target:'alpha.15'},
  {id:'device-hardening',label:'iPhone/iPad/Desktop Hardening',status:'planned',strategy:'replace',critical:true,target:'alpha.16'}
];

export function v3Readiness(features=V3_FEATURES){const critical=features.filter(item=>item.critical),complete=critical.filter(item=>item.status==='complete').length;return{complete,total:critical.length,percent:critical.length?Math.round(complete/critical.length*100):100,blockers:critical.filter(item=>item.status!=='complete')}}
