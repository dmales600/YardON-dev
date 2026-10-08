
(()=>{'use strict';
if(window.__YV_RECEPTION_UI_SCOPE_CLEAN__)return;
window.__YV_RECEPTION_UI_SCOPE_CLEAN__=true;

const HIDDEN_VIEWS=new Set(['dashboard','controlTower','controltower','checkin','docks','orderSearch']);
const $=id=>document.getElementById(id);
let applyTimer=0;
let lastUiSig='';
let internalContextWrite=false;

function role(){
  let r=String(window.currentSession?.app_role||window.currentSession?.role||document.body.dataset.yardivoRole||'').toLowerCase().trim();
  if(r==='prijam')r='reception';
  return r;
}
function isReception(){return role()==='reception'}

function master(){
  try{
    return window.YardivoAppStateV583?.master?.()||JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}')||{};
  }catch(_){return{}}
}
function ids(v){
  return Array.isArray(v)?v.map(x=>String(typeof x==='object'?(x?.id||''):x||'').trim()).filter(Boolean):[];
}
function allowedLocations(){
  const s=window.currentSession||{};
  const d=master(), all=(Array.isArray(d.locations)?d.locations:[]).filter(x=>x&&x.active!==false);
  if(!isReception())return all;

  const set=new Set(ids(s.locations||s.location_ids));
  const one=String(s.location||s.location_id||'').trim();
  if(one&&one!=='ALL')set.add(one);

  const whSet=new Set(ids(s.warehouses||s.warehouse_ids));
  (Array.isArray(d.warehouses)?d.warehouses:[]).forEach(w=>{
    if(w&&whSet.has(String(w.id))&&w.location_id)set.add(String(w.location_id));
  });
  return all.filter(x=>set.has(String(x.id)));
}
function allowedWarehouses(loc){
  const s=window.currentSession||{},d=master();
  const all=(Array.isArray(d.warehouses)?d.warehouses:[]).filter(x=>x&&x.active!==false);
  if(!isReception())return all.filter(x=>!loc||String(x.location_id)===String(loc));

  const set=new Set(ids(s.warehouses||s.warehouse_ids));
  const one=String(s.warehouse||s.warehouse_id||'').trim();
  if(one&&one!=='ALL')set.add(one);
  return all.filter(x=>set.has(String(x.id))&&(!loc||String(x.location_id)===String(loc)));
}
function esc(v){
  return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function fill(sel,rows,placeholder,value){
  if(!sel)return;
  const sig=JSON.stringify(rows.map(x=>[String(x.id),String(x.name||x.id)]));
  if(sel.dataset.yvReceptionScopeSig!==sig){
    sel.innerHTML='<option value="">'+esc(placeholder)+'</option>'+
      rows.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||x.id)+'</option>').join('');
    sel.dataset.yvReceptionScopeSig=sig;
  }
  const desired=rows.some(x=>String(x.id)===String(value||''))?String(value):'';
  if(sel.value!==desired)sel.value=desired;
}
function currentLoc(){
  const L=allowedLocations();
  const candidates=[
    window.currentSession?.location,
    localStorage.getItem('yardivo_active_location_v583'),
    localStorage.getItem('yardivo_last_location'),
    localStorage.getItem('yardivo_selected_location')
  ].map(x=>String(x||'')).filter(Boolean);
  return candidates.find(v=>L.some(x=>String(x.id)===v))||String(L[0]?.id||'');
}
function currentWh(loc){
  const W=allowedWarehouses(loc);
  const candidates=[
    window.activeWarehouse,
    window.YardivoAppStateV583?.warehouse?.(),
    localStorage.getItem('yardivo_active_warehouse_v583'),
    localStorage.getItem('studenac_active_warehouse')
  ].map(x=>String(x||'')).filter(Boolean);
  return candidates.find(v=>W.some(x=>String(x.id)===v))||String(W[0]?.id||'');
}

/* Only persist when the user actually changes context or when current context is invalid.
   Never persist from every render/apply cycle. */
