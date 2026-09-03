const waitRuntime=()=>new Promise(resolve=>{const tick=()=>window.__KATOS_V4_RUNTIME?resolve(window.__KATOS_V4_RUNTIME):setTimeout(tick,25);tick()});
const rt=await waitRuntime();
const list=v=>Array.isArray(v)?v:[];
const pad=v=>String(v).padStart(2,'0');
const localDateKey=value=>{const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const today=()=>rt.today?rt.today():localDateKey();

function mondayDate(now=new Date()){
  const d=now instanceof Date?new Date(now):new Date(now);
  const offset=(d.getDay()+6)%7;
  d.setHours(12,0,0,0);
  d.setDate(d.getDate()-offset);
  return d;
}

function breakdown(state){
  const sessions=list(state?.movement?.sessions);
  const start=mondayDate();
  return Array.from({length:7},(_,index)=>{
    const d=new Date(start);
    d.setDate(d.getDate()+index);
    const date=localDateKey(d);
    const items=sessions.filter(item=>String(item?.date||String(item?.loggedAt||'').slice(0,10))===date);
    return{
      date,
      day:d.toLocaleDateString([],{weekday:'short'}),
      shortDate:d.toLocaleDateString([],{month:'numeric',day:'numeric'}),
      minutes:items.reduce((sum,item)=>sum+Number(item?.minutes||0),0),
      sessions:items.length
    };
  });
}

function injectStyle(){
  if(document.getElementById('motion-week-style'))return;
  const style=document.createElement('style');
  style.id='motion-week-style';
  style.textContent=`
.motion-week{overflow:hidden}.motion-week-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-bottom:13px}.motion-week-total{text-align:right}.motion-week-total b{display:block;font-family:var(--katos-title,Georgia,serif);font-size:26px;font-weight:400;color:#654650}.motion-week-total span{font-size:10px;color:#876b74;font-weight:800}.motion-week-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}.motion-day{padding:10px 9px;border:1px solid #ecd8df;border-radius:15px;background:#fff;min-width:0}.motion-day.today{background:linear-gradient(180deg,#fff7fb,#fff);border-color:#e7bccc;box-shadow:0 7px 18px rgba(139,78,103,.08)}.motion-day.future{opacity:.6}.motion-day-top{display:flex;align-items:center;justify-content:space-between;gap:5px}.motion-day-name{font-size:10px;font-weight:900;letter-spacing:.04em;color:#785562;text-transform:uppercase}.motion-day-date{font-size:9px;color:#a0868f}.motion-day-minutes{font-family:var(--katos-title,Georgia,serif);font-size:20px;color:#624550;margin-top:5px}.motion-day-minutes small{font-family:var(--katos-ui,-apple-system,sans-serif);font-size:9px;font-weight:800;color:#947681}.motion-day-track{height:7px;border-radius:999px;background:#f3e7ec;overflow:hidden;margin-top:7px}.motion-day-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#e8a9c2,#bf8dcc);min-width:0}.motion-day-meta{font-size:9px;color:#8b7079;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.motion-week-note{font-size:9px;color:#a0858e;margin-top:10px}@media(max-width:820px){.motion-week-days{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:520px){.motion-week-days{grid-template-columns:repeat(2,minmax(0,1fr))}.motion-week-head{align-items:flex-start;flex-direction:column}.motion-week-total{text-align:left}}
`;
  document.head.appendChild(style);
}

function render(){
  injectStyle();
  const active=document.querySelector('.nav-btn.active[data-view="motion"]');
  if(!active)return;
  if(document.querySelector('[data-motion-week]'))return;
  const page=document.querySelector('.main .page');
  const grid=page?.querySelector(':scope > .grid');
  if(!grid)return;
  const days=breakdown(rt.getState());
  const total=days.reduce((sum,day)=>sum+day.minutes,0);
  const sessions=days.reduce((sum,day)=>sum+day.sessions,0);
  const scale=Math.max(30,...days.map(day=>day.minutes));
  const now=today();
  const section=document.createElement('section');
  section.className='card full motion-week';
  section.dataset.motionWeek='1';
  section.innerHTML=`<div class="motion-week-head"><div><div class="ey">🌷 THIS WEEK</div><h2>Little movement receipts</h2><p>Your Monday–Sunday totals at a glance. Zero-minute days are information, not a scolding.</p></div><div class="motion-week-total"><b>${total} min</b><span>${sessions} session${sessions===1?'':'s'} this week</span></div></div><div class="motion-week-days">${days.map(day=>{const pct=day.minutes?Math.max(5,Math.min(100,day.minutes/scale*100)):0;const cls=day.date===now?'today':day.date>now?'future':'';return`<div class="motion-day ${cls}"><div class="motion-day-top"><span class="motion-day-name">${day.day}</span><span class="motion-day-date">${day.shortDate}</span></div><div class="motion-day-minutes">${day.minutes}<small> min</small></div><div class="motion-day-track"><div class="motion-day-fill" style="width:${pct}%"></div></div><div class="motion-day-meta">${day.sessions} session${day.sessions===1?'':'s'}</div></div>`}).join('')}</div><div class="motion-week-note">Bars use a 30-minute-or-busiest-day visual scale so they stay readable. It is not a required daily goal.</div>`;
  const cards=[...grid.children];
  const insertionPoint=cards.find(node=>node.querySelector?.('.ey')?.textContent?.includes('SAVED MOVEMENT'));
  if(insertionPoint)grid.insertBefore(section,insertionPoint);else grid.appendChild(section);
}

let queued=false;
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})};
new MutationObserver(schedule).observe(document.getElementById('app'),{childList:true,subtree:true});
schedule();
