const CACHE='katos-v4-root-tools2-routetime1';
const SCOPE=self.registration.scope;
const url=p=>new URL(p,SCOPE).toString();
const CORE=[
  url('./index.html'),
  url('./v4/'),
  url('./v4/index.html'),
  url('./v4/styles.css?v=4.0.0-preview.2'),
  url('./v4/record-tools.css?v=4.0.0-tools1'),
  url('./v4/loader.js?v=4.0.0-parity3-tools2-routetime1'),
  url('./v4/store.js?v=4.0.0-preview.2'),
  url('./v4/mochini.js?v=4.0.0-routetime1'),
  url('./v4/preserve.js?v=4.0.0-parity3'),
  url('./v4/record-tools.js?v=4.0.0-tools1'),
  url('./v4/archive-tools.js?v=4.0.0-tools1'),
  url('./v4/motion-week.js?v=4.0.0-motionweek2'),
  url('./v4/time-calendar.js?v=4.0.0-calendar1'),
  url('./v4/money-accounts.js?v=4.0.0-accounts1'),
  url('./v4/work-schedule.js?v=4.0.0-workschedule1'),
  url('./v4/routine-timing.js?v=4.0.0-routetime1'),
  ...Array.from({length:8},(_,i)=>url(`./v4/parts/app-${String(i+1).padStart(2,'0')}.txt?v=4.0.0-parity3`)),
  url('./manifest.json?v=4'),
  url('./icon.svg')
];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>(key.startsWith('strawberry-mocha-')||key.startsWith('katos-v3-')||key.startsWith('katos-v4-'))&&key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const request=event.request;
  const requestUrl=new URL(request.url);
  const scopeUrl=new URL(SCOPE);
  if(requestUrl.origin!==scopeUrl.origin||!requestUrl.pathname.startsWith(scopeUrl.pathname))return;
  if(requestUrl.pathname.includes('/v3/')||requestUrl.pathname.includes('/v17/')||requestUrl.pathname.includes('/legacy-v2/'))return;

  event.respondWith(
    fetch(request,{cache:'no-store'}).then(response=>{
      if(response&&response.ok){
        const cacheable=
          requestUrl.pathname===scopeUrl.pathname||
          requestUrl.pathname.endsWith('/index.html')||
          requestUrl.pathname.includes('/v4/')||
          requestUrl.pathname.endsWith('/manifest.json')||
          requestUrl.pathname.endsWith('/icon.svg');
        if(cacheable){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
        }
      }
      return response;
    }).catch(async()=>{
      const cached=await caches.match(request,{ignoreSearch:true});
      if(cached)return cached;
      if(request.mode==='navigate'){
        if(requestUrl.pathname.includes('/v4/'))return caches.match(url('./v4/index.html'),{ignoreSearch:true});
        return caches.match(url('./index.html'),{ignoreSearch:true});
      }
      return Response.error();
    })
  );
});
