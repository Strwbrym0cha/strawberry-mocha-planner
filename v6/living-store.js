const list=value=>Array.isArray(value)?value:[];
const text=value=>String(value??'').trim();
const active=rows=>list(rows).filter(row=>!row?.archivedAt);
const done=row=>['complete','completed','finished','achieved','comfortable','given'].includes(text(row?.status||row?.state).toLowerCase())||row?.done===true||row?.completed===true;

export function referenceCatalog(state={},planner={}){
 const rows=[],add=(kind,items,label)=>active(items).forEach(row=>rows.push({key:`${kind}:${row.id}`,kind,id:String(row.id),label:text(label(row))||'Untitled reference'}));
 add('wishing.plan',state.wishing?.plans,row=>row.title);add('rose.idea',state.rose?.ideas,row=>row.idea);add('rose.project',state.rose?.projects,row=>row.name);add('rose.watch',state.rose?.watches,row=>row.title);add('love.plan',state.love?.plans,row=>row.plan);add('smart.wiki',state.smart?.wiki,row=>row.title);add('living.milestone',state.living?.milestones,row=>row.title);
 add('planner.goal',planner.growth?.goals,row=>row.title||row.name);add('planner.moneyGoal',planner.money?.savingsGoals,row=>row.title||row.name);add('planner.course',planner.education?.courses,row=>row.title||row.name);
 return rows.sort((a,b)=>a.label.localeCompare(b.label));
}

export function resolveReference(key,state={},planner={}){return referenceCatalog(state,planner).find(row=>row.key===key)||null}

export function groupLifeChapters(chapters=[]){
 const groups=new Map;for(const chapter of active(chapters).sort((a,b)=>text(b.month).localeCompare(text(a.month)))){const month=text(chapter.month)||'Unsorted';if(!groups.has(month))groups.set(month,[]);groups.get(month).push(chapter)}return[...groups].map(([month,items])=>({month,items}));
}

export function milestoneTimeline(rows=[]){return active(rows).filter(row=>row.date).sort((a,b)=>text(b.date).localeCompare(text(a.date)))}

export function kingdomMap(state={},planner={}){
 const openLoops=active(state.smart?.openLoops).filter(row=>row.state!=='Resolved'),areaLoops=area=>openLoops.filter(row=>text(row.area).toLowerCase().includes(area)).length,inventory=active(state.smart?.inventory),maintenance=active(state.smart?.maintenance),plans=active(state.wishing?.plans),tasks=active(planner.life?.tasks).filter(row=>!done(row)),school=active(planner.education?.items).filter(row=>!done(row)),work=active(planner.work?.items).filter(row=>!done(row)),goals=active(planner.money?.savingsGoals),rose=[...active(state.rose?.watches),...active(state.rose?.games),...active(state.rose?.projects)],lovePlans=active(state.love?.plans),experiments=active(state.moon?.experiments),travel=plans.filter(row=>text(row.category).toLowerCase()==='travel'),projects=plans.filter(row=>text(row.category).toLowerCase()==='project');
 const area=(id,label,icon,activeItems,loops,indicator)=>({id,label,icon,activeItems,openLoops:loops,indicator});
 return[
  area('work','Work','👑',work.length,areaLoops('work'),work.length?`${work.length} active work item${work.length===1?'':'s'}`:'Work is quiet'),
  area('school','School','📚',school.length,areaLoops('school'),school.length?`${school.length} learning item${school.length===1?'':'s'}`:'No current school item'),
  area('money','Money','💰',goals.length,areaLoops('money'),goals.length?`${goals.length} saved goal${goals.length===1?'':'s'}`:'No linked money goal'),
  area('home','Home','🏡',maintenance.length+inventory.filter(row=>['need soon','out'].includes(text(row.state).toLowerCase())).length,areaLoops('home'),'Maintenance and restock only when relevant'),
  area('fun','Fun','🌹',rose.length,areaLoops('fun'),rose.length?`${rose.length} thing${rose.length===1?'':'s'} blooming`:'Room for something fun'),
  area('relationships','Relationships','💌',lovePlans.length,areaLoops('relationship'),lovePlans.length?`${lovePlans.length} saved plan${lovePlans.length===1?'':'s'}`:'Private details stay inside Love Letters'),
  area('health','Health / Moon Garden','🌙',experiments.length,areaLoops('moon'),experiments.length?`${experiments.length} personal experiment${experiments.length===1?'':'s'}`:'Private health details stay in Moon Garden'),
  area('travel','Travel','🧳',travel.length,areaLoops('travel'),travel.length?`${travel.length} wish${travel.length===1?'':'es'} on the horizon`:'No travel plan in focus'),
  area('projects','Projects','🛠️',projects.length,areaLoops('project'),projects.length?`${projects.length} future project${projects.length===1?'':'s'}`:'No future project in focus'),
  area('future','Future','✨',plans.length,areaLoops('future'),plans.length?`${plans.length} Wishing Tower plan${plans.length===1?'':'s'}`:'The horizon is open')
 ];
}

export function habitGarden(routines=[]){
 return list(routines).filter(row=>row&&row.active!==false).map(routine=>{const recent=list(routine.history?.recent),complete=recent.filter(row=>row.status==='complete').length,partial=recent.filter(row=>row.status==='partial').length,growth=Math.min(5,complete+Math.ceil(partial/2));return{id:String(routine.id),title:text(routine.title||routine.name)||'Routine',icon:text(routine.icon)||'🌱',growth,complete,partial,label:growth>=4?'Blooming':growth>=2?'Growing':growth?'Sprouting':'Resting'}});
}

export function dueConcreteMessages(messages=[],today='',context={}){
 const plans=list(context.plans),courses=list(context.courses),goals=list(context.goals);return active(messages).filter(row=>{const trigger=text(row.triggerType||'Date');if(trigger==='Plan achieved')return Boolean(row.linkedPlanId&&plans.some(plan=>String(plan.id)===String(row.linkedPlanId)&&text(plan.status)==='Achieved'));if(trigger==='Course completed')return Boolean(row.triggerRecordId&&courses.some(course=>String(course.id)===String(row.triggerRecordId)&&done(course)));if(trigger==='Goal completed')return Boolean(row.triggerRecordId&&goals.some(goal=>String(goal.id)===String(row.triggerRecordId)&&done(goal)));return!row.surfaceDate||row.surfaceDate<=today})
}

export function arrangedWidgets(keys=[],settings={}){const available=[...keys],order=list(settings.foyerOrder).filter(key=>available.includes(key));for(const key of available)if(!order.includes(key))order.push(key);const hidden=new Set(list(settings.hiddenWidgets));return order.map(key=>({key,hidden:hidden.has(key)}))}
