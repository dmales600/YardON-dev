'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const script=read('modules/supplier/script-022.js');
const master=read('modules/master-data/yardivo-master-data-registry.js');
const timer=read('modules/master-data/script-024.js');
const index=read('index.html');
function extract(source,begin,end){
  const a=source.indexOf(begin),b=source.indexOf(end,a+begin.length);
  assert(a>=0&&b>a,'Missing function boundary '+begin);
  return source.slice(a,b);
}
let tests=0;function check(label,fn){fn();tests++;console.log('PASS '+label)}
check('External scripts not loaded twice',()=>{
 const refs=[...index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(m=>m[1].replace(/^\.\//,'').split('?')[0]);
 assert.equal(new Set(refs).size,refs.length);
});
check('No three-minute global render loop',()=>assert(!script.includes('setInterval(render,180000)')));
check('Receiving render is read-only and incremental',()=>{
 const fn=extract(script,'function renderReceiving(){','function animateYardTruckToDock');
 assert(!fn.includes('syncAllAnnouncementIdentities()'));
 assert(fn.includes('yardonMasterSupplierAllowed(a.supplier)'));
 assert(fn.includes('host.insertBefore('));
 assert(fn.includes('if(host.innerHTML===nextHtml)return;'));
});
check('Minute timer does not rebuild daily/weekly map',()=>{
 const block=timer.slice(timer.lastIndexOf('setInterval(()=>{'));
 assert(!block.includes('renderDailyMap()'));
 assert(!block.includes('renderWeeklyMap()'));
 assert(block.includes('YardivoDailyMapLiveStatus'));
});
check('Master read removes old seed without repeated writes',()=>{
 const source=extract(master,'function load(){','let masterCloudWrite');
 const input={suppliers:[{id:'SUP001',name:'DOBAVLJAČ1',active:true},{id:'SUP244',name:'Dobavljač 244',active:true},{id:'SUP002',name:'dobavljač2',active:true}],locations:[],warehouses:[],__emptyWarehouseMigrationV583:true,__emptySupplierSeedMigrationV583:true};
 const store=new Map([['yardivo_master_data_registry_v583',JSON.stringify(input)]]);let writes=0;
 const ctx={KEY:'yardivo_master_data_registry_v583',seed:{suppliers:[],locations:[],warehouses:[]},clone:x=>JSON.parse(JSON.stringify(x)),localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>{writes++;store.set(k,v)}}};
 vm.runInNewContext(source+';globalThis.readMaster=load;',ctx);
 const one=ctx.readMaster();
 assert.equal(one.suppliers.length,2);
 assert.equal(one.suppliers[0].name,'DOBAVLJAČ1');
 assert.equal(one.suppliers[1].name,'dobavljač2');
 assert.equal(writes,1);
 ctx.readMaster();assert.equal(writes,1);
});
check('Supplier catalog reads active Master entries only',()=>{
 const source=extract(script,'function yardonRefreshMasterSupplierList(){','function renderSuppliers(');
 const ctx={suppliers:['Dobavljač 244','other'],window:{YardivoMasterDataV583:{all:()=>({suppliers:[{id:'SUP001',name:'DOBAVLJAČ1',active:true},{id:'SUP002',name:'dobavljač2',active:true},{id:'SUP244',name:'legacy',active:false}]})}},localStorage:{getItem:()=>null}};
 vm.runInNewContext(source+';yardonRefreshMasterSupplierList();',ctx);
 assert.equal(ctx.suppliers.join('|'),'DOBAVLJAČ1|dobavljač2');
});
check('Reception and Gate navigation use one canonical visibility authority',()=>{
 const roleStable=read('modules/supplier/yardivo-role-stability-final-v6-20260902-js.js');
 const reception=read('modules/supplier/yardivo-v583-reception-ui-scope-clean-js.js');
 assert(roleStable.includes("window.YardivoRoleVisibility.apply();"));
 assert(roleStable.includes("if(expected.length===actual.length&&expected.every((id,i)=>id===actual[i]))return;"));
 assert(reception.includes("window.YardivoRoleVisibility?.owner==='modules/auth/role-visibility.js'"));
});
console.log('YARDON_FRONTEND_STABILITY_PASS '+tests+'/'+tests);