function persistContext(loc,wh,{emit=true}={}){
  if(internalContextWrite)return;
  internalContextWrite=true;
  try{
    const currentSessionLoc=String(window.currentSession?.location||'');
    const currentWh=String(window.activeWarehouse||window.YardivoAppStateV583?.warehouse?.()||'');

    if(window.currentSession&&currentSessionLoc!==String(loc||''))window.currentSession.location=loc||null;
    if(currentWh!==String(wh||''))window.activeWarehouse=wh||'';

    if(loc){
      if(localStorage.getItem('yardivo_active_location_v583')!==loc)localStorage.setItem('yardivo_active_location_v583',loc);
      if(localStorage.getItem('yardivo_last_location')!==loc)localStorage.setItem('yardivo_last_location',loc);
      if(localStorage.getItem('yardivo_selected_location')!==loc)localStorage.setItem('yardivo_selected_location',loc);
    }
    if(wh){
      if(localStorage.getItem('yardivo_active_warehouse_v583')!==wh)localStorage.setItem('yardivo_active_warehouse_v583',wh);
      if(localStorage.getItem('studenac_active_warehouse')!==wh)localStorage.setItem('studenac_active_warehouse',wh);
    }

    if(emit){
      if(String(window.YardivoAppStateV583?.location?.()||'')!==String(loc||''))window.YardivoAppStateV583?.setLocation?.(loc||'');
      if(String(window.YardivoAppStateV583?.warehouse?.()||'')!==String(wh||''))window.YardivoAppStateV583?.setWarehouse?.(wh||'');
      window.persistCurrentSession?.();
    }
  }catch(_){}
  finally{internalContextWrite=false}
}

function enforceScope(){
  if(!isReception())return;

  const L=allowedLocations(),loc=currentLoc(),W=allowedWarehouses(loc),wh=currentWh(loc);
  const sig=JSON.stringify({
    role:'reception',
    loc,
    wh,
    L:L.map(x=>[x.id,x.name]),
    W:W.map(x=>[x.id,x.name])
  });

  /* If nothing changed, don't touch dropdown DOM/status text again. */
  if(sig===lastUiSig)return;
  lastUiSig=sig;

  const hs=$('homeLocationSelect'),gl=$('globalLocationV583'),gw=$('globalWarehouse');
  fill(hs,L,'Odaberi lokaciju...',loc);
  fill(gl,L,'Odaberi lokaciju...',loc);
  fill(gw,W,loc?'Odaberi skladište...':'Prvo odaberi lokaciju',wh);

  [hs,gl].forEach(s=>{if(s&&s.disabled!==(L.length<=1))s.disabled=L.length<=1});
  if(gw&&gw.disabled!==(W.length<=1))gw.disabled=W.length<=1;

  /* Repair an out-of-scope context once, without creating a sync/event loop. */
  const sessLoc=String(window.currentSession?.location||'');
  const activeWh=String(window.activeWarehouse||window.YardivoAppStateV583?.warehouse?.()||'');
  if(sessLoc!==loc||activeWh!==wh)persistContext(loc,wh,{emit:false});

  const st=$('homeLocationStatus'),ttl=$('homeSelectedLocation');
  const name=L.find(x=>String(x.id)===loc)?.name||'';
  if(st&&name&&st.textContent!=='Odabrano: '+name){
    st.textContent='Odabrano: '+name;st.classList.add('ready');
  }
  if(ttl&&name&&ttl.textContent!==name.toUpperCase()){
    ttl.textContent=name.toUpperCase();ttl.classList.add('selected');
  }
}
function hideRequestedSettings(){
  if(!isReception())return;
  const directIds=['masterUserAdmin','yardivoAddUserRestoredBtnV583','yardivoOpenUsersV583','yvAddSupplierMasterBtnV583','qrMobileSettingsPanel','yardivoDevTotalResetV583'];
  directIds.forEach(id=>{
    const x=$(id);
    if(x&&x.style.display!=='none'){x.hidden=true;x.style.setProperty('display','none','important')}
  });
  document.querySelectorAll('#settings .danger-zone').forEach(x=>{
    if(x.style.display!=='none')x.style.setProperty('display','none','important');
  });
  document.querySelectorAll('#settings button').forEach(b=>{
    const t=String(b.textContent||'').trim().toLowerCase();
    if(t.includes('dodaj korisnika')||t.includes('dodaj dobavljača')||t.includes('dodaj dobavljaca')||t.includes('reset yardivo')){
      if(b.style.display!=='none'){b.hidden=true;b.style.setProperty('display','none','important')}
    }
  });
}
function hideViews(){
  const rec=isReception();
  document.body.classList.toggle('yv-role-reception-v583',rec);
  if(!rec)return;

  // RoleVisibility is the canonical owner of nav/home-card display.
  // The Reception scope module only manages location and warehouse selection.
  if(window.YardivoRoleVisibility?.owner!=='modules/auth/role-visibility.js'){
  document.querySelectorAll('[data-view]').forEach(el=>{
    if(HIDDEN_VIEWS.has(String(el.dataset.view||''))&&el.style.display!=='none'){
      el.classList.add('role-hidden');el.hidden=true;el.style.setProperty('display','none','important');
    }
  });
  document.querySelectorAll('[data-home-target]').forEach(el=>{
    if(HIDDEN_VIEWS.has(String(el.dataset.homeTarget||''))&&el.style.display!=='none'){
      el.classList.add('role-hidden');el.hidden=true;el.style.setProperty('display','none','important');
    }
  });
  }
  HIDDEN_VIEWS.forEach(id=>{
    const v=$(id);
    if(v&&v.classList.contains('view')&&v.classList.contains('active')){
      v.classList.remove('active');v.setAttribute('aria-hidden','true');
    }
  });
}
function apply(){
  if(!isReception())return;
  hideViews();
  enforceScope();
}
function scheduleApply(delay=60){
  clearTimeout(applyTimer);
  applyTimer=setTimeout(()=>{applyTimer=0;apply()},delay);
}

