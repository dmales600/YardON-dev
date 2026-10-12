'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const get=p=>fs.readFileSync(p,'utf8');
const files={
 html:get('index.html'),auth:get('services/auth.js'),roles:get('modules/auth/role-ui.js'),
 visibility:get('modules/auth/role-visibility.js'),
 owner:get('modules/supplier/yardivo-role-stability-final-v6-20260902-js.js'),
 adminUi:get('modules/supplier/yardivo-admin-user-creation-redesign-v583.js'),
 adminCtrl:get('modules/supplier/yardivo-v545-user-admin-controller.js'),
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
console.log('YARDON_DISPATCHER_TMS_QA_PASS '+pages.length+' scoped TMS sections, Auth, Edge, RLS, manifest');
