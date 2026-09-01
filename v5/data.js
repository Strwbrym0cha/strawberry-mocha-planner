const V4_KEY='sm_v4_beta';
const V5_UI_KEY='sm_v5_preview_ui';

const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();

export function localDateKey(date=new Date()){
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,'0');
  const day=String(date.getDate()).padStart(2,'0');
  return `${year}-${month}-${day}`;
}

export function readV4State(){
  try{
    const raw=localStorage.getItem(V4_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    return parsed&&typeof parsed==='object'?parsed:null;
  }catch(error){
    console.warn('KatOS V5 could not read the local V4 snapshot.',error);
    return null;
  }
}

export function loadV5Ui(){
  const fallback={view:'boss',mode:'normal',sidebarOpen:false,bossLane:'rbt'};
  try{
    const parsed=JSON.parse(localStorage.getItem(V5_UI_KEY)||'null');
    if(!parsed||typeof parsed!=='object')return fallback;
    return{
      view:text(parsed.view)||fallback.view,
      mode:['normal','tiny','power'].includes(parsed.mode)?parsed.mode:fallback.mode,
      sidebarOpen:false,
      bossLane:parsed.bossLane==='gig'?'gig':'rbt'
    };
  }catch{return fallback}
}

export function saveV5Ui(ui){
  const safe={view:ui.view,mode:ui.mode,bossLane:ui.bossLane};
  try{localStorage.setItem(V5_UI_KEY,JSON.stringify(safe))}catch{}
}

function amountOfGig(row){
  const direct=Number(row?.amount??row?.total??row?.actualAmount);
  if(Number.isFinite(direct)&&direct!==0)return direct;
  return (Number(row?.earnings)||0)+(Number(row?.tips)||0);
}

function sessionSort(a,b){
  return String(b?.date||'').localeCompare(String(a?.date||''))||String(b?.startTime||'').localeCompare(String(a?.startTime||''));
}

export function snapshotV4(){
  const state=readV4State();
  const today=localDateKey();
  if(!state){
    return{found:false,today,clients:[],sessions:[],shifts:[],gigs:[],activeClients:[],todaySessions:[],todayShifts:[],waitingNotes:[],recentGigs:[]};
  }

  const clients=list(state?.work?.rbt?.clients);
  const sessions=list(state?.work?.rbt?.sessions);
  const shifts=list(state?.work?.shifts);
  const gigs=list(state?.money?.earnings).map(row=>({...row,_v5Amount:amountOfGig(row)}));
  const activeClients=clients.filter(row=>row?.status!=='closed');
  const todaySessions=sessions.filter(row=>row?.date===today&&row?.status!=='canceled').sort((a,b)=>String(a?.startTime||'').localeCompare(String(b?.startTime||'')));
  const todayShifts=shifts.filter(row=>row?.date===today).sort((a,b)=>String(a?.startTime||'').localeCompare(String(b?.startTime||'')));
  const waitingNotes=sessions.filter(row=>row?.status!=='canceled'&&row?.noteStatus!=='submitted').sort(sessionSort);
  const recentGigs=gigs.slice().sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||''))).slice(0,8);

  return{found:true,today,state,clients,sessions,shifts,gigs,activeClients,todaySessions,todayShifts,waitingNotes,recentGigs};
}
