export function browserFetch(...args){
  if(typeof globalThis.fetch!=='function')throw new Error('Fetch is unavailable in this browser.');
  return globalThis.fetch(...args);
}

export const resolveFetch=fetchFunction=>typeof fetchFunction==='function'?fetchFunction:browserFetch;
