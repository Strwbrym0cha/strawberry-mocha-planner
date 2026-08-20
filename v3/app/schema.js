import{DEFAULT_CONSTITUTION,normalizeConstitution}from'./constitution.js';
import{DEFAULT_KAT_MODEL,DEFAULT_PATTERNS,normalizeKatModel,normalizePatterns}from'./kat-model.js';
import{DEFAULT_CONTEXT,normalizeContext}from'./context.js';

export const V3_SCHEMA_VERSION=1;
export const V3_STORAGE_KEY='sm_v3_beta';

const clone=value=>structuredClone(value);
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const list=value=>Array.isArray(value)?value:[];

export const DEFAULT_V3_STATE={
  schemaVersion:V3_SCHEMA_VERSION,
  profile:{
    constitution:clone(DEFAULT_CONSTITUTION),
    katModel:clone(DEFAULT_KAT_MODEL),
    preferences:{},
    patterns:clone(DEFAULT_PATTERNS)
  },
  context:clone(DEFAULT_CONTEXT),
  life:{
    inbox:[],
    tasks:[],
    reminders:[],
    routines:[],
    events:[],
    threads:[]
  },
  nourish:{
    noms:{foods:[],recipes:[],history:[]},
    sips:{fridge:[],history:[]}
  },
  movement:{sessions:[],routines:[],videos:[],weighIns:[]},
  education:{courses:[],tasks:[],goals:[]},
  work:{items:[],schedule:{}},
  insights:{activityLog:[],observations:[],experiments:[]},
  mochini:{conversation:[]},
  meta:{
    build:'3.0.0-alpha.1',
    createdAt:'',
    updatedAt:''
  }
};

export function createInitialV3State(){
  const now=new Date().toISOString();
  const state=clone(DEFAULT_V3_STATE);
  state.meta.createdAt=now;
  state.meta.updatedAt=now;
  state.context.updatedAt=now;
  return state;
}

export function normalizeV3State(value){
  const saved=object(value);
  const profile=object(saved.profile);
  const life=object(saved.life);
  const nourish=object(saved.nourish);
  const movement=object(saved.movement);
  const education=object(saved.education);
  const work=object(saved.work);
  const insights=object(saved.insights);
  const mochini=object(saved.mochini);
  const meta=object(saved.meta);
  const fallback=createInitialV3State();

  return{
    schemaVersion:V3_SCHEMA_VERSION,
    profile:{
      constitution:normalizeConstitution(profile.constitution),
      katModel:normalizeKatModel(profile.katModel),
      preferences:object(profile.preferences),
      patterns:normalizePatterns(profile.patterns)
    },
    context:normalizeContext(saved.context),
    life:{
      inbox:list(life.inbox),
      tasks:list(life.tasks),
      reminders:list(life.reminders),
      routines:list(life.routines),
      events:list(life.events),
      threads:list(life.threads)
    },
    nourish:{
      noms:{...fallback.nourish.noms,...object(nourish.noms)},
      sips:{...fallback.nourish.sips,...object(nourish.sips)}
    },
    movement:{...fallback.movement,...movement},
    education:{...fallback.education,...education},
    work:{...fallback.work,...work},
    insights:{
      activityLog:list(insights.activityLog),
      observations:list(insights.observations),
      experiments:list(insights.experiments)
    },
    mochini:{conversation:list(mochini.conversation)},
    meta:{
      build:String(meta.build||fallback.meta.build),
      createdAt:String(meta.createdAt||fallback.meta.createdAt),
      updatedAt:String(meta.updatedAt||fallback.meta.updatedAt)
    }
  };
}

export function loadV3State(storage=localStorage){
  try{
    const raw=storage.getItem(V3_STORAGE_KEY);
    if(!raw)return createInitialV3State();
    const parsed=JSON.parse(raw);
    return normalizeV3State(parsed?.data||parsed);
  }catch{
    return createInitialV3State();
  }
}

export function saveV3State(state,storage=localStorage){
  const next=normalizeV3State({...state,meta:{...state?.meta,updatedAt:new Date().toISOString()}});
  storage.setItem(V3_STORAGE_KEY,JSON.stringify({data:next}));
  return next;
}

export function resetV3State(storage=localStorage){
  const next=createInitialV3State();
  storage.setItem(V3_STORAGE_KEY,JSON.stringify({data:next}));
  return next;
}