/* User-driven context changes only. */
document.addEventListener('change',e=>{
  if(!isReception()||internalContextWrite)return;
  const id=e.target?.id;
  if(!['homeLocationSelect','globalLocationV583','globalWarehouse'].includes(id))return;

  const L=allowedLocations();
  if(id==='homeLocationSelect'||id==='globalLocationV583'){
    const loc=String(e.target.value||'');
    if(!L.some(x=>String(x.id)===loc)){
      e.preventDefault();e.stopImmediatePropagation();lastUiSig='';scheduleApply(0);return;
    }
    const W=allowedWarehouses(loc),wh=String(W[0]?.id||'');
    lastUiSig='';
    persistContext(loc,wh,{emit:true});
    scheduleApply(0);
  }else{
    const loc=currentLoc(),W=allowedWarehouses(loc),wh=String(e.target.value||'');
    if(!W.some(x=>String(x.id)===wh)){
      e.preventDefault();e.stopImmediatePropagation();lastUiSig='';scheduleApply(0);return;
    }
    lastUiSig='';
    persistContext(loc,wh,{emit:true});
    scheduleApply(0);
  }
},true);

/* Login/master changes can affect scope. Avoid the high-frequency data-synced/context-changed hooks. */
window.addEventListener('yardivo:login',()=>{lastUiSig='';scheduleApply(0)});
window.addEventListener('yardivo:master-data-ready',()=>{lastUiSig='';scheduleApply(40)});
window.addEventListener('yardivo:master-data-changed',()=>{lastUiSig='';scheduleApply(40)});

/* Settings-only cleanup runs only when Settings is opened, not on every sync. */
document.addEventListener('click',e=>{
  if(!isReception())return;
  if(e.target?.closest?.('[data-view="settings"],[data-home-target="settings"],#navSettings')){
    setTimeout(hideRequestedSettings,40);
  }
},true);

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>scheduleApply(300),{once:true});
}else scheduleApply(100);
window.addEventListener('load',()=>scheduleApply(180),{once:true});

window.YardivoReceptionUiScopeCleanV583={
  apply:()=>{lastUiSig='';apply()},
  allowedLocations,
  allowedWarehouses
};
window.YARDIVO_DEV_BUILD='20260919-dev-v5.8.3-reception-ui-scope-smooth';
})();
