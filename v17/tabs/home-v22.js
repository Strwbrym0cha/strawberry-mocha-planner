import{renderHome as renderBaseHome}from'./home.js?v=22.1.34-20260818';
import{renderHomeCommandCenter}from'../app/home-command-center.js?v=22.2.0-20260818';

function renderHome(context){
 renderBaseHome(context);
 const refresh=()=>queueMicrotask(()=>{if(context.root?.isConnected)renderHomeCommandCenter(context)});
 context.store?.subscribe(refresh);
 refresh();
}
export{renderHome};
