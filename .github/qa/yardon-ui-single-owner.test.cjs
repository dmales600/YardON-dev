'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name)}
check('No AI Operations static navigation or Home card',()=>{
 const h=read('index.html');
 assert(!h.includes('<button class="nav-btn" data-view="aiOperations"'));
 assert(!h.includes('<button class="home-menu-card" data-home-target="aiOperations"'));
 assert(h.includes('id="aiOperations" hidden'));
});
check('Legacy manager mutation hardlock is not loaded',()=>{
 assert(!read('index.html').includes('<script id="yardivo-manager-single-view-hard-lock-v5"'));
});
check('Both retired sections hidden before first paint',()=>{
 const head=read('index.html').slice(0,5000);
 for(const s of ['#aiOperations,#smartReplanning','[data-view="smartReplanning"]','[data-home-target="aiOperations"]'])
 assert(head.includes(s),s+' pre-paint stylesheet missing');
});
check('Only Smart engine remains; no menu auto insertion',()=>{
 const smart=read('modules/services/yardivo-smart-replanning-v1.js');
 const maps=read('modules/services/yardivo-v583-maps-header-smart-master-final-js.js');
 assert(smart.includes('window.YardivoSmartReplanning={scanNow'));
 assert(smart.includes('setInterval(()=>'));
 assert(!smart.includes('insertAdjacentHTML('));
 assert(!maps.includes('insertAdjacentHTML('));
});
check('Duplicate AI Operations panel is disabled, backend code preserved',()=>{
 const ai=read('modules/ai/yardon-ai-operations-v1.js');
 assert(ai.includes('return false;')&&ai.includes("document.querySelector('.nav-btn[data-view=\"aiOperations\"]')?.remove()"));
 assert(ai.includes('functions.invoke('));
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
console.log('YARDON_SINGLE_OWNER_QA_PASS '+passed+'/'+passed);
