
(function(){
'use strict';
window.__YARDIVO_V583_MYYARD_PARKING42__='20260930-dev-v5.8.3-myyard-time-only-operations';
function cleanLegacy(){document.querySelectorAll('#myYard *').forEach(el=>{if(el.children.length===0&&/^NN\s*\/\s*NN$/i.test((el.textContent||'').trim()))el.remove()})}
function load(id,src){
 if(document.getElementById(id))return;
 const s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.head.appendChild(s);
}
function boot(){
 load('yardon-supplier-time-only-v1','modules/supplier/yardon-supplier-time-only-v1.js?v=20260930-1');
 load('yardon-myyard-operations-v1','modules/services/yardon-myyard-operations-v1.js?v=20260930-1');
 setTimeout(cleanLegacy,40);
}
document.addEventListener('click',e=>{if(e.target.closest('[data-view="myYard"],[data-home-target="myYard"]'))requestAnimationFrame(()=>{cleanLegacy();window.YardOnMyYardOperationsV1?.refresh?.()})},true);
window.addEventListener('yardivo:context-changed',()=>{try{window.YardivoMyYard?.render?.()}catch(e){};requestAnimationFrame(()=>{cleanLegacy();window.YardOnMyYardOperationsV1?.refresh?.()})});
window.addEventListener('yardivo:login',()=>setTimeout(boot,80));
window.addEventListener('load',()=>setTimeout(boot,180),{once:true});
setTimeout(boot,20);
})();
