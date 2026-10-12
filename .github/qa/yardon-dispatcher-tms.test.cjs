'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const get=p=>fs.readFileSync(p,'utf8');
const files={
 html:get('index.html'),auth:get('services/auth.js'),roles:get('modules/auth/role-ui.js'),
 visibility:get('modules/auth/role-visibility.js'),
 owner:get('modules/supplier/yardivo-role-stability-final-v6-20260902-js.js'),
 adminUi:get('modules/supplier/yardivo-admin-user-creation-redesign-v583.js'),
 adminCtrl:get('modules/supplier/yardivo-v545-user-admin-controller.js'),
 lateLogin:get('modules/supplier/runtime/yardivo-final-login-interaction-fix-js-20260831.js'),
 tms:get('modules/tms/dispatcher-v1.js'),
 sync:get('supabase/functions/yardivo-sync/index.ts'),
 admins:get('supabase/functions/yardivo-admin-users/index.ts'),
 schema:get('supabase/migrations/20261012064550_allow_dispatcher_role.sql'),
 css:get('styles/dispatcher-v1.css'),
 manifest:get('app/module-manifest.json')
};
const pages=['tmsControl','tmsZones','tmsRoutes','tmsDock','tmsLoads','tmsTracking','tmsHistory'];
for(const path of pages) {
 assert(files.tms.includes("'"+path+"'"),'Missing TMS section: '+path);
 assert(files.visibility.includes("'"+path+"'"),'Missing role visibility allowlist: '+path);
 assert(files.owner.includes("'"+path+"'"),'Missing canonical router allowlist: '+path);
}
assert(files.html.includes('option value="dispatcher"'),'Login dropdown includes Dispatcher');
assert(files.roles.includes("['dispatcher','Dispatcher']"),'Login role owner includes Dispatcher');
assert(files.adminCtrl.includes("['dispatcher','Dispatcher']"),'Admin user selector includes Dispatcher');
assert(files.lateLogin.includes("['dispatcher','Dispatcher']"),'Late login repair must never remove Dispatcher');
assert(files.html.includes('yardivo-final-login-interaction-fix-js-20260831.js?v=20261012-dispatcher-login1'),'Cache bust late login repair');
assert(files.html.includes('yardivo-v545-user-admin-controller.js?v=20261012-dispatcher-login1'),'Cache bust canonical login list');
assert(files.auth.includes("dispatcher:'Dispatcher'"),'Server-side profile role is recognized on login');
assert(files.adminUi.includes("dispatcher:{label:'Dispatcher'"),'Admin user create includes Dispatcher');
assert(files.admins.includes('"supplier","dispatcher"'),'Server-side user management recognizes Dispatcher');
assert(files.sync.includes('"gate","dispatcher"'),'Live sync accepts Dispatcher profile');
assert(files.sync.includes('role==="dispatcher"?'),'Dispatcher gets restricted bootstrap state');
assert(!/role==="dispatcher"\)\s*return\s*true/.test(files.sync),'Dispatcher must not get write permission');
assert(files.schema.includes("'dispatcher'"),'Database role constraint supports Dispatcher');
assert(files.html.includes('modules/tms/dispatcher-v1.js'),'TMS module loads');
assert(files.html.includes('styles/dispatcher-v1.css'),'TMS stylesheet loads');
assert(files.tms.includes("Bez demonstracijskih zapisa"),'No fake operational data');
assert(files.tms.includes('tmsSelectedZone'),'Zone selection is implemented');
assert(files.css.includes('prefers-reduced-motion'),'Mobile/reduced motion is respected');
const manifest=JSON.parse(files.manifest);
assert(manifest.scripts.some(x=>x.path==='modules/tms/dispatcher-v1.js'),'TMS module registered in manifest');
assert(manifest.css.files.includes('styles/dispatcher-v1.css'),'TMS stylesheet registered in manifest');

// Runtime regression: the late interaction fix used to replace the role list
// at 700ms after load and remove Dispatcher. Simulate all real login owners.
const canonical=['admin','manager','dispatcher','inventory','reception','gate','supplier'];
const htmlLogin=files.html.match(/<select id="loginRole">([\s\S]*?)<\/select>/);
assert(htmlLogin,'Login select markup missing');
const parseOptions=markup=>[...markup.matchAll(/<option value="([^"]+)">([^<]*)<\/option>/g)]
  .map(x=>({value:x[1],label:x[2]}));
const timers=[],listeners={};
const select={
 value:'admin',options:parseOptions(htmlLogin[1]),writes:0,disabled:false,
 style:{removeProperty(){},pointerEvents:'auto'},
 closest(){return {style:{removeProperty(){}},classList:{remove(){}},hidden:false}},
 removeAttribute(){},
 set innerHTML(value){this.options=parseOptions(value);this.value=this.options[0]?.value||'';this.writes++},
 get innerHTML(){return this.options.map(x=>'<option value="'+x.value+'">'+x.label+'</option>').join('')}
};
const doc={
 readyState:'loading',
 getElementById(id){return id==='loginRole'?select:null},
 querySelectorAll(){return []},
 addEventListener(type,fn){(listeners['document:'+type]||=[]).push(fn)}
};
const win={
 addEventListener(type,fn){(listeners['window:'+type]||=[]).push(fn)}
};
const context=vm.createContext({
 document:doc,window:win,
 setTimeout(fn,delay){timers.push({fn,delay:Number(delay)||0});return timers.length},
 clearTimeout(){}
});
for(const source of [files.roles,files.lateLogin,files.adminCtrl])vm.runInContext(source,context);
for(const fn of (listeners['document:DOMContentLoaded']||[]))fn();
for(const fn of (listeners['window:load']||[]))fn();
select.value='dispatcher';
for(const timer of timers.slice().sort((a,b)=>a.delay-b.delay))timer.fn();
assert.deepEqual(select.options.map(x=>x.value),canonical,'Login options must retain Dispatcher after delayed resets');
assert.equal(select.value,'dispatcher','Late role owners must preserve selected Dispatcher');
assert.equal(select.writes,1,'Late role owners must not repaint login select repeatedly');

console.log('YARDON_DISPATCHER_TMS_QA_PASS '+pages.length+' scoped TMS sections, Auth, Edge, RLS, manifest');
