const suites=[
 'calendar-sources.test.mjs','catch-all.test.mjs','finance-engine.test.mjs','guided-modes-foundation.test.mjs','guided-routines.test.mjs','hyperfixation-actions.test.mjs','lifestyle-engine.test.mjs','logic/logic-core.test.mjs','logic/mochini-day-context.test.mjs','mochini-actions.test.mjs','mochini-capabilities.test.mjs','mochini-conversation.test.mjs','mochini-intents.test.mjs','mochini-life.test.mjs','mochini-v5.test.mjs','mochini.test.mjs','noms.test.mjs','sips.test.mjs','study-nook.test.mjs','unified-actions-persistence.test.mjs','unified-actions.test.mjs','v5-integration.test.mjs','v5-persistence-roundtrip.test.mjs','work-hq.test.mjs'
];
for(const suite of suites)await import(new URL(`./${suite}`,import.meta.url));
console.log(`V5 complete suite: PASS (${suites.length} files)`);
