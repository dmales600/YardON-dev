
(function(){
'use strict';
const MATRIX={
 admin:'ALL',
 manager:new Set(['homeMenu','dashboard','controlTower','aiOperations','analytics','myYard','suppliers','overview','dailyMap','weeklyMap']),
 inventory:new Set(['smartReplanning','homeMenu','dashboard','controlTower','aiOperations','suppliers','orderSearch','announcements','supplierRequests','dailyMap','weeklyMap','overview','incidents','documentArchive','unannounced','epal','myYard','reports','settings']),
 reception:new Set(['smartReplanning','homeMenu','aiOperations','receiving','dailyMap','weeklyMap','suppliers','myYard','operations','incidents','incidentArchive','documentArchive','settings','unannounced','epal','liveYard']),
 gate:new Set(['homeMenu','checkin','unannounced','myYard','docks'])
};
function norm(r){
 r=String(r||'').toLowerCase().trim();
 if(r==='porta'||r==='portir')return'gate';
 if(r==='prijam')return'reception';
 if(r==='zalihe'||r.includes('zalih'))return'inventory';
 if(r==='management'||r==='voditelj')return'manager';
 return r;
}
function role(){try{return norm(window.currentSession?.role||currentSession?.role)}catch(_){return''}}
function managerAccess(){
 try{
   const u=String(window.currentSession?.username||window.currentSession?.user||'').trim().toLowerCase();
   if(!u)return {sections:[]};
   const raw=localStorage.getItem('yardivo_manager_access_'+u);
   const x=raw?JSON.parse(raw):{};
   return x&&typeof x==='object'?x:{sections:[]};
 }catch(_){return {sections:[]}}
}
function allowed(v){
 if(v==='aiOperations')return false;
 const r=role();
 if(r==='admin')return true;
 if(r==='manager'){
   const defaults=MATRIX.manager;
   const a=managerAccess();
   if(Array.isArray(a.sections)&&a.sections.length){
     return a.sections.includes(v)||v==='homeMenu';
   }
   return defaults.has(v);
 }
 return !!MATRIX[r]?.has(v);
}

function setChromeForView(view){
 const home=view==='homeMenu';
 document.body.classList.toggle('home-menu-mode',home);
 if(!home){
   document.body.classList.remove('yardivo-home-only');
 }
}

function apply(){
 const r=role();if(!r)return;
 if(r==='manager'){
   window.YardivoManagerFinalV4?.syncMenu?.();
   return;
 }
 // Central RoleVisibility owns sidebar/home display. This controller owns routing.
 if(r!=='manager'&&window.YardivoRoleVisibility?.owner==='modules/auth/role-visibility.js'){
   window.YardivoRoleVisibility.apply();
   return;
 }
 document.body.dataset.yardivoRole=r;
 document.documentElement.dataset.yardivoRole=r;

 document.querySelectorAll('[data-view]').forEach(el=>{
   const ok=allowed(el.dataset.view);
   el.classList.toggle('role-hidden',!ok);
   if(ok){
     el.style.removeProperty('display');
     el.style.removeProperty('visibility');
     el.removeAttribute('hidden');
     el.removeAttribute('aria-disabled');
   }else{
     el.style.setProperty('display','none','important');
   }
 });
 document.querySelectorAll('[data-home-target]').forEach(el=>{
   const ok=allowed(el.dataset.homeTarget);
   el.classList.toggle('role-hidden',!ok);
   if(ok){
     el.style.removeProperty('display');
     el.style.removeProperty('visibility');
     el.removeAttribute('hidden');
     el.removeAttribute('aria-disabled');
     el.style.removeProperty('pointer-events');
   }else{
     el.style.setProperty('display','none','important');
   }
 });

 /* My Yard is available to every production role. */
 if(['admin','inventory','reception','gate'].includes(r)){
   document.querySelectorAll('[data-view="myYard"],[data-home-target="myYard"]').forEach(el=>{
     el.classList.remove('role-hidden');
     el.removeAttribute('hidden');
     el.removeAttribute('aria-disabled');
     el.style.removeProperty('display');
     el.style.removeProperty('visibility');
     el.style.removeProperty('pointer-events');
   });
 }
}

function renderView(view){
 const calls={
   dashboard:['renderDashboardSimple','renderDashboard'],
   receiving:['renderReceiving'],
   smartReplanning:['yardonSmartOpenView'],
   dailyMap:['renderDailyMap'],
   weeklyMap:['renderWeeklyMap'],
   suppliers:['renderSuppliers'],
   checkin:['renderCheckinPro','renderCheckin'],
   docks:['renderDockOverview','renderRampe'],
   operations:['renderOperations'],
   incidents:['renderIncidents'],
   incidentArchive:['renderArchive'],
   overview:['renderOverview'],
   unannounced:['renderUnannouncedComplete'],
   epal:['renderEpal','renderEPAL'],
   controltower:['renderControlTower'],
   controlTower:['renderControlTower'],
   liveYard:['renderLiveYard'],
   settings:['yardivoEnforceSettingsRBAC']
 };
 (calls[view]||[]).forEach(name=>{try{if(typeof window[name]==='function')window[name]()}catch(_){}});
 if(view==='unannounced'){
   try{window.YardivoUnannouncedGateV2?.populateForm?.()}catch(_){}
   try{window.YardivoUnannouncedSection?.render?.()}catch(_){}
 }
 if(view==='myYard'){
   setTimeout(()=>{
     try{window.YardivoMyYardWebGL?.boot?.()}catch(_){}
     try{window.YardivoMyYardWebGL?.refresh?.()}catch(_){}
     try{window.YardivoMyYardMode?.set?.(window.YardivoMyYardMode.current?.()||'3d')}catch(_){}
     try{window.__YARDIVO_MYYARD_ENGINE__?.resize?.()}catch(_){}
   },30);
 }
 if(view==='supplierRequests'){
   setTimeout(()=>{try{window.YardivoSupplierInboxStableFinalV583?.refresh?.(true)}catch(_){}},20);
 }
}

function activate(view){
 if(!allowed(view))return false;
 const target=document.getElementById(view);
 if(!target)return false;

 if(role()==='manager'&&typeof window.YardivoManagerFinalV4?.forceView==='function'){
   window.YardivoManagerFinalV4.forceView(view);
   apply();
   try{window.dispatchEvent(new CustomEvent('yardivo:view-opened',{detail:{view,role:'manager'}}))}catch(_){}
   return true;
 }

 setChromeForView(view);

 /* Exactly one application view may be visible at any time.
    Reception/Gate previously depended on legacy CSS/handlers and could leave
    Home visible above the selected section. Make the canonical owner explicit. */
 const strictSingleView=['reception','gate'].includes(role());
 document.querySelectorAll('.view').forEach(v=>{
   const on=v===target;
   v.classList.toggle('active',on);
   v.setAttribute('aria-hidden',on?'false':'true');
   if(on){
     v.removeAttribute('hidden');
     if(strictSingleView||role()==='manager')v.style.setProperty('display','block','important');
     else v.style.removeProperty('display');
   }else{
     if(strictSingleView||role()==='manager')v.style.setProperty('display','none','important');
     else v.style.removeProperty('display');
   }
 });
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));

 if(view==='homeMenu'){
   target.style.setProperty('display','block','important');
 }else if(!strictSingleView){
   target.style.removeProperty('display');
 }

 /* One post-paint idempotent repair absorbs late legacy repaint attempts
    without starting a render loop. */
 if(strictSingleView)requestAnimationFrame(()=>{
   document.querySelectorAll('.view').forEach(v=>{
     const on=v===target;
     if(v.classList.contains('active')!==on)v.classList.toggle('active',on);
     const wanted=on?'block':'none';
     if(v.style.getPropertyValue('display')!==wanted||v.style.getPropertyPriority('display')!=='important'){
       v.style.setProperty('display',wanted,'important');
     }
     v.setAttribute('aria-hidden',on?'false':'true');
   });
   document.body.classList.toggle('home-menu-mode',view==='homeMenu');
 });

 apply();
 renderView(view);

 try{window.dispatchEvent(new CustomEvent('yardivo:view-opened',{detail:{view,role:role()}}))}catch(_){}
 return true;
}

