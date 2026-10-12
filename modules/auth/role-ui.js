(function(){
'use strict';

function normRole(v){
  v=String(v||'').toLowerCase().trim();
  if(v==='porta'||v==='portir')return'gate';
  if(v==='prijam')return'reception';
  if(v==='zalihe'||v==='upravljanje zalihama'||v.includes('zalih'))return'inventory';
  if(v==='management'||v==='voditelj')return'manager';
  if(v==='dobavljac'||v==='dobavljač')return'supplier';
  return v;
}

const select=document.getElementById('loginRole');
if(select){
  const holder=select.closest('label');
  if(holder)holder.style.removeProperty('display');
  select.disabled=false;
  select.removeAttribute('aria-hidden');
  select.innerHTML=[
    ['admin','Admin'],
    ['manager','Voditelj'],
    ['dispatcher','Dispatcher'],
    ['inventory','Upravljanje zalihama'],
    ['reception','Prijam'],
    ['gate','Porta'],
    ['supplier','Dobavljač']
  ].map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
}

window.canAnnounceDriverData=function(){
  const role=normRole(window.currentSession?.role||'');
  return role==='admin'||role==='inventory';
};

window.canManageAnnouncementPlanning=function(){
  const role=normRole(window.currentSession?.role||'');
  return role==='admin'||role==='inventory';
};

function syncDriverControls(){
  const can=window.canAnnounceDriverData();
  document.querySelectorAll(
    '#ctxDriverAnnouncement,#driverAnnouncementForm input,#driverAnnouncementForm button'
  ).forEach(el=>{
    if(can){
      el.disabled=false;
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('opacity');
    }
  });
}

document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="announcements"],[data-home-target="announcements"]')){
    setTimeout(syncDriverControls,30);
  }
});

window.addEventListener('yardivo:login',()=>setTimeout(syncDriverControls,0));
setTimeout(syncDriverControls,400);

/* Compatibility shim only. Auth/session ownership is services/auth.js. */
window.YardivoAuthFinal={
  legacyRole:normRole,
  selectedRole:()=>normRole(document.getElementById('loginRole')?.value||''),
  authoritativeLogin:()=>window.YardivoCanonicalLogin?.login?.()
};
})();