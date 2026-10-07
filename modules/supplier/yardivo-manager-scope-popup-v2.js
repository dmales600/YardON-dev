
(function(){
'use strict';
if(window.__YARDIVO_MANAGER_SCOPE_POPUP_V2__)return;
window.__YARDIVO_MANAGER_SCOPE_POPUP_V2__=true;

const MASTER='yardivo_master_data_registry_v583';
const ALLOWED=new Set(['homeMenu','dashboard','controlTower','aiOperations','analytics','myYard','suppliers','overview','dailyMap','weeklyMap']);

function session(){try{return (typeof currentSession!=='undefined'?currentSession:window.currentSession)||null}catch(_){return window.currentSession||null}}
function role(){let r=String(session()?.role||session()?.app_role||'').trim().toLowerCase();if(r==='management'||r==='voditelj')r='manager';return r}
function isManager(){return role()==='manager'}
function aiControlEnabled(){try{const c=JSON.parse(localStorage.getItem('yardivo_auto_replan_cfg_v1')||'{}')||{};return c.enabled===true&&String(c.mode||'').toUpperCase()!=='PAUSED'}catch(_){return false}}
function menuAllowed(id){return ALLOWED.has(String(id||''))&&(String(id||'')!=='aiOperations'||aiControlEnabled())}
function canManageRamps(){return ['admin','manager'].includes(role())}
function master(){try{const d=JSON.parse(localStorage.getItem(MASTER)||'{}');return {locations:Array.isArray(d.locations)?d.locations:[],warehouses:Array.isArray(d.warehouses)?d.warehouses:[],...d}}catch(_){return{locations:[],warehouses:[]}}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function activeLocations(d=master()){return d.locations.filter(x=>x&&x.active!==false)}
function activeWarehouses(d=master()){return d.warehouses.filter(x=>x&&x.active!==false)}
function assignedWarehouseIds(d=master()){
 const s=session();if(!s)return[];
 const ids=new Set((Array.isArray(s.warehouses)?s.warehouses:[]).map(String));
 return activeWarehouses(d).filter(w=>ids.has(String(w.id))).map(w=>String(w.id));
}
function assignedLocationIds(d=master()){
 const s=session();if(!s)return[];
 const fixed=String(s.location||'').trim();
 const rows=activeLocations(d);
 if(fixed&&fixed!=='ALL'&&rows.some(x=>String(x.id)===fixed))return[fixed];
 const explicit=Array.isArray(s.locations)?s.locations.map(String):[];
 if(explicit.length)return rows.filter(x=>explicit.includes(String(x.id))).map(x=>String(x.id));
 const whIds=new Set(assignedWarehouseIds(d));
 const ids=new Set(activeWarehouses(d).filter(w=>whIds.has(String(w.id))).map(w=>String(w.location_id)));
 return rows.filter(x=>ids.has(String(x.id))).map(x=>String(x.id));
}
function locationName(id,d=master()){return activeLocations(d).find(x=>String(x.id)===String(id))?.name||String(id||'')}
function warehouseName(id,d=master()){return activeWarehouses(d).find(x=>String(x.id)===String(id))?.name||String(id||'')}
function persistSession(){
 const s=session();if(!s)return;
 try{window.currentSession=s;if(typeof currentSession!=='undefined')currentSession=s}catch(_){}
 try{
   if(s.rememberMe)localStorage.setItem('yardivo_remembered_session',JSON.stringify(s));
   else sessionStorage.setItem('studenac_demo_session',JSON.stringify(s));
 }catch(_){}
}
function setRoleAttrs(){
 if(!isManager())return;
 document.body.dataset.yardivoRole='manager';
 document.documentElement.dataset.yardivoRole='manager';
 document.body.classList.add('yv-role-manager-v2');
}

function setTextNode(button,label){
 if(!button)return;
 const text=[...button.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
 if(text)text.nodeValue=' '+label+' ';
 else button.appendChild(document.createTextNode(' '+label));
}
function enforceMenu(){
 if(!isManager())return;
 setRoleAttrs();
 const labels={homeMenu:'Početni izbornik',dashboard:'Nadzorna ploča',controlTower:'Control Tower',analytics:'Analytics',myYard:'My Yard',suppliers:'Dobavljači',overview:'Overview dobavljača',dailyMap:'Dnevna mapa',weeklyMap:'Tjedna mapa'};
 document.querySelectorAll('.nav-btn[data-view]').forEach(b=>{
   const id=String(b.dataset.view||''),ok=menuAllowed(id);
   b.classList.toggle('role-hidden',!ok);
   b.style.setProperty('display',ok?'flex':'none','important');
   b.style.setProperty('visibility',ok?'visible':'hidden','important');
   if(ok&&labels[id])setTextNode(b,labels[id]);
 });
 document.querySelectorAll('#homeMenuGrid [data-home-target]').forEach(card=>{
   let id=String(card.dataset.homeTarget||'');if(id==='controltower')id='controlTower';
   const ok=menuAllowed(id)&&id!=='homeMenu';
   card.classList.toggle('role-hidden',!ok);
   card.style.setProperty('display',ok?'block':'none','important');
   card.style.setProperty('visibility',ok?'visible':'hidden','important');
   card.style.setProperty('opacity',ok?'1':'0','important');
 });
 const grid=document.getElementById('homeMenuGrid');
 if(grid){grid.style.setProperty('display','grid','important');grid.style.setProperty('visibility','visible','important');grid.style.setProperty('opacity','1','important')}
 document.documentElement.classList.add('yardivo-home-ready');
}

function enforceScope(){
 if(!isManager())return;
 setRoleAttrs();
 const d=master(),s=session();if(!s)return;
 const locIds=assignedLocationIds(d);
 let loc=String(s.location||'').trim();
 if(!locIds.includes(loc))loc=String(locIds[0]||'');
 if(loc&&s.location!==loc){s.location=loc;persistSession()}
 const whIds=assignedWarehouseIds(d).filter(id=>{
   const w=activeWarehouses(d).find(x=>String(x.id)===String(id));
   return !loc||String(w?.location_id)===loc;
 });
 let wh=String(window.YardivoAppStateV583?.warehouse?.()||window.activeWarehouse||'');
 if(!whIds.includes(wh))wh=String(whIds[0]||'');

 const locRows=activeLocations(d).filter(x=>locIds.includes(String(x.id)));
 const home=document.getElementById('homeLocationSelect');
 if(home){
   const sig=locRows.map(x=>x.id+'|'+x.name).join('¦');
   if(home.dataset.managerScopeSig!==sig){
     home.dataset.managerScopeSig=sig;
     home.innerHTML=locRows.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
   }
   home.value=loc;
   home.disabled=locRows.length<=1;
 }
 const yloc=document.getElementById('yscLocationSelect');
 if(yloc){
   const sig=locRows.map(x=>x.id+'|'+x.name).join('¦');
   if(yloc.dataset.managerScopeSig!==sig){
     yloc.dataset.managerScopeSig=sig;
     yloc.innerHTML=locRows.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
   }
   yloc.value=loc;
   yloc.disabled=locRows.length<=1;
 }

 const whRows=activeWarehouses(d).filter(x=>whIds.includes(String(x.id)));
 for(const sel of [document.getElementById('yscWarehouseSelect'),document.getElementById('globalWarehouse')]){
   if(!sel)continue;
   const sig=whRows.map(x=>x.id+'|'+x.name).join('¦');
   if(sel.dataset.managerScopeSig!==sig){
     sel.dataset.managerScopeSig=sig;
     sel.innerHTML=whRows.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
   }
   if(whRows.some(x=>String(x.id)===wh))sel.value=wh;else if(whRows.length)sel.value=String(whRows[0].id);
   sel.disabled=whRows.length<=1;
 }
 const status=document.getElementById('homeLocationStatus');
 if(status&&loc){status.textContent='Dodijeljena lokacija: '+locationName(loc,d);status.classList.add('ready')}
 const big=document.getElementById('homeSelectedLocation');
 if(big&&loc){big.textContent=locationName(loc,d).toUpperCase();big.classList.add('selected')}
 const info=document.getElementById('globalWarehouseInfo');
 if(info)info.textContent=wh?`${locationName(loc,d)} · ${warehouseName(wh,d)}`:locationName(loc,d);

 try{
   if(loc&&String(window.YardivoAppStateV583?.location?.()||'')!==loc)window.YardivoAppStateV583?.setLocation?.(loc);
   if(wh&&String(window.YardivoAppStateV583?.warehouse?.()||'')!==wh)window.YardivoAppStateV583?.setWarehouse?.(wh);
 }catch(_){}
 try{window.activeWarehouse=wh;if(typeof activeWarehouse!=='undefined')activeWarehouse=wh}catch(_){}
}

function renderView(id){
 const calls={
  dashboard:['renderDashboardSimple','renderDashboard'],
  controlTower:['renderControlTower'],
  analytics:['renderYardivoAnalytics'],
  myYard:['renderYard','renderRampe','renderDockOverview'],
  suppliers:['renderSupplierProfiles'],
  overview:['renderOverview'],
  dailyMap:['renderDailyMap'],
  weeklyMap:['renderWeeklyMap']
 };
 (calls[id]||[]).forEach(n=>{try{if(typeof window[n]==='function')window[n]()}catch(_){}});
}
function openView(raw){
 if(!isManager())return;
 let id=String(raw||'');if(id==='controltower')id='controlTower';
 if(!ALLOWED.has(id))id='homeMenu';
 closePopup();
 enforceScope();enforceMenu();

 document.body.classList.toggle('home-menu-mode',id==='homeMenu');
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
 const target=document.getElementById(id);
 if(target)target.classList.add('active');

 document.querySelectorAll('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',String(b.dataset.view)===id));
 const titles={homeMenu:'Početni izbornik',dashboard:'Nadzorna ploča',controlTower:'Control Tower',analytics:'Analytics',myYard:'My Yard',suppliers:'Dobavljači',overview:'Overview dobavljača',dailyMap:'Dnevna mapa',weeklyMap:'Tjedna mapa'};
 const pt=document.getElementById('pageTitle');if(pt)pt.textContent=titles[id]||'YARDIVO';
 if(id==='homeMenu'){
   try{updateHomeLocationUI?.()}catch(_){}
   enforceScope();enforceMenu();
 }else{
   /* Absolute guarantee against the old Home leaking above the selected section. */
   const home=document.getElementById('homeMenu');if(home)home.classList.remove('active');
   renderView(id);
 }
 try{window.scrollTo(0,0);document.querySelector('.main')?.scrollTo?.(0,0)}catch(_){}
 try{window.dispatchEvent(new CustomEvent('yardivo:view-opened',{detail:{view:id,source:'manager-v2'}}))}catch(_){}
}

/* ---------------- Ramp popup content ---------------- */
function saveMaster(d,reason){
 localStorage.setItem(MASTER,JSON.stringify(d));
 try{window.YardivoMasterDataV583?.save?.(JSON.parse(JSON.stringify(d)))}catch(_){}
 try{window.YardivoSupabase?.flushQueue?.()}catch(_){}
 window.dispatchEvent(new CustomEvent('yardivo:master-data-changed',{detail:{source:'manager-ramp-settings-v2',reason}}));
}
function ensureRampSettings(){
 let p=document.getElementById('yardivoManagerRampSettingsV1');
 if(!p){
   p=document.createElement('section');p.className='panel';p.id='yardivoManagerRampSettingsV1';
   p.innerHTML=`<div class="panel-head"><div><h2>UPRAVLJAJ RAMPAMA</h2><small>Voditelj upravlja samo rampama skladišta dodijeljenih njegovom accountu</small></div></div>
   <div class="ymrs-body"><div class="ymrs-wh"><label>SKLADIŠTE<select id="ymrsWarehouse"></select></label></div><div class="ymrs-list" id="ymrsList"></div></div>`;
   document.body.appendChild(p);
   p.querySelector('#ymrsWarehouse').addEventListener('change',renderRamps);
   p.addEventListener('click',e=>{
     const b=e.target.closest('[data-ymrs-toggle]');if(!b||!canManageRamps())return;
     const [wid,num]=String(b.dataset.ymrsToggle||'').split(':');
     const d=master(),allowed=new Set(assignedWarehouseIds(d));if(role()==='manager'&&!allowed.has(wid))return;
     const w=(d.warehouses||[]).find(x=>String(x.id)===wid);if(!w)return;
     w.ramp_settings=Array.isArray(w.ramp_settings)?w.ramp_settings:[];
     let rr=w.ramp_settings.find(x=>Number(x.number)===Number(num));
     if(!rr){rr={number:Number(num),name:'Rampa '+num,active:true,from:'',to:'',pallets_per_hour:null,max_pallets:null};w.ramp_settings.push(rr)}
     rr.active=rr.active===false;
     saveMaster(d,'ramp.toggle');
     renderRamps();
   });
 }
 renderRamps();return p;
}
function renderRamps(){
 const p=document.getElementById('yardivoManagerRampSettingsV1');if(!p)return;
 const d=master();
 const allowed=role()==='admin'
   ?new Set(activeWarehouses(d).map(w=>String(w.id)))
   :new Set(assignedWarehouseIds(d));
 const rows=activeWarehouses(d).filter(w=>allowed.has(String(w.id)));
 const sel=p.querySelector('#ymrsWarehouse'),prev=sel?.value||'';
 if(sel){
   sel.innerHTML=rows.map(w=>`<option value="${esc(w.id)}">${esc(w.name||w.id)}</option>`).join('');
   if(rows.some(w=>String(w.id)===prev))sel.value=prev;
 }
 const w=rows.find(x=>String(x.id)===String(sel?.value||''))||rows[0],host=p.querySelector('#ymrsList');
 if(!host)return;
 if(!w){host.innerHTML='<div class="overview-empty">Nema dodijeljenih skladišta.</div>';return}
 const count=Math.max(Number(w.ramps)||0,...(Array.isArray(w.ramp_settings)?w.ramp_settings.map(x=>Number(x.number)||0):[0]));
 if(!count){host.innerHTML='<div class="overview-empty">Za ovo skladište nema kreiranih rampi.</div>';return}
 w.ramp_settings=Array.isArray(w.ramp_settings)?w.ramp_settings:[];
 host.innerHTML=Array.from({length:count},(_,i)=>i+1).map(n=>{
   const rr=w.ramp_settings.find(x=>Number(x.number)===n),on=rr?.active!==false,name=rr?.name||('Rampa '+n);
   return `<div class="ymrs-row"><strong>${esc(name)}</strong><span class="ymrs-state ${on?'':'off'}">${on?'ON':'OFF'}</span><button type="button" class="ymrs-toggle ${on?'turn-off':'turn-on'}" data-ymrs-toggle="${esc(w.id)}:${n}">${on?'ISKLJUČI':'UKLJUČI'}</button></div>`;
 }).join('');
}

/* ---------------- Dedicated popup ---------------- */
let moved=null;
function ensurePopup(){
 let p=document.getElementById('yardivoManagerPopupV2');
 if(!p){
   p=document.createElement('div');p.id='yardivoManagerPopupV2';
   p.innerHTML=`<div class="ymp-card" role="dialog" aria-modal="true"><div class="ymp-head"><div><h2 id="ympTitle">POSTAVKE</h2><small id="ympSub"></small></div><button type="button" class="ymp-close" aria-label="Zatvori">×</button></div><div class="ymp-body" id="ympBody"></div></div>`;
   document.body.appendChild(p);
   p.addEventListener('click',e=>{if(e.target===p||e.target.closest('.ymp-close'))closePopup()});
 }
 return p;
}
function restoreMoved(){
 if(!moved)return;
 try{
   if(moved.marker?.parentNode)moved.marker.parentNode.insertBefore(moved.node,moved.marker);
   moved.marker?.remove();
 }catch(_){}
 moved=null;
}
function closePopup(){
 const p=document.getElementById('yardivoManagerPopupV2');if(p)p.classList.remove('open');
 restoreMoved();
}
function openPopup(kind){
 if(!isManager())return;
 closePopup();
 const p=ensurePopup(),body=p.querySelector('#ympBody'),title=p.querySelector('#ympTitle'),sub=p.querySelector('#ympSub');
 let node=null;
 if(kind==='holidays'){
   node=document.getElementById('yardivoNonWorkingDaysSettings');
   if(title)title.textContent='NERADNI DANI';
   if(sub)sub.textContent='Iste postavke neradnih dana koje koristi Admin';
   try{renderHolidayAdmin?.()}catch(_){}
 }else{
   node=ensureRampSettings();
   if(title)title.textContent='UPRAVLJAJ RAMPAMA';
   if(sub)sub.textContent='Samo skladišta dodijeljena ovom Voditelju';
 }
 if(!node||!body)return;
 const marker=document.createComment('yardivo-manager-popup-origin');
 node.parentNode?.insertBefore(marker,node);
 moved={node,marker};
 body.appendChild(node);
 node.style.setProperty('display','block','important');
 p.classList.add('open');
 if(kind==='holidays'){try{renderHolidayAdmin?.();enableDatePickers?.()}catch(_){}}
 if(kind==='ramps')renderRamps();
}

/* Right settings drawer: ONLY two manager shortcuts. */
function patchDrawer(){
 /* Superseded by YardivoManagerFinalV4.
    Keep legacy function harmless so it cannot create duplicate shortcuts. */
 return;
}

/* Manager owns navigation so legacy handlers cannot leave two views active. */
document.addEventListener('click',e=>{
 if(!isManager())return;
 const setting=e.target.closest?.('[data-yv-manager-setting]');
 if(setting){
   e.preventDefault();e.stopImmediatePropagation();
   document.body.classList.remove('yv-right-settings-open');
   openPopup(setting.dataset.yvManagerSetting);
   return;
 }
 const nav=e.target.closest?.('.nav-btn[data-view]');
 if(nav){
   e.preventDefault();e.stopImmediatePropagation();
   openView(nav.dataset.view);
   return;
 }
 const card=e.target.closest?.('#homeMenuGrid [data-home-target]');
 if(card){
   e.preventDefault();e.stopImmediatePropagation();
   openView(card.dataset.homeTarget);
   return;
 }
},true);

document.addEventListener('change',e=>{
 if(!isManager())return;
 if(['homeLocationSelect','yscLocationSelect'].includes(e.target?.id||'')){
   const allowed=assignedLocationIds(master());
   if(!allowed.includes(String(e.target.value||'')))e.target.value=String(allowed[0]||'');
   enforceScope();
 }
 if(['yscWarehouseSelect','globalWarehouse'].includes(e.target?.id||'')){
   const allowed=assignedWarehouseIds(master());
   if(!allowed.includes(String(e.target.value||'')))e.target.value=String(allowed[0]||'');
   enforceScope();
 }
},true);

function refresh(){
 if(!isManager()){
   closePopup();
   return;
 }
 setRoleAttrs();enforceMenu();enforceScope();patchDrawer();
 /* If legacy code ever left Home active while another view is active, remove it now. */
 if(!document.body.classList.contains('home-menu-mode')){
   const h=document.getElementById('homeMenu');if(h)h.classList.remove('active');
 }
}

/* Immediate, then event-driven. No multi-second timer is needed. */
window.addEventListener('yardivo:login',()=>{refresh();queueMicrotask(refresh)});
window.addEventListener('yardivo:data-synced',()=>queueMicrotask(refresh));
window.addEventListener('yardivo:master-data-changed',()=>queueMicrotask(refresh));
window.addEventListener('yardivo:context-changed',()=>queueMicrotask(enforceScope));
document.addEventListener('DOMContentLoaded',refresh,{once:true});
window.addEventListener('load',refresh,{once:true});

/* Watch only UI surfaces that legacy renderers may rebuild. */
const observer=new MutationObserver(ms=>{
 if(!isManager())return;
 if(ms.some(m=>m.target?.closest?.('#homeMenu,#yardivoStableContextV583,#yardivoRightSettingsDrawer,.nav'))){
   queueMicrotask(refresh);
 }
});
document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{childList:true,subtree:true}),{once:true});

/* Settings page is NOT a manager destination anymore. */
window.yardivoManagerSectionAllowed=function(section){
 if(!isManager())return null;
 return ALLOWED.has(String(section||''));
};
window.YardivoManagerFinalV2={refresh,openView,openHolidays:()=>openPopup('holidays'),openRamps:()=>openPopup('ramps'),scope:()=>({locations:assignedLocationIds(master()),warehouses:assignedWarehouseIds(master())})};

refresh();
})();
