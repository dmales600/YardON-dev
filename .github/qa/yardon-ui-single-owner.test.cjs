'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name)}
check('Exactly one SMART menu card and navigation item, no AI Operations page',()=>{
 const h=read('index.html');
 assert.equal((h.match(/data-view="smartReplanning"/g)||[]).length,1);
 assert.equal((h.match(/data-home-target="smartReplanning"/g)||[]).length,1);
 assert.equal((h.match(/id="smartReplanning"/g)||[]).length,1);
 assert(!h.includes('id="aiOperations"'));
 assert(!h.includes('data-view="aiOperations"'));
 assert(!h.includes('src="modules/services/yardivo-smart-replanning-v1.js'));
 assert(!h.includes('src="modules/ai/yardon-ai-operations-v1.js'));
});
check('Legacy manager hardlock remains unloaded',()=>{
 assert(!read('index.html').includes('<script id="yardivo-manager-single-view-hard-lock-v5"'));
});
check('SMART visible to Admin, Inventory and Reception, not to Gate or Supplier',()=>{
 const role=read('modules/auth/role-visibility.js');
 const nav=read('styles/yardon-navigation-single-owner.css');
 assert(role.includes("inventory:new Set(['smartReplanning'"));
 assert(role.includes("reception:new Set(['smartReplanning'"));
 assert(role.includes("if(id==='aiOperations')return false;"));
 assert(!nav.includes('#smartReplanning'));
 assert(nav.includes('#aiOperations'));
});
check('SMART single controller owns server planning, proposal popup and activity',()=>{
 const smart=read('modules/smart/yardon-smart-center-v1.js');
 assert(smart.includes("function maybePopup()"));
 assert(smart.includes("role()!=='inventory'"));
 assert(smart.includes("action:'smart_activity'"));
 assert(smart.includes("approve_change"));
 assert(smart.includes("reject_change"));
 assert(smart.includes("function backgroundSmart()"));
 assert(smart.includes("window.YardivoSmartReplanning={scanNow"));
 assert(!smart.includes("document.querySelector('.nav-btn[data-view=\"aiOperations\"]')"));
});
check('Server enforces Inventory approvals, warehouse scope, audit and freshness',()=>{
 const server=read('supabase/functions/yardivo-ai-operations/index.ts');
 assert(server.includes('String(p.role||"")!=="inventory"'));
 assert(server.includes('action==="smart_activity"'));
 assert(server.includes('allowedWarehouses(p,await master())'));
 assert(server.includes('actualDock!==expectedDock'));
 assert(server.includes('d.resolvedBy='));
});
check('Manager navbar has one idempotent menu owner',()=>{
 const manager=read('modules/supplier/yardivo-manager-final-authority-v4.js');
 const role=read('modules/auth/role-visibility.js');
 const assignment=read('modules/supplier/yardivo-manager-assignment-system-v583.js');
 const scope=read('modules/supplier/yardivo-manager-scope-popup-v2.js');
 assert(manager.includes('function syncMenu('));
 assert(manager.includes("if(el.style.getPropertyValue('display')!==target"));
 assert(manager.includes("window.YardivoManagerFinalV4={init,forceView,syncMenu"));
 assert(role.includes("if(r==='manager'){"));
 assert(assignment.includes('window.YardivoManagerFinalV4?.syncMenu?.()'));
 assert(scope.includes('window.YardivoManagerFinalV4?.syncMenu?.()'));
 assert(!manager.includes("obs.observe(document.body,{subtree:true,childList:true,attributes:true"));
});
check('Overview supplier options use only Master data',()=>{
 const home=read('modules/supplier/runtime/yardivo-home-overview-stability.js');
 assert(home.includes("window.YardivoAppStateV583?.master?.()"));
 assert(!home.includes("(announcements||[]).forEach"));
});
check('EPAL and Order Search never run Home repaint watchdogs',()=>{
 const epal=read('modules/services/yardivo-epal-module.js');
 const order=read('modules/services/yardivo-order-search-module.js');
 assert(!epal.includes('setInterval(()=>'));
 assert(!order.includes('setInterval(homeCard,3000)'));
 assert(epal.includes('function refreshVisibleEpal()'));
 assert(order.includes("window.addEventListener('yardivo:login'"));
});
console.log('YARDON_SINGLE_OWNER_QA_PASS '+passed+'/'+passed);
