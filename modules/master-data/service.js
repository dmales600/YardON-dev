(function(){
'use strict';
if(window.YardivoMasterDataService?.owner==='modules/master-data/service.js')return;

const KEY='yardivo_master_data_registry_v583';
const CACHE='yardivo_master_boot_cache_v583';

function parse(value){
  try{return JSON.parse(value||'null')}catch(_){return null}
}
function read(){
  return parse(localStorage.getItem(KEY))||{};
}
function valid(data){
  return !!(data&&Array.isArray(data.locations)&&Array.isArray(data.warehouses)&&Array.isArray(data.suppliers));
}
function protectRealWarehouses(){
  const data=read();
  if(!valid(data)||!data.warehouses.length||data.__emptyWarehouseMigrationV583===true)return false;
  /* A populated Master registry is user/server business data, not the old seeded
     warehouse catalog. Mark it as already migrated before the legacy registry
     cleanup can discard real warehouses. Never alter warehouse values here. */
  data.__emptyWarehouseMigrationV583=true;
  try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch(_){return false}
}
function hasData(data=read()){
  return valid(data)&&(
    data.locations.length||
    data.warehouses.length||
    data.suppliers.length||
    (Array.isArray(data.responsible_people)&&data.responsible_people.length)
  );
}
function cacheWrite(data=read()){
  if(!valid(data))return false;
  try{localStorage.setItem(CACHE,JSON.stringify(data));return true}catch(_){return false}
}
function cached(){
  return parse(localStorage.getItem(CACHE));
}
function installCachedIfEmpty(){
  const data=cached();
  if(!valid(data)||hasData(read()))return false;
  try{
    if(data.warehouses.length&&data.__emptyWarehouseMigrationV583!==true)data.__emptyWarehouseMigrationV583=true;
    localStorage.setItem(KEY,JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('yardivo:master-data-ready',{detail:{source:'cache'}}));
    window.dispatchEvent(new CustomEvent('yardivo:master-data-changed',{detail:{source:'master-service-cache',bootstrap:true}}));
    return true;
  }catch(_){return false}
}
async function refresh(force=false){
  if(!force&&hasData())return read();
  if(window.YardivoSync?.pull){
    try{await window.YardivoSync.pull()}catch(_){}
  }
  protectRealWarehouses();
  const data=read();
  if(valid(data))cacheWrite(data);
  return data;
}

window.addEventListener('yardivo:data-synced',()=>{protectRealWarehouses();cacheWrite()});
window.addEventListener('yardivo:master-data-changed',()=>{protectRealWarehouses();cacheWrite()});

async function bootRefresh(){
  protectRealWarehouses();
  installCachedIfEmpty();
  protectRealWarehouses();
  if(hasData())return true;
  try{await refresh(true)}catch(_){}
  return hasData();
}
window.addEventListener('yardivo:login',()=>setTimeout(bootRefresh,0));
window.addEventListener('load',()=>setTimeout(bootRefresh,250),{once:true});
protectRealWarehouses();
installCachedIfEmpty();
protectRealWarehouses();

window.YardivoMasterDataService={
  owner:'modules/master-data/service.js',
  key:KEY,
  cacheKey:CACHE,
  read,
  valid,
  hasData,
  cached,
  cacheWrite,
  protectRealWarehouses,
  installCachedIfEmpty,
  refresh,
  bootRefresh
};
window.YardivoMasterInstantBootV583={
  ready:()=>hasData(),
  refresh:bootRefresh
};
})();