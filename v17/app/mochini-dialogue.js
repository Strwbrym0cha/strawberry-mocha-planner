export const MOCHINI_DIALOGUE={
 greeting:['Oh, hello Kat. The bean is online.','Kat detected. Tiny festivities initiated.','You came back. I was being extremely normal.'],
 sleepy:['Why is morning legal.','I am currently unavailable. Tiny bean maintenance.','The eyelids have filed a formal complaint.'],
 bored:["Kat. You've checked me four times. Are we doing something or just making eye contact.",'I have inspected the same crumb twice. Developments are limited.','I am accepting tiny assignments and interesting gossip.'],
 proud:['WAIT. You already did things?? Who authorized this productivity.','Look at you go. I am standing nearby looking extremely proud.','Task defeated. Tiny victory trumpet noises.'],
 chaotic:['I have a plan. It is mostly glitter and confidence.','Today has suspicious little side-quest energy.','The bean has entered experimental mode.'],
 berries:['A berry! Excellent. The economy works.','Accepted. Strawberry quality control complete.','Berry received. Morale has become rounder.'],
 berryLimit:['I must pace myself. Tiny stomach, enormous ambition.','Berry reserves noted. The bean is at responsible capacity.'],
 taskComplete:['Task defeated. I witnessed the whole thing.','One less thing rattling around the list. Delicious.','Productivity detected. I am trying to remain calm.'],
 allTasksComplete:['Everything is done?? I need to sit down.','All clear. Rest has entered the official schedule.'],
 routineComplete:['Routine complete. The tiny gears are turning.','Whole routine handled. Extremely suspicious competence.'],
 ignored:['Oh good, you are back. I definitely was not waiting by the window.','Welcome back. I kept the crumb situation under control.'],
 idle:['I am conducting important bean research.','No emergency. I am simply staring into the middle distance.','Tiny office hours are now in session.'],
 lateNight:['Kat. The sun has clocked out.','It is late. I am becoming 14% more ridiculous.','Night mode: soft lights, questionable ideas.'],
 returningAfterAbsence:['You returned! I have several tiny updates and no paperwork.','Long time no see. I maintained the premises heroically.'],
 obsession:['Still thinking about {obsession}.','Current research priority: {obsession}. No further questions.','My {obsession} era continues. We are learning very little.'],
 poke:['???','Kat.','I felt that.','Unhand the bean.','This is now a documented poking incident.']
};

export const MOCHINI_ACTIVITIES=[
 {id:'sleeping',label:'Sleeping with professional intensity 💤',weight:({hour})=>hour<7||hour>=23?8:1},
 {id:'coffee',label:'Making suspiciously tiny coffee ☕',weight:({hour})=>hour>=6&&hour<12?7:1},
 {id:'strawberries',label:'Eating strawberries for research 🍓',weight:()=>3},
 {id:'space',label:'Staring into space very productively ✦',weight:()=>3},
 {id:'rabbit-holes',label:'Reading an unnecessary rabbit hole 📚',weight:({hour})=>hour>=12&&hour<22?4:2},
 {id:'organizing',label:'Organizing tiny objects by secret criteria',weight:()=>3},
 {id:'plotting',label:'Plotting something harmless',weight:({chaos})=>1+chaos/25},
 {id:'studying',label:'Studying important bean business',weight:({hour})=>hour>=10&&hour<19?4:1},
 {id:'koi',label:'Hanging out with Koi',weight:()=>2},
 {id:'nala',label:'Hanging out with Nala',weight:()=>2},
 {id:'hat',label:'Wearing a tiny hat with authority 🎩',weight:()=>2}
];

export const MOCHINI_OBSESSIONS=['tiny hats','strawberries','spoons','stickers','suspiciously small furniture','collecting buttons','becoming a worm','overthrowing alarm clocks','tiny beverages'];

export const MOCHINI_IDLE_EVENTS=[
 'Mochini found a strawberry.','Mochini fell asleep mid-investigation.','Mochini acquired a tiny hat.','Mochini has declared war on alarm clocks.','Mochini is investigating a suspicious crumb.','Mochini requests one berry.','Mochini is hiding very visibly.','Mochini is conducting “important research.”'
];
