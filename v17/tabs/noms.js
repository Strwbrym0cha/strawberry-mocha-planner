import{renderNoms as renderNomsBase}from'./noms-base-v227.js?v=22.7.0-20260819';
import{installNomDiary}from'./noms-diary-v227.js?v=22.7.0-20260819';

export function renderNoms(context){
 renderNomsBase(context);
 installNomDiary(context);
}
