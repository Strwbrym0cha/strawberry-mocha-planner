const BUILD='3.0.0-alpha.16-sidebar2';
const scriptUrl=new URL(import.meta.url),v3Base=new URL('./',scriptUrl),rootBase=new URL('../',v3Base);
const homeHref=rootBase.href;
const mainLink=hash=>{const url=new URL(homeHref);url.hash=hash;return url.href};
const page=file=>new URL(file,v3Base).href;
const NAV=[
  {label:'🏡 HOME',items:[
    {id:'home',icon:'🏡',label:'Home Sweet Home',href:homeHref},
    {id:'time',icon:'📅',label:'Berry Busy',href:page('time.html')},
    {id:'tasks',icon:'📝',label:'Sweet To-Dos',href:mainLink('tasks')},
    {id:'mochini',icon:'🍡',label:'Mochini',href:mainLink('mochini')},
    {id:'pings',icon:'🔔',label:'Little Pings',href:mainLink('pings')}
  ]},
  {label:'🍓 LIFE',items:[
    {id:'routines',icon:'🔁',label:'Routines',href:page('routines.html')},
    {id:'noms',icon:'🍱',label:'Noms Nook',href:page('noms.html')},
    {id:'sips',icon:'💧',label:'Sip Station',href:mainLink('sips')},
    {id:'motion',icon:'🌿',label:'Motion Meadow',href:page('motion.html')},
    {id:'boss',icon:'💼',label:'Boss Bitch',href:page('boss.html')},
    {id:'money',icon:'☕',label:'Money Café',href:page('money.html')}
  ]},
  {label:'🌱 GROW',items:[
    {id:'study',icon:'🎓',label:'Study Nook',href:page('study.html')},
    {id:'threads',icon:'🧵',label:'Threads',href:page('threads.html')},
    {id:'growth',icon:'🌱',label:'Growth Room',href:page('growth.html')},
    {id:'reset',icon:'🌸',label:'Reset Lab',href:page('mind.html#reset')},
    {id:'patterns',icon:'🔬',label:'Pattern Lab',href:page('mind.html#patterns')}
  ]},
  {label:'🎀 SYSTEM',items:[
    {id:'control',icon:'🎛️',label:'Control Center',href:page('control.html')},
    {id:'archive',icon:'📦',label:'Memory Box',href:page('archive.html')},
    {id:'cloud',icon:'☁️',label:'Cloud Nest',href:page('cloud.html')},
    {id:'migrate',icon:'🚚',label:'Migration Lab',href:page('migrate.html')},
    {id:'launch',icon:'🚦',label:'Launch Bay',href:page('launch.html')}
  ]}
];
const flat=()=>NAV.flatMap(group=>group.items);
const cleanPath=value=>value.replace(/\/index\.html$/,'/');
const rootPath=cleanPath(rootBase.pathname),v3Path=cleanPath(v3Base.pathname);
const isHomePath=()=>{const path=cleanPath(location.pathname);return path===rootPath||path===v3Path};
const filename=()=>location.pathname.split('/').pop()||'';
const hashView=()=>{const h=location.hash.replace('#','').toLowerCase();if(['tasks','sweet-todos'].includes(h))return'tasks';if(h==='mochini')return'mochini';if(['sips','sip-station'].includes(h))return'sips';if(['pings','little-pings'].includes(h))return'pings';return'home'};
function activeId(){if(isHomePath())return hashView();const file=filename(),byFile={'time.html':'time','routines.html':'routines','noms.html':'noms','motion.html':'motion','boss.html':'boss','money.html':'money','study.html':'study','threads.html':'threads','growth.html':'growth','control.html':'control','archive.html':'archive','cloud.html':'cloud','migrate.html':'migrate','launch.html':'launch'};if(file==='mind.html')return location.hash==='#patterns'?'patterns':'reset';return byFile[file]||'home'}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function modeLabel(){try{const raw=JSON.parse(localStorage.getItem('sm_v3_beta')||'null'),state=raw?.data||raw||{},mode=state?.context?.mode||'normal';const labels={normal:'Normal',study:'Study',boss:'Boss Bitch',bedtime:'Bedtime','soft-reset':'Soft Reset',hyperfixation:'Hyperfixation','home-reset':'Home Reset','going-out':'Going Out'};return labels[mode]||mode.replaceAll('-',' ')}catch{return'Normal'}}
function navMarkup(){const active=activeId();return NAV.map(group=>`<div class="katos-nav-group"><div class="katos-nav-group-title">${esc(group.label)}</div>${group.items.map(item=>`<a class="katos-nav-item ${item.id===active?'is-active':''}" data-katos-nav="${esc(item.id)}" href="${esc(item.href)}"><span class="katos-nav-icon">${item.icon}</span><span>${esc(item.label)}</span></a>`).join('')}</div>`).join('')}
function currentLabel(){return flat().find(item=>item.id===activeId())?.label||'KatOS'}
function shellMarkup(){return`<aside class="katos-sidebar" id="katosSidebar" aria-label="KatOS navigation"><div class="katos-sidebar-head"><div class="katos-sidebar-brand"><span class="katos-sidebar-berry">🍓</span><span>KatOS V3</span></div><span class="katos-sidebar-version">NEW MODEL · ${BUILD}</span></div><nav class="katos-sidebar-nav">${navMarkup()}</nav><div class="katos-sidebar-foot">V3 is the active KatOS model.<br>V2 stays in the code dungeon. 🔒</div></aside><div class="katos-drawer-scrim" id="katosDrawerScrim"></div><header class="katos-shell-topbar"><button class="katos-menu-button" id="katosMenuButton" type="button" aria-label="Open navigation">☰</button><div class="katos-top-title" id="katosTopTitle">${esc(currentLabel())}</div><div class="katos-top-spacer"></div><div class="katos-top-mode" id="katosTopMode">🍓 ${esc(modeLabel())}</div></header>`}
function openDrawer(open){document.body.classList.toggle('katos-drawer-open',open);document.getElementById('katosMenuButton')?.setAttribute('aria-expanded',String(open))}
function bindShell(){document.getElementById('katosMenuButton')?.addEventListener('click',()=>openDrawer(!document.body.classList.contains('katos-drawer-open')));document.getElementById('katosDrawerScrim')?.addEventListener('click',()=>openDrawer(false));document.querySelectorAll('[data-katos-nav]').forEach(a=>a.addEventListener('click',()=>openDrawer(false)));document.addEventListener('keydown',event=>{if(event.key==='Escape')openDrawer(false)})}
function labelCoreViews(){if(!isHomePath())return;const sections=[...document.querySelectorAll('#app section')];for(const section of sections){let view='';if(section.classList.contains('home'))view='home';const heading=(section.querySelector('h2')?.textContent||'').trim().toLowerCase();if(heading==='current context'||heading==='brain policy')view='home';else if(heading==='sweet to-dos')view='tasks';else if(heading==='sip station')view='sips';else if(heading==='mochini')view='mochini';else if(heading==='little pings')view='pings';else if(heading==='kat constitution')view='system-hidden';if(view)section.dataset.katosCoreView=view}const selected=hashView();document.querySelectorAll('[data-katos-core-view]').forEach(section=>section.classList.toggle('katos-view-hidden',section.dataset.katosCoreView!==selected));document.body.dataset.katosPage='home'}
function labelMindViews(){if(filename()!=='mind.html')return;const sections=[...document.querySelectorAll('#app section')];for(const section of sections){const text=(section.textContent||'').toLowerCase();if(text.includes('pattern lab')||text.includes('pattern candidate'))section.dataset.katosMindView='patterns';else if(text.includes('soft reset')||text.includes('reset lab'))section.dataset.katosMindView='reset'}const selected=location.hash==='#patterns'?'patterns':'reset',known=[...document.querySelectorAll('[data-katos-mind-view]')];if(known.some(x=>x.dataset.katosMindView===selected))known.forEach(section=>section.classList.toggle('katos-view-hidden',section.dataset.katosMindView!==selected))}
function applyViews(){labelCoreViews();labelMindViews()}
function refreshChrome(){document.querySelectorAll('[data-katos-nav]').forEach(a=>a.classList.toggle('is-active',a.dataset.katosNav===activeId()));const title=document.getElementById('katosTopTitle');if(title)title.textContent=currentLabel();const mode=document.getElementById('katosTopMode');if(mode)mode.textContent=`🍓 ${modeLabel()}`;applyViews()}
function install(){if(document.getElementById('katosSidebar'))return;document.body.classList.add('katos-v3-shell');if(!isHomePath())document.body.dataset.katosPage=activeId();document.body.insertAdjacentHTML('afterbegin',shellMarkup());bindShell();applyViews();const app=document.getElementById('app');if(app){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refreshChrome()})}).observe(app,{childList:true,subtree:true})}window.addEventListener('hashchange',()=>{refreshChrome();scrollTo({top:0,behavior:'auto'})});window.addEventListener('storage',event=>{if(event.key==='sm_v3_beta')refreshChrome()});refreshChrome()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
