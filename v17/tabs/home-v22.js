import{renderHome as renderBaseHome}from'./home.js?v=22.1.34-20260818';
import{renderHomeCommandCenter}from'../app/home-command-center.js?v=22.2.0-20260818';

const subscribed=new WeakSet();
function renderHome(context){
 renderBaseHome(context);
 const refresh=()=>queueMicrotask(()=>{if(context.root?.isConnected&&context.router?.page==='home')renderHomeCommandCenter(context)});
 if(context.store&&!subscribed.has(context.store)){subscribed.add(context.store);context.store.subscribe(refresh)}
 refresh();
}
export{renderHome};
