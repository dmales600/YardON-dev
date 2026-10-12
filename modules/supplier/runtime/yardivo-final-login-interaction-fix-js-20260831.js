(function(){
'use strict';
function fixRole(){
 const s=document.getElementById('loginRole');if(!s)return;
 const label=s.closest('label');
 label?.classList.remove('login-role-hidden','role-hidden');
 if(label){label.style.removeProperty('display');label.hidden=false}
 s.disabled=false;s.removeAttribute('disabled');s.removeAttribute('aria-hidden');
 s.style.pointerEvents='auto';
 const wanted=[['admin','Admin'],['manager','Voditelj'],['dispatcher','Dispatcher'],['inventory','Upravljanje zalihama'],['reception','Prijam'],['gate','Porta'],['supplier','Dobavljač']];
 const vals=[...s.options].map(o=>o.value).join('|');
 if(vals!==wanted.map(x=>x[0]).join('|')){
   const cur=s.value;
   s.innerHTML=wanted.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
   if(wanted.some(x=>x[0]===cur))s.value=cur;
 }
}
function fixLoginScroll(){
 const o=document.getElementById('loginOverlay');if(!o)return;
 o.style.overflowY='auto';
 o.style.touchAction='pan-y';
}
function apply(){fixRole();fixLoginScroll()}

/* Preserve normal mouse-wheel page scrolling.
   My Yard zoom is intentionally Ctrl+wheel so the 3D stage cannot trap ordinary scrolling. */
document.addEventListener('wheel',e=>{
 const overlay=document.getElementById('loginOverlay');
 const loginVisible=overlay && getComputedStyle(overlay).display!=='none';
 if(loginVisible){
   e.stopImmediatePropagation();
   return;
 }
 if(e.target?.closest?.('#myYard') && !e.ctrlKey){
   e.stopImmediatePropagation();
 }
},{capture:true,passive:true});

function stableApply(){
  apply();
  setTimeout(apply,40);
  setTimeout(apply,180);
  setTimeout(apply,700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stableApply,{once:true});else stableApply();
window.addEventListener('load',stableApply);
})();
