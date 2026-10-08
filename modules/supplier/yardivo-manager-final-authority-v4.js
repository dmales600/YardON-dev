
(function(){
'use strict';
if(window.__YARDIVO_MANAGER_FINAL_AUTHORITY_V4__)return;
window.__YARDIVO_MANAGER_FINAL_AUTHORITY_V4__=true;

const MASTER='yardivo_master_data_registry_v583';
const ALLOWED=new Set(['homeMenu','dashboard','controlTower','aiOperations','analytics','myYard','suppliers','overview','dailyMap','weeklyMap']);
let applying=false;
let popupMoved=null;
let scheduled=false;

function sess(){try{return window.currentSession||(typeof currentSession!=='undefined'?currentSession:null)||null}catch(_){return window.currentSession||null}}
function role(){
 let r=String(sess()?.role||sess()?.app_role||document.body?.dataset?.yardivoRole||'').trim().toLowerCase();
 if(r==='management'||r==='voditelj')r='manager';
 return r;
}
function isManager(){return role()==='manager'}
function aiControlEnabled(){try{const c=JSON.parse(localStorage.getItem('yardivo_auto_replan_cfg_v1')||'{}')||{};return c.enabled===true&&String(c.mode||'').toUpperCase()!=='PAUSED'}catch(_){return false}}
function managerViewAllowed(raw){
 const id=String(raw||'');
 if(id==='aiOperations'||id==='smartReplanning'||!ALLOWED.has(id))return false;
 if(id==='homeMenu')return true;
 try{
  const u=String(sess()?.username||sess()?.user||'').trim().toLowerCase();
  const raw=u?localStorage.getItem('yardivo_manager_access_'+u):'';
  const a=raw?JSON.parse(raw):null;
  if(Array.isArray(a?.sections)&&a.sections.length)return a.sections.includes(id);
 }catch(_){}
 return true;
}
function md(){
 try{
  const d=JSON.parse(localStorage.getItem(MASTER)||'{}')||{};
  return {locations:Array.isArray(d.locations)?d.locations:[],warehouses:Array.isArray(d.warehouses)?d.warehouses:[]};
 }catch(_){return {locations:[],warehouses:[]}}
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function accountScope(){
 const d=md(),s=sess()||{};
 const locs=d.locations.filter(x=>x&&x.active!==false);
 const whs=d.warehouses.filter(x=>x&&x.active!==false);

 let locIds=Array.isArray(s.locations)?s.locations.map(String).filter(Boolean):[];
 const fixed=String(s.location||'').trim();
 if(!locIds.length&&fixed&&fixed!=='ALL')locIds=[fixed];

 let whIds=Array.isArray(s.warehouses)?s.warehouses.map(String).filter(Boolean):[];
 if(!locIds.length&&whIds.length){
   const set=new Set(whIds);
   locIds=[...new Set(whs.filter(w=>set.has(String(w.id))).map(w=>String(w.location_id)))];
 }

 const allowedLocs=locs.filter(x=>locIds.includes(String(x.id)));
 if(!whIds.length&&s.all_warehouses===true){
   whIds=whs.filter(w=>locIds.includes(String(w.location_id))).map(w=>String(w.id));
 }
 const allowedWhs=whs.filter(w=>whIds.includes(String(w.id))&&locIds.includes(String(w.location_id)));
 return {locs:allowedLocs,whs:allowedWhs,locIds,whIds};
}

function sameOptions(sel,rows){
 if(!sel)return true;
 const current=[...sel.options].map(o=>String(o.value));
 const wanted=rows.map(x=>String(x.id));
 return current.length===wanted.length&&current.every((v,i)=>v===wanted[i]);
}
function fillStrict(sel,rows,value){
 if(!sel)return;
 if(!sameOptions(sel,rows)){
   sel.innerHTML=rows.map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.id)}</option>`).join('');
 }
 const wanted=rows.some(x=>String(x.id)===String(value))?String(value):String(rows[0]?.id||'');
 if(String(sel.value)!==wanted)sel.value=wanted;
 sel.disabled=rows.length<=1;
 sel.dataset.managerScopeV4='1';
}

function enforceAccountScope(){
 if(!isManager()||applying)return;
 applying=true;
 try{
   document.body.dataset.yardivoRole='manager';
   const sc=accountScope(),s=sess()||{};
   const loc=String(sc.locs.some(x=>String(x.id)===String(s.location))?s.location:(sc.locs[0]?.id||''));
   const whState=String(window.YardivoAppStateV583?.warehouse?.()||window.activeWarehouse||'');
   const wh=String(sc.whs.some(x=>String(x.id)===whState)?whState:(sc.whs[0]?.id||''));

   fillStrict(document.getElementById('globalLocationV583'),sc.locs,loc);
   fillStrict(document.getElementById('homeLocationSelect'),sc.locs,loc);
   fillStrict(document.getElementById('yscLocationSelect'),sc.locs,loc);
   fillStrict(document.getElementById('globalWarehouse'),sc.whs,wh);
   fillStrict(document.getElementById('yscWarehouseSelect'),sc.whs,wh);

   if(loc){
     s.location=loc;
     s.locations=sc.locs.map(x=>String(x.id));
     try{
       if(s.rememberMe)localStorage.setItem('yardivo_remembered_session',JSON.stringify(s));
       else sessionStorage.setItem('studenac_demo_session',JSON.stringify(s));
     }catch(_){}
     try{window.currentSession=s;if(typeof currentSession!=='undefined')currentSession=s}catch(_){}
     try{
       if(String(window.YardivoAppStateV583?.location?.()||'')!==loc)window.YardivoAppStateV583?.setLocation?.(loc);
     }catch(_){}
   }
   if(wh){
     try{
       if(String(window.YardivoAppStateV583?.warehouse?.()||'')!==wh)window.YardivoAppStateV583?.setWarehouse?.(wh);
     }catch(_){}
     try{window.activeWarehouse=wh;if(typeof activeWarehouse!=='undefined')activeWarehouse=wh}catch(_){}
   }

   const locName=sc.locs.find(x=>String(x.id)===loc)?.name||loc;
   const whName=sc.whs.find(x=>String(x.id)===wh)?.name||wh;
   const big=document.getElementById('homeSelectedLocation');if(big&&locName)big.textContent=String(locName).toUpperCase();
   const hs=document.getElementById('homeLocationStatus');if(hs&&locName)hs.textContent='Dodijeljena lokacija: '+locName;
   const info=document.getElementById('globalWarehouseInfo');if(info)info.textContent=[locName,whName].filter(Boolean).join(' · ');
 }finally{applying=false}
}

function labelFor(id){
 return ({homeMenu:'POČETNI IZBORNIK',dashboard:'NADZORNA PLOČA',controlTower:'CONTROL TOWER',aiOperations:'AI OPERATIONS',analytics:'ANALYTICS',myYard:'MY YARD',suppliers:'DOBAVLJAČI',overview:'OVERVIEW DOBAVLJAČA',dailyMap:'DNEVNA MAPA',weeklyMap:'TJEDNA MAPA'})[id]||id;
}
function renderTarget(id){
 const names={
   dashboard:['renderDashboardSimple','renderDashboard'],
   controlTower:['renderControlTower'],
   aiOperations:[],
   analytics:['renderYardivoAnalytics'],
   myYard:['renderYard','renderRampe','renderDockOverview'],
   suppliers:['renderSupplierProfiles'],
   overview:['renderOverview'],
   dailyMap:['renderDailyMap'],
   weeklyMap:['renderWeeklyMap']
 };
 (names[id]||[]).forEach(n=>{try{if(typeof window[n]==='function')window[n]()}catch(_){}});
 if(id==='aiOperations'){try{window.YardOnAIOperations?.refresh?.()}catch(_){}}
}
function setVisible(el,shown,display){
 const target=shown?display:'none';
 if(el.style.getPropertyValue('display')!==target||el.style.getPropertyPriority('display')!=='important')
  el.style.setProperty('display',target,'important');
 const visibility=shown?'visible':'hidden';
 if(el.style.getPropertyValue('visibility')!==visibility)
  el.style.setProperty('visibility',visibility,'important');
}
function setRoleClass(el,name,enabled){
 if(el.classList.contains(name)!==enabled)el.classList.toggle(name,enabled);
}
function syncMenu(active=String(document.body.dataset.managerView||'homeMenu')){
 if(!isManager())return;
 document.querySelectorAll('.nav-btn[data-view]').forEach(b=>{
   const id=String(b.dataset.view||''),allowed=managerViewAllowed(id);
   setVisible(b,allowed,'flex');
   setRoleClass(b,'role-hidden',!allowed);
   setRoleClass(b,'active',allowed&&id===active);
 });
 document.querySelectorAll('#homeMenuGrid [data-home-target]').forEach(c=>{
   const id=String(c.dataset.homeTarget||''),allowed=managerViewAllowed(id)&&id!=='homeMenu';
   setVisible(c,allowed,'block');
   setRoleClass(c,'role-hidden',!allowed);
 });
}
function forceView(raw){
 if(!isManager())return;
 let id=String(raw||'homeMenu');if(id==='controltower')id='controlTower';
 if(!managerViewAllowed(id))id='homeMenu';
 const wasCurrent=document.body.dataset.managerView===id&&document.getElementById(id)?.classList.contains('active');
 document.body.dataset.yardivoRole='manager';
 document.body.dataset.managerView=id;
 document.body.classList.toggle('home-menu-mode',id==='homeMenu');
 document.querySelectorAll('.view').forEach(v=>{
   const on=String(v.id)===id;
   v.classList.toggle('manager-force-active',on);
   v.classList.toggle('active',on);
   const display=on?'block':'none';
   if(v.style.getPropertyValue('display')!==display||v.style.getPropertyPriority('display')!=='important')
     v.style.setProperty('display',display,'important');
   if(on&&v.hidden)v.removeAttribute('hidden');
 });
 syncMenu(id);
 const title=document.getElementById('pageTitle');
 const label=labelFor(id);if(title&&title.textContent!==label)title.textContent=label;
 if(!wasCurrent){
   enforceAccountScope();
   if(id!=='homeMenu')renderTarget(id);
   try{window.scrollTo(0,0);document.querySelector('.main')?.scrollTo?.(0,0)}catch(_){}
 }
}

/* -------- popup windows -------- */
function ensurePopup(){
 let p=document.getElementById('yardivoManagerDirectPopupV4');
 if(!p){
   p=document.createElement('div');p.id='yardivoManagerDirectPopupV4';
   p.innerHTML=`<div class="ymdp-card" role="dialog" aria-modal="true">
     <div class="ymdp-head"><div><h2 id="ymdpTitle">POSTAVKE</h2><small id="ymdpSub"></small></div><button type="button" class="ymdp-close">×</button></div>
     <div class="ymdp-body" id="ymdpBody"></div>
   </div>`;
   document.body.appendChild(p);
   p.addEventListener('click',e=>{if(e.target===p||e.target.closest('.ymdp-close'))closePopup()});
 }
 return p;
}
function restorePopupNode(){
 if(!popupMoved)return;
 try{
   if(popupMoved.marker?.parentNode)popupMoved.marker.parentNode.insertBefore(popupMoved.node,popupMoved.marker);
   popupMoved.marker?.remove();
 }catch(_){}
 popupMoved=null;
}
function closePopup(){
 const p=document.getElementById('yardivoManagerDirectPopupV4');if(p)p.classList.remove('open');
 restorePopupNode();
}
function ensureRampPanel(){
 let p=document.getElementById('yardivoManagerRampSettingsV1');
 if(p)return p;
 p=document.createElement('section');p.className='panel';p.id='yardivoManagerRampSettingsV1';
 p.innerHTML=`<div class="panel-head"><div><h2>UPRAVLJAJ RAMPAMA</h2><small>Voditelj vidi samo svoja dodijeljena skladišta</small></div></div>
 <div class="panel-body"><label>SKLADIŠTE<select id="ymrsWarehouse"></select></label><div id="ymrsList" style="display:grid;gap:8px;margin-top:12px"></div></div>`;
 document.body.appendChild(p);
 p.addEventListener('change',e=>{if(e.target?.id==='ymrsWarehouse')renderRampPanel()});
 p.addEventListener('click',e=>{
   const b=e.target.closest('[data-manager-ramp-toggle]');if(!b||!isManager())return;
   const [wid,num]=String(b.dataset.managerRampToggle||'').split(':');
   const sc=accountScope();if(!sc.whIds.includes(wid))return;
   /* Same canonical Master ramp action used by Admin. */
   if(typeof window.YardivoStableMasterV583?.toggleRampActive==='function'){
     window.YardivoStableMasterV583.toggleRampActive(wid,Number(num));
   }else{
     const d=JSON.parse(localStorage.getItem(MASTER)||'{}'),w=(d.warehouses||[]).find(x=>String(x.id)===wid);if(!w)return;
     w.ramp_settings=Array.isArray(w.ramp_settings)?w.ramp_settings:[];
     let rr=w.ramp_settings.find(x=>Number(x.number)===Number(num));
     if(!rr){rr={number:Number(num),name:'Rampa '+num,active:true,from:'',to:'',pallets_per_hour:null,max_pallets:null};w.ramp_settings.push(rr)}
     rr.active=rr.active===false;
     localStorage.setItem(MASTER,JSON.stringify(d));
     try{window.YardivoMasterDataV583?.save?.(JSON.parse(JSON.stringify(d)))}catch(_){}
   }
   try{window.YardivoSupabase?.flushQueue?.()}catch(_){}
   setTimeout(renderRampPanel,30);
 });
 return p;
}
function renderRampPanel(){
 const p=document.getElementById('yardivoManagerRampSettingsV1');if(!p)return;
 const sc=accountScope(),sel=p.querySelector('#ymrsWarehouse'),host=p.querySelector('#ymrsList');
 const prev=String(sel?.value||'');
 if(sel){
   sel.innerHTML=sc.whs.map(w=>`<option value="${esc(w.id)}">${esc(w.name||w.id)}</option>`).join('');
   sel.value=sc.whs.some(w=>String(w.id)===prev)?prev:String(sc.whs[0]?.id||'');
 }
 const d=JSON.parse(localStorage.getItem(MASTER)||'{}'),w=(d.warehouses||[]).find(x=>String(x.id)===String(sel?.value||''));
 if(!host)return;
 if(!w){host.innerHTML='<div class="overview-empty">Nema dodijeljenih skladišta.</div>';return}
 const settings=Array.isArray(w.ramp_settings)?w.ramp_settings:[];
 const count=Math.max(Number(w.ramps)||0,...settings.map(x=>Number(x.number)||0),0);
 host.innerHTML=count?Array.from({length:count},(_,i)=>i+1).map(n=>{
   const rr=settings.find(x=>Number(x.number)===n),on=rr?.active!==false,name=rr?.name||('Rampa '+n);
   return `<div style="display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;padding:10px;border:1px solid #294b5d;border-radius:9px;background:#0b2030">
     <strong>${esc(name)}</strong><span style="font-weight:1000;color:${on?'#70efa2':'#ff9ca4'}">${on?'ON':'OFF'}</span>
     <button type="button" data-manager-ramp-toggle="${esc(w.id)}:${n}">${on?'ISKLJUČI':'UKLJUČI'}</button>
   </div>`;
 }).join(''):'<div class="overview-empty">Za ovo skladište nema kreiranih rampi.</div>';
}
function openPopup(kind){
 if(!isManager())return;
 closePopup();
 const p=ensurePopup(),body=p.querySelector('#ymdpBody'),title=p.querySelector('#ymdpTitle'),sub=p.querySelector('#ymdpSub');
 let node=null;
 if(kind==='holidays'){
   node=document.getElementById('yardivoNonWorkingDaysSettings');
   title.textContent='NERADNI DANI';
   sub.textContent='Postavke neradnih dana za Voditelja';
   try{renderHolidayAdmin?.();enableDatePickers?.()}catch(_){}
 }else{
   node=ensureRampPanel();
   title.textContent='UPRAVLJAJ RAMPAMA';
   sub.textContent='Iste canonical Master rampe kao Admin · samo dodijeljena skladišta';
   renderRampPanel();
 }
 if(!node)return;
 const marker=document.createComment('yardivo-manager-popup-v4-origin');
 node.parentNode?.insertBefore(marker,node);
 popupMoved={node,marker};
 body.appendChild(node);
 node.style.setProperty('display','block','important');
 node.style.setProperty('visibility','visible','important');
 p.classList.add('open');
 document.body.classList.remove('yv-right-settings-open');
 if(kind==='holidays'){try{renderHolidayAdmin?.();enableDatePickers?.()}catch(_){}}
}

/* Install/repair the two right-drawer manager buttons. */
function patchDrawer(){
 if(!isManager())return;
 const list=document.querySelector('#yardivoRightSettingsDrawer .yv-rs-list');if(!list)return;
 list.querySelectorAll('[data-manager-popup-v4],[data-yv-manager-setting]').forEach(x=>x.remove());
 list.insertAdjacentHTML('beforeend',`
   <button type="button" class="yv-rs-item" data-manager-popup-v4="holidays">
     <span class="yv-rs-icon">📅</span><span class="yv-rs-copy"><strong>NERADNI DANI</strong><small>Blagdani i interne iznimke</small></span><span class="yv-rs-arrow">›</span>
   </button>
   <button type="button" class="yv-rs-item" data-manager-popup-v4="ramps">
     <span class="yv-rs-icon">▥</span><span class="yv-rs-copy"><strong>UPRAVLJAJ RAMPAMA</strong><small>Uključi / isključi rampe</small></span><span class="yv-rs-arrow">›</span>
   </button>`);
}

/* WINDOW capture executes before legacy document handlers. */
window.addEventListener('click',e=>{
 if(!isManager())return;
 const p=e.target?.closest?.('[data-manager-popup-v4],[data-yv-manager-setting]');
 if(p){
   const kind=String(p.dataset.managerPopupV4||p.dataset.yvManagerSetting||'');
   if(kind==='holidays'||kind==='ramps'){
     e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
     openPopup(kind);
     return;
   }
 }
 const nav=e.target?.closest?.('.nav-btn[data-view]');
 if(nav){
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   if(nav.dataset.view==='aiOperations'&&!aiControlEnabled())return;
   forceView(nav.dataset.view);
   return;
 }
 const card=e.target?.closest?.('#homeMenuGrid [data-home-target]');
 if(card){
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   if(card.dataset.homeTarget==='aiOperations'&&!aiControlEnabled())return;
   forceView(card.dataset.homeTarget);
   return;
 }
},true);

/* Manager context selector: accept allowed choices and reject only out-of-scope values.
   Previous build always called enforceAccountScope() before saving the user's new selection,
   which snapped W203 straight back to W201. */
window.addEventListener('change',e=>{
 if(!isManager())return;
 const id=String(e.target?.id||'');
 if(!['globalLocationV583','homeLocationSelect','yscLocationSelect','globalWarehouse','yscWarehouseSelect'].includes(id))return;

 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();

 const sc=accountScope();
 const requested=String(e.target?.value||'').trim();

 if(['globalWarehouse','yscWarehouseSelect'].includes(id)){
   const allowed=sc.whs.map(x=>String(x.id));
   if(!allowed.includes(requested)){
     enforceAccountScope();
     return;
   }
   try{window.YardivoAppStateV583?.setWarehouse?.(requested)}catch(_){}
   try{
     window.activeWarehouse=requested;
     if(typeof activeWarehouse!=='undefined')activeWarehouse=requested;
     localStorage.setItem('studenac_active_warehouse',requested);
   }catch(_){}
   /* Keep every dependent operational selector on the same warehouse. */
   ['globalWarehouse','yscWarehouseSelect','savedWarehouseFilter','dailyMapWarehouseSelect','weeklyMapWarehouse',
    'receivingWarehouse','receivingWarehouseSelect','receivingWarehouseFilter','incWarehouse'].forEach(selId=>{
      const sel=document.getElementById(selId);
      if(sel&&[...sel.options].some(o=>String(o.value)===requested))sel.value=requested;
   });
   enforceAccountScope();
   try{window.YardivoWarehouseSync?.apply?.()}catch(_){}
   try{
     const current=String(document.body.dataset.managerView||'homeMenu');
     if(current!=='homeMenu')renderTarget(current);
   }catch(_){}
   return;
 }

 const allowed=sc.locs.map(x=>String(x.id));
 if(!allowed.includes(requested)){
   enforceAccountScope();
   return;
 }
 try{window.YardivoAppStateV583?.setLocation?.(requested)}catch(_){}
 try{
   const s=sess();
   if(s){s.location=requested;window.currentSession=s;if(typeof currentSession!=='undefined')currentSession=s}
 }catch(_){}
 enforceAccountScope();
 try{window.YardivoWarehouseSync?.apply?.()}catch(_){}
},true);

let repairPending=false;
function scheduleRepair(){
 if(repairPending)return;
 repairPending=true;
 requestAnimationFrame(()=>{
  repairPending=false;
  if(!isManager())return;
  const id=String(document.body.dataset.managerView||'homeMenu');
  const view=document.getElementById(id);
  if(!view||!view.classList.contains('active'))forceView(id);
 });
}
// Observe only the view roots, never every menu / body mutation.
const obs=new MutationObserver(()=>{
 if(!isManager())return;
 const id=String(document.body.dataset.managerView||'homeMenu');
 if(!document.getElementById(id)?.classList.contains('active'))scheduleRepair();
});
function observeViews(){
 document.querySelectorAll('.view').forEach(v=>obs.observe(v,{attributes:true,attributeFilter:['class']}));
}
document.addEventListener('DOMContentLoaded',observeViews,{once:true});

let initialized=false;
function init(){
 if(!isManager())return;
 if(initialized){syncMenu();return;}
 initialized=true;
 document.body.dataset.yardivoRole='manager';
 enforceAccountScope();
 patchDrawer();
 let current=[...document.querySelectorAll('.view.active')].find(v=>managerViewAllowed(String(v.id)))?.id||'homeMenu';
 if(!managerViewAllowed(current))current='homeMenu';
 forceView(current);
}
window.addEventListener('yardivo:login',()=>{initialized=false;queueMicrotask(init)});
window.addEventListener('yardivo:master-data-changed',()=>queueMicrotask(()=>{if(isManager())enforceAccountScope()}));
document.addEventListener('DOMContentLoaded',init,{once:true});
window.addEventListener('load',init,{once:true});
setTimeout(init,0);

window.YardivoManagerFinalV4={init,forceView,syncMenu,openPopup,enforceAccountScope,scope:accountScope};
})();
