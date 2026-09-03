export const TABS=['home','planner','tasks','mochini','garden','school','work','money','movement','hobbies','growth','reminders','noms','sips','brain','wellness','goals','projects','labs','wins','archive','settings','hub'];
const legacyAliases={myloves:'hobbies','my-loves':'hobbies',loves:'hobbies',people:'hobbies'};
const resolve=page=>legacyAliases[String(page||'').toLowerCase()]||page;
export function createRouter({onChange,initial='home'}){let current=TABS.includes(resolve(initial))?resolve(initial):'home';return{get page(){return current},go(page){const next=resolve(page);if(!TABS.includes(next))return;current=next;history.replaceState({},'',`#${next}`);onChange?.(current)}}}
