const CLOUD_URL='https://sigjwmgekmrwehylvuvu.supabase.co';
const CLOUD_KEY='sb_publishable_CTqamiGR3_lXNW2mBx9wMA_ObemQMAC';
const DATA_KEY='sm_v16';
const SESSION_KEYS=['sm_v16_session','sb-sigjwmgekmrwehylvuvu-auth-token'];

function readSession(){
  for(const key of SESSION_KEYS){
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||'null');
      const session=parsed?.currentSession||parsed?.session||parsed;
      if(session?.access_token&&session?.user?.id)return session;
    }catch{}
  }
  return null;
}

function unwrap(raw){
  try{
    const parsed=typeof raw==='string'?JSON.parse(raw):raw;
    return parsed?.data&&typeof parsed.data==='object'?parsed.data:parsed;
  }catch{return null}
}

function list(value){return Array.isArray(value)?value:[]}

function contentScore(state){
  if(!state||typeof state!=='object')return 0;
  const groups=[
    state.tasks,state.events,state.reminders,state.routines,state.guidedRoutines,state.habits,state.goals,state.wins,state.courses,state.projects,state.archive,state.brainNotes,state.schoolTasks,state.workItems,
    state.workHQ?.clients,state.workHQ?.supervisors,state.workHQ?.sessionPlans,state.workHQ?.materials,state.workHQ?.professionalDevelopment,state.workHQ?.fieldworkRecords,state.workHQ?.documents,
    state.studyNook?.institutions,state.studyNook?.providers,state.studyNook?.programs,state.studyNook?.requirements,state.studyNook?.courses,state.studyNook?.assignments,state.studyNook?.terms,state.studyNook?.transferEvaluations,state.studyNook?.studySessions,state.studyNook?.importantDates,state.studyNook?.documents,
    state.finance?.accounts,state.finance?.ledger,state.finance?.bills,state.finance?.subscriptions,state.finance?.goals,state.finance?.gigPlatforms,state.finance?.gigOrders,state.finance?.gigPayouts,
    state.lifestyle?.movement?.activities,state.lifestyle?.movement?.plans,state.lifestyle?.movement?.goals,state.lifestyle?.hobbies?.items,state.lifestyle?.hobbies?.projects,state.lifestyle?.growth?.goals,state.lifestyle?.growth?.wins,
    state.noms?.foods,state.noms?.pantry,state.noms?.groceries,state.noms?.recipes
  ];
  return groups.reduce((sum,group)=>sum+list(group).length,0);
}

export async function hydrateFromCloudIfSafer(){
  const session=readSession();
  if(!session)return{ok:false,reason:'no-session'};
  try{
    const response=await fetch(`${CLOUD_URL}/rest/v1/planner_data?user_id=eq.${encodeURIComponent(session.user.id)}&select=data,updated_at`,{
      headers:{apikey:CLOUD_KEY,Authorization:`Bearer ${session.access_token}`}
    });
    if(!response.ok)return{ok:false,reason:'cloud-read-failed',status:response.status};
    const rows=await response.json();
    const row=Array.isArray(rows)?rows[0]:null;
    const cloud=row?.data;
    if(!cloud||typeof cloud!=='object')return{ok:false,reason:'no-cloud-data'};

    const local=unwrap(localStorage.getItem(DATA_KEY));
    const cloudScore=contentScore(cloud);
    const localScore=contentScore(local);
    const cloudTime=Date.parse(cloud.__smUpdatedAt||row.updated_at||'')||0;
    const localTime=Date.parse(local?.__smUpdatedAt||'')||0;

    const shouldHydrate=!local || cloudScore>localScore || (cloudScore===localScore&&cloudTime>localTime);
    if(!shouldHydrate)return{ok:true,hydrated:false,cloudScore,localScore};

    if(local&&localScore>0){
      try{localStorage.setItem(`sm_v16_pre_cloud_hydrate_${Date.now()}`,JSON.stringify({data:local}))}catch{}
    }
    localStorage.setItem(DATA_KEY,JSON.stringify({data:cloud}));
    window.dispatchEvent(new CustomEvent('sm:cloud-hydrate',{detail:{ok:true,cloudScore,localScore}}));
    return{ok:true,hydrated:true,cloudScore,localScore};
  }catch(error){
    return{ok:false,reason:'exception',error:String(error?.message||error)};
  }
}
