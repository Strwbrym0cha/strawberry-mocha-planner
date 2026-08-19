import{renderSips as renderSipsBase}from'./sips-base-v227.js?v=22.9.0-20260819';
import{installSipDiary}from'./sips-diary-v227.js?v=22.9.0-20260819';

export function renderSips(context){
 renderSipsBase(context);
 installSipDiary(context);
}
