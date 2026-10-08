
(function(){
'use strict';
function role(){let r='';try{r=String(currentSession?.role||window.currentSession?.role||'').toLowerCase().trim()}catch(e){};if(r==='prijam')r='reception';if(r==='zalihe'||r.includes('zalih'))r='inventory';if(r==='porta'||r==='portir')r='gate';return r}
function persist(){
 try{saveAnnouncements()}catch(e){
  try{safeStorage.setItem('yardivo_yms_announcements_v1',JSON.stringify(announcements));safeStorage.setItem('yardivo_yms_announcements_v1',JSON.stringify(announcements))}catch(_){}
 }
}
function refreshAll(){
 persist();
 ['render','renderAnnouncements','renderReceiving','renderDailyMap','renderWeeklyMap','renderOverview','refreshRecommendation'].forEach(n=>{try{if(typeof window[n]==='function')window[n]()}catch(e){}});
 try{window.YardivoUnannouncedSection?.render?.()}catch(e){}
 try{window.YardivoUnannounced?.render?.()}catch(e){}
}
function findA(id){try{return (announcements||[]).find(x=>String(x.id)===String(id))}catch(e){return null}}
function approve(id){
 if(!['admin','reception'].includes(role())){alert('Odobriti nenajavljeni dolazak može samo Prijam ili Admin.');return false}
 const a=findA(id);if(!a||a.approvalStatus!=='PENDING')return false;
 const now=new Date(),by=currentSession?.user||currentSession?.username||role();
 a.approvalStatus='APPROVED';a.status='U dolasku';a.approvedBy=by;a.approvedAt=now.toISOString();
 (a.changeHistory||(a.changeHistory=[])).push({changedAt:now.toISOString(),type:'UNANNOUNCED_APPROVED',reason:'Odobren nenajavljeni dolazak',changedBy:by});
 refreshAll();try{showYmsToast?.('success','ULAZ ODOBREN',`${a.supplier||'Dobavljač'} · ${a.plannedPlate||''}`)}catch(e){};return true
}
function reject(id){
 if(!['admin','reception'].includes(role())){alert('Odbiti nenajavljeni dolazak može samo Prijam ili Admin.');return false}
 const a=findA(id);if(!a||a.approvalStatus!=='PENDING')return false;
 const reason=document.getElementById('uaRejectReason_'+id)?.value?.trim()||'Nenajavljeni dolazak nije odobren',now=new Date(),by=currentSession?.user||currentSession?.username||role();
 a.approvalStatus='REJECTED';a.status='Odbijen';a.approvalRejectedBy=by;a.approvalRejectedAt=now.toISOString();a.approvalRejectionReason=reason;a.rejectedAt=now.toISOString();
 (a.changeHistory||(a.changeHistory=[])).push({changedAt:now.toISOString(),type:'UNANNOUNCED_REJECTED',reason,changedBy:by});
 refreshAll();try{showYmsToast?.('error','ULAZ ODBIJEN',`${a.supplier||'Dobavljač'} · ${a.plannedPlate||''}`)}catch(e){};return true
}
function enforceRoles(){
 try{
  /* Compatibility only: canonical role/menu visibility is owned by
     modules/auth/role-visibility.js. Never repaint menu visibility here. */
  if(window.YardivoUnannounced){window.YardivoUnannounced.approve=approve;window.YardivoUnannounced.reject=reject}
  document.querySelectorAll('[data-view="yard"],[data-home-target="yard"],#yard').forEach(x=>x.remove());
 }catch(e){}
}
const oldApply=window.applyRoleAccess;
window.applyRoleAccess=function(){try{oldApply?.apply(this,arguments)}catch(e){};enforceRoles()};
window.addEventListener('yardivo:login',()=>setTimeout(enforceRoles,0));
window.addEventListener('load',()=>setTimeout(enforceRoles,120));
document.addEventListener('click',e=>{if(e.target.closest('[data-view="unannounced"]'))setTimeout(enforceRoles,0)},true);
/* No periodic watchdog: it used to fight canonical role visibility every 2.5 s
   and was a visible source of home/menu flicker. */
window.YardivoQAWorkflow={approveUnannounced:approve,rejectUnannounced:reject,enforceRoles};
})();
