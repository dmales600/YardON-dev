
(function(){
'use strict';
if(window.__YARDIVO_PRODUCTION_MASTER_CLEANUP_V583__)return;
window.__YARDIVO_PRODUCTION_MASTER_CLEANUP_V583__=true;
const BUILD='20260914-dev-v5.8.3-production-master-total-cleanup-final';
const MASTER='yardivo_master_data_registry_v583';
const LEGACY=/^(W101|W103|W104|W201|W202|W203|W204|VG|DU)$/i;
const CONFIG_KEYS=['yardivo_capacity_config_v1','yardivo_reception_master_hours_v1','yardivo_ramp_hours_v583','yardivo_ramp_capacity_v1','yardivo_ramp_config_v1','yardivo_ramp_master_v583','yardivo_detention_settings_v1','yardivo_epal_initial_stock_v1','yardivo_dynamic_warehouses_v1'];
function read(){try{const d=JSON.parse(localStorage.getItem(MASTER)||'{}');d.locations=Array.isArray(d.locations)?d.locations:[];d.warehouses=Array.isArray(d.warehouses)?d.warehouses:[];d.suppliers=Array.isArray(d.suppliers)?d.suppliers:[];d.responsible_people=Array.isArray(d.responsible_people)?d.responsible_people:[];return d}catch(_){return{locations:[],warehouses:[],suppliers:[],responsible_people:[]}}}
function write(d,reason){try{localStorage.setItem(MASTER,JSON.stringify(d));window.YardivoMasterDataV583?.save?.(JSON.parse(JSON.stringify(d)));window.YardivoSupabase?.flushQueue?.();window.dispatchEvent(new CustomEvent('yardivo:master-data-changed',{detail:{source:'production-master-cleanup',reason}}))}catch(e){console.error('[YARDIVO MASTER CLEANUP]',e)}}
function activeLocation(){try{return String(window.YardivoAppStateV583?.location?.()||window.currentSession?.location||'')}catch(_){return''}}
function activeWarehouse(){try{return String(window.YardivoAppStateV583?.warehouse?.()||window.activeWarehouse||'')}catch(_){return''}}
function clearInvalidContext(){
 const d=read(),locs=new Set(d.locations.filter(x=>x&&x.active!==false).map(x=>String(x.id))),whs=new Map(d.warehouses.filter(x=>x&&x.active!==false).map(x=>[String(x.id),x]));
 const l=activeLocation(),w=activeWarehouse();
 if(l&&!locs.has(l)){try{window.YardivoAppStateV583?.setLocation?.('')}catch(_){};try{if(window.currentSession&&String(window.currentSession.role||'').toLowerCase()==='admin')window.currentSession.location='ALL'}catch(_){}}
 if(w&&!whs.has(w)){try{window.YardivoAppStateV583?.setWarehouse?.('')}catch(_){};try{window.activeWarehouse=''}catch(_){}}
 const ww=whs.get(activeWarehouse()),ll=activeLocation();
 if(ww&&ll&&ll!=='ALL'&&String(ww.location_id)!==String(ll)){try{window.YardivoAppStateV583?.setWarehouse?.('')}catch(_){};try{window.activeWarehouse=''}catch(_){}}
}
function pruneLegacyRuntime(){
 const d=read(),ids=new Set(d.warehouses.map(w=>String(w.id)));
 for(const key of CONFIG_KEYS){try{const raw=localStorage.getItem(key);if(!raw)continue;const o=JSON.parse(raw);if(!o||typeof o!=='object'||Array.isArray(o))continue;let c=false;for(const k of Object.keys(o)){if((LEGACY.test(k)||/^W\d+$/i.test(k))&&!ids.has(k)){delete o[k];c=true}}if(c)localStorage.setItem(key,JSON.stringify(o))}catch(_){}}
 try{if(typeof WAREHOUSES==='object'&&WAREHOUSES){for(const k of Object.keys(WAREHOUSES)){if(!ids.has(String(k)))delete WAREHOUSES[k]}for(const w of d.warehouses.filter(x=>x&&x.active!==false)){const l=d.locations.find(x=>String(x.id)===String(w.location_id));WAREHOUSES[w.id]={...(WAREHOUSES[w.id]||{}),code:w.id,name:w.name,label:w.name,location:w.location_id,location_id:w.location_id,locationName:l?.name||'',ramps:Number(w.ramps)||0}}}}catch(_){ }
}
function visibleNameForWarehouse(id){const d=read(),w=d.warehouses.find(x=>String(x.id)===String(id));return w?.name||''}
function visibleNameForLocation(id){const d=read(),l=d.locations.find(x=>String(x.id)===String(id));return l?.name||''}
function sanitizeSelects(){
 const d=read(),wh=new Map(d.warehouses.map(x=>[String(x.id),x])),loc=new Map(d.locations.map(x=>[String(x.id),x]));
 document.querySelectorAll('select').forEach(sel=>{[...sel.options].forEach(o=>{const v=String(o.value||'').trim();if(LEGACY.test(v)&&!wh.has(v)&&!loc.has(v)){o.remove();return}if(wh.has(v))o.textContent=String(wh.get(v).name||'Skladište');else if(loc.has(v))o.textContent=String(loc.get(v).name||'Lokacija')})});
}
function paintHeader(){
 const d=read(),locId=activeLocation(),whId=activeWarehouse();
 const loc=d.locations.find(x=>String(x.id)===locId),wh=d.warehouses.find(x=>String(x.id)===whId);
 const le=document.getElementById('ygcLocation');if(le)le.textContent=loc?String(loc.name):'LOKACIJA NIJE ODABRANA';
 const candidates=['ygcWarehouse','headerWarehouseName','activeWarehouseName'];for(const id of candidates){const e=document.getElementById(id);if(e)e.textContent=wh?String(wh.name):'SKLADIŠTE NIJE ODABRANO'}
}
function masterFlow(){
 const editor=document.getElementById('yardivoStableMasterEditorV583');if(!editor)return;
 let flow=document.getElementById('yardivoProductionMasterFlowV583');if(!flow){flow=document.createElement('section');flow.id='yardivoProductionMasterFlowV583';editor.insertAdjacentElement('afterend',flow)}
 if(!flow.querySelector('.ypmf-head'))flow.innerHTML='<div class="ypmf-head"><div><h3>MASTER DATA → CIJELI YARDIVO</h3><p>Jedini redoslijed je Lokacija → Skladište → Rampe/operativa → Dobavljači → Odgovorne osobe. Sve druge sekcije čitaju ove podatke; nema demo skladišta ni legacy strukture.</p></div><span>MASTER = SOURCE OF TRUTH</span></div><div id="yardivoProductionMasterPeopleV583"></div>';
 const people=flow.querySelector('#yardivoProductionMasterPeopleV583'),sup=document.getElementById('yardivoMasterSuppliersV583'),rp=document.getElementById('yardivoResponsiblePeopleV583');if(sup&&people&&sup.parentElement!==people)people.appendChild(sup);if(rp&&people&&rp.parentElement!==people)people.appendChild(rp);
}
function overrideLegacyHelpers(){
 window.yardivoWarehouseNameV583=visibleNameForWarehouse;
 window.yardivoLocationNameV583=visibleNameForLocation;
 try{window.warehouseOptionLabel=function(id){return visibleNameForWarehouse(id)||'Skladište'}}catch(_){ }
 try{window.whLabel=function(id){return visibleNameForWarehouse(id)||'Skladište'}}catch(_){ }
 try{window.warehousesForLocation=function(locId){const d=read();return d.warehouses.filter(w=>w&&w.active!==false&&(!locId||locId==='ALL'||String(w.location_id)===String(locId))).map(w=>String(w.id))}}catch(_){ }
 try{window.allWarehousesForLocation=window.warehousesForLocation}catch(_){ }
}
function sync(reason){clearInvalidContext();pruneLegacyRuntime();overrideLegacyHelpers();sanitizeSelects();paintHeader();masterFlow();try{window.YardivoResponsiblePeopleV583?.refresh?.()}catch(_){ }/* StableMasterV583 exclusively owns its editable DOM; cleanup must never redraw it. */try{window.YardivoUnifiedRampsV583?.refresh?.()}catch(_){ }try{window.YardivoMyYard?.render?.()}catch(_){ }try{window.dispatchEvent(new CustomEvent('yardivo:production-master-synced',{detail:{reason}}))}catch(_){ }}
['yardivo:master-data-changed','yardivo:data-synced','yardivo:login','yardivo:context-changed'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>sync(ev),35)));
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>sync('dom'),160));window.addEventListener('load',()=>setTimeout(()=>sync('load'),350),{once:true});document.addEventListener('click',e=>{if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"],[data-settings-tab]'))setTimeout(()=>sync('settings'),40)},true);
window.YardivoProductionMasterV583={read,sync,warehouseName:visibleNameForWarehouse,locationName:visibleNameForLocation,pruneLegacy:pruneLegacyRuntime};
window.YARDIVO_DEV_BUILD=BUILD;
})();
