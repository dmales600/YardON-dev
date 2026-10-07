
(function(){
'use strict';
if(window.__YARDIVO_MASTER_DATA_PERSISTENCE_FIX_V583__)return;
window.__YARDIVO_MASTER_DATA_PERSISTENCE_FIX_V583__=true;

const KEY='yardivo_master_data_registry_v583';

function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){
  try{
    const raw=localStorage.getItem(KEY);
    const d=raw?JSON.parse(raw):null;
    if(d&&Array.isArray(d.suppliers)&&Array.isArray(d.locations)&&Array.isArray(d.warehouses))return d;
  }catch(_){}
  try{return window.YardivoMasterDataV583?.all?.()||{suppliers:[],locations:[],warehouses:[]}}catch(_){}
  return {suppliers:[],locations:[],warehouses:[]};
}
function persist(d){
  try{localStorage.setItem(KEY,JSON.stringify(d))}catch(_){}
  try{window.YardivoMasterDataV583?.save?.(clone(d))}catch(_){}
  /* Business master data must survive logout/relogin; flush the existing server-state transport. */
  setTimeout(()=>{try{window.YardivoSupabase?.syncNow?.()}catch(_){}},40);
  return d;
}
function locLabel(id){
  const d=load();
  return d.locations.find(x=>x.id===String(id||''))?.name||String(id||'');
}
function refreshHomeLocationDropdown(){/* owned by HomeHeaderMasterDwellFinal */}
function refreshWarehouseSelectors(){
  const d=load();
  const protectedIds=new Set(['globalWarehouse','ysrWarehouseFilter','sbnWarehouseSelect','yspWarehouse','ygcWarehouseSelect']);
  document.querySelectorAll('select').forEach(sel=>{
    const id=String(sel.id||''),name=String(sel.name||'');
    if(protectedIds.has(id))return;
    /* Stable Master owns its own location/warehouse selectors. In particular,
       smNewWarehouseLocation contains the word "Warehouse" but is a LOCATION selector. */
    if(sel.closest('#yardivoStableMasterEditorV583'))return;
    if(id==='ymdWarehouseLocation')return;
    if(sel.closest('#yardivoMasterDataRegistryV583') && id!=='rampSettingsWarehouse')return;
    if(!/warehouse|sklad/i.test(id+' '+name))return;
    if(document.activeElement===sel)return;
    const current=String(sel.value||'');
    const leading=[...sel.options].filter(o=>!/^W\d+$/i.test(String(o.value||''))).map(o=>[String(o.value||''),String(o.textContent||'')]);
    const desired=[...leading,...d.warehouses.filter(x=>x.active!==false).map(w=>{const l=d.locations.find(x=>x.id===w.location_id);return [String(w.id),String(w.name)+(l?.name?' · '+l.name:'')]})];
    const sig=JSON.stringify(desired);
    if(sel.dataset.yvMasterWhSig===sig){if([...sel.options].some(o=>o.value===current))sel.value=current;return}
    sel.innerHTML=desired.map(([v,label])=>`<option value="${String(v).replace(/"/g,'&quot;')}">${label}</option>`).join('');
    sel.dataset.yvMasterWhSig=sig;
    if([...sel.options].some(o=>o.value===current))sel.value=current;
  });
}
function refreshMasterWarehouseLocationSelect(){
  const d=load(),sel=document.getElementById('ymdWarehouseLocation');
  if(!sel)return;
  const current=sel.value;
  sel.innerHTML=d.locations.filter(x=>x.active!==false).map(x=>`<option value="${x.id}">${x.name}</option>`).join('');
  if([...sel.options].some(o=>o.value===current))sel.value=current;
  if(!sel.value&&sel.options.length)sel.selectedIndex=0;
}
function nextWh(arr){
  let max=0;
  arr.forEach(x=>{const m=String(x.id||'').match(/^W(\d+)$/i);if(m)max=Math.max(max,Number(m[1])||0)});
  return 'W'+String(max+1).padStart(3,'0');
}
function addWarehouseFixed(name,locationId){
  const d=load(),n=String(name||'').trim(),lid=String(locationId||'').trim();
  if(!n)throw new Error('Upiši naziv skladišta.');
  if(!lid||!d.locations.some(x=>x.id===lid))throw new Error('Odaberi lokaciju skladišta.');
  const x={id:nextWh(d.warehouses),name:n,location_id:lid,ramps:0,active:true};
  d.warehouses.push(x);
  persist(d);
  try{window.YardivoMasterDataV583?.refresh?.()}catch(_){}
  try{window.YardivoUnifiedRampsV583?.refresh?.()}catch(_){}
  refreshAll();
  return x;
}
function bindWarehouseAdd(){
  const btn=document.getElementById('ymdAddWarehouse');
  if(!btn||btn.dataset.masterDataBugfixBound==='1')return;
  btn.dataset.masterDataBugfixBound='1';
  btn.addEventListener('click',e=>{
    e.preventDefault();
    e.stopImmediatePropagation();
    const n=document.getElementById('ymdWarehouseName');
    const l=document.getElementById('ymdWarehouseLocation');
    try{
      const x=addWarehouseFixed(n?.value,l?.value);
      if(n)n.value='';
      try{showYmsToast?.('success','SKLADIŠTE DODANO',`${x.name} · ${locLabel(x.location_id)}`)}catch(_){}
    }catch(err){
      alert(err?.message||err);
    }
  },true);
}
function refreshAll(){
  refreshHomeLocationDropdown();
  refreshMasterWarehouseLocationSelect();
  refreshWarehouseSelectors();
  bindWarehouseAdd();

  /* Replace old two-location assumptions in the live global helpers. */
  try{window.locationLabel=locLabel}catch(_){}
  try{window.locLabel=locLabel}catch(_){}
  try{
    window.homeLocationChosen=function(){
      const d=load(),id=String(window.currentSession?.location||'');
      return d.locations.some(x=>x.active!==false&&x.id===id);
    };
  }catch(_){}
  try{
    window.validLocation=function(code){
      const d=load(),id=String(code||'');
      return d.locations.some(x=>x.active!==false&&x.id===id);
    };
  }catch(_){}
  try{
    window.defaultWarehouseForLocation=function(code){
      const d=load(),id=String(code||'');
      return d.warehouses.find(x=>x.active!==false&&x.location_id===id)?.id||'ALL';
    };
  }catch(_){}
  try{
    window.allWarehousesForLocation=function(code){
      const d=load(),id=String(code||'');
      return d.warehouses.filter(x=>x.active!==false&&x.location_id===id).map(x=>x.id);
    };
  }catch(_){}
  try{window.updateHomeLocationUI?.()}catch(_){}
}
function wrapMasterApi(){
  const api=window.YardivoMasterDataV583;
  if(!api||api.__bugfixWrapped)return;
  ['addLocation','renameLocation','deleteLocation','addWarehouse','renameWarehouse','deleteWarehouse','addSupplier'].forEach(name=>{
    const orig=api[name];
    if(typeof orig!=='function')return;
    api[name]=function(...args){
      const r=orig.apply(api,args);
      setTimeout(()=>{
        try{window.YardivoSupabase?.syncNow?.()}catch(_){}
        refreshAll();
      },30);
      return r;
    };
  });
  api.__bugfixWrapped=true;
}
function afterRender(){
  wrapMasterApi();
  refreshAll();
}

/* QA V5.8.3: event-driven only. A document-wide observer was repeatedly
   rebuilding MASTER selectors and destroying text while the user typed. */
function masterEditActive(){
  return !!document.activeElement?.closest?.('#yardivoMasterDataRegistryV583');
}
window.addEventListener('yardivo:master-data-changed',()=>setTimeout(afterRender,30));
window.addEventListener('yardivo:data-synced',()=>setTimeout(()=>{
  wrapMasterApi();
  if(!masterEditActive())refreshAll();
},80));
window.addEventListener('yardivo:login',()=>setTimeout(afterRender,180));
document.addEventListener('DOMContentLoaded',()=>setTimeout(afterRender,140));
window.addEventListener('load',()=>setTimeout(afterRender,350));

/* When user opens Home or Settings, refresh from the current authoritative registry immediately. */
document.addEventListener('click',e=>{
  if(e.target.closest('[data-view="homeMenu"],[data-home-target="homeMenu"],[data-view="settings"],[data-home-target="settings"]')){
    setTimeout(afterRender,30);
  }
},true);

afterRender();

window.YardivoMasterDataBugfixV583={
  refresh:afterRender,
  addWarehouse:addWarehouseFixed,
  locations:()=>clone(load().locations),
  warehouses:()=>clone(load().warehouses)
};
window.YARDIVO_DEV_BUILD='20260911-dev-v5.8.3-home-masterdata-warehouse-bugfix';
})();