/* Capture-phase owner for both sidebar and home cards.
   It no longer leaves body.home-menu-mode active when opening an app section. */
document.addEventListener('click',e=>{
 const el=e.target.closest?.('[data-view],[data-home-target]');
 if(!el||!role())return;
 const view=el.dataset.view||el.dataset.homeTarget||'';
 if(!allowed(view))return;
 e.preventDefault();
 e.stopPropagation();
 e.stopImmediatePropagation();
 activate(view);
},true);

window.addEventListener('yardivo:login',()=>setTimeout(()=>{
 apply();
 const active=document.querySelector('.view.active');
 if(active)setChromeForView(active.id);
},30));
/* Stable sidebar: RBAC is not re-painted on every data sync. */
window.addEventListener('load',()=>setTimeout(()=>{
 apply();
 const active=document.querySelector('.view.active');
 if(active)setChromeForView(active.id);
},900),{once:true});



/* Preserve role-specific order without reparenting DOM on every click.
   Visibility is enforced by modules/auth/role-visibility.js. */
function reorderSidebarForRole(requiredRole,order){
 if(role()!==requiredRole)return;
 const buttons=[...document.querySelectorAll('.nav-btn[data-view]')];
 const parent=buttons[0]?.parentElement;if(!parent)return;
 const byView=new Map(buttons.filter(x=>x.parentElement===parent).map(x=>[x.dataset.view,x]));
 const expected=order.filter(id=>byView.has(id));
 const actual=buttons.filter(x=>x.parentElement===parent&&expected.includes(x.dataset.view)).map(x=>x.dataset.view);
 if(expected.length===actual.length&&expected.every((id,i)=>id===actual[i]))return;
 expected.forEach(id=>parent.appendChild(byView.get(id)));
}
function stabilizeGateSidebar(){
 reorderSidebarForRole('gate',['homeMenu','checkin','unannounced','myYard','docks']);
}
function stabilizeInventorySidebar(){
 reorderSidebarForRole('inventory',['homeMenu','dashboard','controlTower','aiOperations','suppliers','orderSearch','announcements','supplierRequests','dailyMap','weeklyMap','overview','incidents','documentArchive','unannounced','epal','myYard','reports','settings']);
}

const baseApply=apply;
apply=function(){baseApply();stabilizeInventorySidebar();stabilizeGateSidebar()};
apply();
window.YardivoRoleStableFinal={apply,open:activate,allowed,matrix:MATRIX,stabilizeInventorySidebar,stabilizeGateSidebar};
})();
