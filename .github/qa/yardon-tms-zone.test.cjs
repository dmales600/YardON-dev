'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const get=p=>fs.readFileSync(p,'utf8');
const html=get('index.html'),manifest=JSON.parse(get('app/module-manifest.json'));
const planner=get('modules/tms/tms-zone-planner-v2.js'),dispatcher=get('modules/tms/dispatcher-v1.js');
const sql=get('supabase/migrations/20261012073000_tms_zone_trip_pallets.sql');
for(const id of ['tmsControl','tmsZones','tmsSettings','tmsRoutes','tmsLoads']){
 assert(dispatcher.includes("'"+id+"'"),id+' missing from navigation');
 assert(planner.includes(id),id+' missing from planner');
}
for(const table of ['yardon_tms_zones','yardon_tms_stores','yardon_tms_trips','yardon_tms_pallets'])
 assert(sql.includes('CREATE TABLE IF NOT EXISTS public.'+table),'missing '+table);
assert(sql.includes('ENABLE ROW LEVEL SECURITY'),'RLS missing');
assert(sql.includes('a.auth_user_id=(SELECT auth.uid())'),'Auth role lookup missing');
assert(sql.includes("a.app_role=''dispatcher''"),'Dispatcher policy missing');
assert(sql.includes('FOR UPDATE;'),'Pallet capacity serialization missing');
assert(sql.includes('TMS_TRUCK_FULL'),'Capacity guard missing');
assert(sql.includes('UNIQUE(warehouse,pallet_code)'),'Pallet uniqueness missing');
assert(sql.includes('FOREIGN KEY(trip_id,warehouse,zone_id)'),'Cross-zone FK missing');
assert(planner.includes("dataTransfer?.getData('text/plain')"),'Drop handler missing');
assert(planner.includes('state.selection'),'Tap assignment missing');
assert(planner.includes(".is('trip_id',null)"),'Concurrent pallet assignment predicate missing');
assert(planner.includes('await load();draw(active())'),'Persisted re-fetch missing');
assert(html.includes('modules/tms/tms-zone-planner-v2.js'),'Missing runtime loader');
assert(manifest.scripts.some(x=>x.path==='modules/tms/tms-zone-planner-v2.js'),'Missing manifest');
assert(html.includes('dispatcher-v1.css?v=20261012-tms2'),'Missing CSS cache bust');
console.log('YARDON_TMS_ZONE_QA_PASS: RLS, zone/stores, trucks, capacity, drag/drop, runtime');
