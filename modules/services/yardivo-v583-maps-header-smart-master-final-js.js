
(()=>{'use strict';
if(window.__YARDIVO_MAPS_HEADER_SMART_MASTER_FINAL_V583__)return;
window.__YARDIVO_MAPS_HEADER_SMART_MASTER_FINAL_V583__=true;
const $=id=>document.getElementById(id), MASTER='yardivo_master_data_registry_v583', CFG='yardivo_auto_replan_cfg_v1';
let mapSyncBusy=false, smartSaving=false;
function readMaster(){try{const d=JSON.parse(localStorage.getItem(MASTER)||'{}')||{};d.locations=Array.isArray(d.locations)?d.locations:[];d.warehouses=Array.isArray(d.warehouses)?d.warehouses:[];return d}catch(_){return{locations:[],warehouses:[]}}}
function cfg(){try{return JSON.parse(localStorage.getItem(CFG)||'{}')||{}}catch(_){return{}}}
function role(){try{let r=String(window.currentSession?.role||window.currentSession?.app_role||document.body.dataset.yardivoRole||'').toLowerCase().trim();if(r==='management'||r==='voditelj')r='manager';if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';if(r==='prijam')r='reception';if(r==='porta'||r==='portir')r='gate';return r}catch(_){return''}}
function currentWarehouse(){
 const header=String($('globalWarehouse')?.value||'').trim();if(header&&header!=='ALL')return header;
 try{const x=String(localStorage.getItem('yardivo_active_warehouse_v583')||localStorage.getItem('studenac_active_warehouse')||'').trim();if(x&&x!=='ALL')return x}catch(_){}
 try{const x=String(window.YardivoAppStateV583?.warehouse?.()||window.activeWarehouse||'').trim();if(x&&x!=='ALL')return x}catch(_){}
 return '';
}
function hideMapWarehouseControls(){
 const daily=$('dailyMapWarehouseSelect'),weekly=$('weeklyMapWarehouse');
 [daily,weekly].forEach(sel=>{const wrap=sel?.closest?.('label');if(wrap)wrap.classList.add('yardivo-map-warehouse-control-hidden');else if(sel)sel.classList.add('yardivo-map-warehouse-control-hidden')});
}
function fillHiddenDaily(wh){
 const sel=$('dailyMapWarehouseSelect');if(!sel)return;
 const d=readMaster(), rows=d.warehouses.filter(x=>x&&x.active!==false&&x.id);
 const html='<option value=""></option>'+rows.map(x=>'<option value="'+String(x.id).replace(/"/g,'&quot;')+'">'+String(x.name||x.id).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</option>').join('');
 if(sel.dataset.yvHeaderMapOptions!==html){sel.innerHTML=html;sel.dataset.yvHeaderMapOptions=html}
 if([...sel.options].some(o=>String(o.value)===String(wh)))sel.value=wh;else sel.value='';
}
function syncMaps(render=true){
 if(mapSyncBusy)return;mapSyncBusy=true;
 try{
   hideMapWarehouseControls();const wh=currentWarehouse();fillHiddenDaily(wh);
   const weekly=$('weeklyMapWarehouse');if(weekly&&wh&&[...weekly.options].some(o=>String(o.value)===String(wh)))weekly.value=wh;
   if(render&&wh){
     try{if($('dailyMap')?.classList.contains('active')&&typeof window.renderDailyMap==='function')window.renderDailyMap()}catch(_){}
     try{if($('weeklyMap')?.classList.contains('active')&&typeof window.renderWeeklyMap==='function')window.renderWeeklyMap()}catch(_){}
   }
 }finally{mapSyncBusy=false}
}
function masterPane(){return $('yardivoSettingsMasterPaneV583')}
function moveSmartIntoMaster(){
 const pane=masterPane(), smart=$('yardivoSmartEngineSettingsV583');if(!pane||!smart)return;
 if(smart.parentElement!==pane)pane.appendChild(smart);
 smart.hidden=false;smart.style.setProperty('display','block','important');
 const simple=$('yardivoSmartToggleCardExactV583');if(simple)simple.style.setProperty('display','none','important');
}
function smartOn(){const m=readMaster(), c=cfg(), s={...c,...(m.smart||{})};return s.enabled===true&&String(s.mode||'').toUpperCase()!=='PAUSED'}
function canSeeSmart(){const r=role();if(['admin','inventory','reception'].includes(r))return true;if(r==='manager')return window.yardivoManagerSectionAllowed?.('smartReplanning')===true;return false}
function syncSmartNav(){
 // SMART controls remain in Master Settings; never create or reveal a separate section.
 document.querySelector('.nav-btn[data-view="smartReplanning"]')?.remove();
 const view=$('smartReplanning');
 if(view&&!view.classList.contains('active'))view.remove();
}

async function persistSmartParamsFromPanel(){
 if(smartSaving)return;const p=$('yardivoSmartEngineSettingsV583');if(!p)return;smartSaving=true;
 try{
   const c={...cfg()};
   c.palletsPerHour=Math.max(1,Number(p.querySelector('#yseRate')?.value||c.palletsPerHour||33));
   c.lateThreshold=Math.max(5,Number(p.querySelector('#yseLate')?.value||c.lateThreshold||20));
   c.horizonMinutes=Math.max(30,Number(p.querySelector('#yseHorizon')?.value||c.horizonMinutes||240));
   c.maxShiftMinutes=Math.max(15,Number(p.querySelector('#yseShift')?.value||c.maxShiftMinutes||240));
   c.gapWeight=Math.max(0,Number(p.querySelector('#yseGap')?.value||c.gapWeight||1.15));
   c.scanSeconds=Math.max(10,Number(p.querySelector('#yseScan')?.value||c.scanSeconds||30));
   const m=readMaster(), old=m.smart||{};m.smart={...old,enabled:old.enabled===true,mode:old.mode||'PAUSED',palletsPerHour:c.palletsPerHour,lateThreshold:c.lateThreshold,horizonMinutes:c.horizonMinutes,maxShiftMinutes:c.maxShiftMinutes,gapWeight:c.gapWeight,scanSeconds:c.scanSeconds};
   m.__masterUpdatedAtV583=new Date().toISOString();localStorage.setItem(MASTER,JSON.stringify(m));
   try{if(window.YardivoMasterDataV583?.save)await Promise.resolve(window.YardivoMasterDataV583.save(m));else if(typeof window.putCloudState==='function')await Promise.resolve(window.putCloudState(MASTER,JSON.stringify(m)))}catch(e){console.error('SMART Master save failed',e)}
   window.dispatchEvent(new CustomEvent('yardivo:master-data-changed',{detail:{reason:'smart.parameters'}}));
 }finally{smartSaving=false}
}
function stabilize(renderMaps=false){hideMapWarehouseControls();syncMaps(renderMaps);moveSmartIntoMaster();syncSmartNav()}
document.addEventListener('change',e=>{if(e.target?.id==='globalWarehouse'){setTimeout(()=>syncMaps(true),0)}},true);
document.addEventListener('click',e=>{
 if(e.target?.closest?.('#yseSave'))setTimeout(()=>{persistSmartParamsFromPanel();syncSmartNav()},40);
 if(e.target?.closest?.('#ysePower,#yardivoSmartToggleExactV583'))setTimeout(()=>{moveSmartIntoMaster();syncSmartNav()},180);
 if(e.target?.closest?.('[data-home-target="settings"],[data-view="settings"],#navSettings,#yardivoOpenMasterV583,#yardivoMasterPopupLaunchV583'))setTimeout(()=>stabilize(false),100);
},true);
['yardivo:master-data-changed','yardivo:data-synced','yardivo:login'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>stabilize(false),120)));
window.addEventListener('storage',e=>{if([MASTER,CFG,'yardivo_active_warehouse_v583','studenac_active_warehouse'].includes(e.key))setTimeout(()=>stabilize(true),30)});
window.addEventListener('load',()=>setTimeout(()=>stabilize(false),1200));
/* One lightweight guard only: old Settings authorities can move SMART back; restore canonical placement without rebuilding UI. */
setInterval(()=>{const pane=masterPane(),smart=$('yardivoSmartEngineSettingsV583');if(pane&&smart&&smart.parentElement!==pane)moveSmartIntoMaster();hideMapWarehouseControls();syncSmartNav()},5000);
window.YardivoMapsHeaderSmartMasterV583={syncMaps,moveSmartIntoMaster,syncSmartNav};
window.YARDIVO_DEV_BUILD='20260918-dev-v5.8.3-maps-header-smart-master-fixed-final';
})();
