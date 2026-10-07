import { createClient } from "jsr:@supabase/supabase-js@2.116.0";

const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...H,"Content-Type":"application/json","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")||"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
async function sha(v){const d=await crypto.subtle.digest("SHA-256",enc.encode(v));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function tok(){const b=new Uint8Array(32);crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
const parse=(v,f)=>{try{return (typeof v==='string'?JSON.parse(v):v)??f}catch{return f}};
const norm=v=>String(v??'').trim().toUpperCase().replace(/[\s._\/-]+/g,'');
const normPerson=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'');
const terminal=v=>["COMPLETED","REJECTED","CANCELLED","REVOKED","EXPIRED"].includes(String(v||'').toUpperCase());

async function master(){
  const {data,error}=await db.from('yardivo_app_state').select('value_json').eq('key','yardivo_master_data_registry_v583').eq('deleted',false).maybeSingle();
  if(error)throw error;return parse(data?.value_json,{locations:[],warehouses:[]});
}
async function qrCfg(){
  const {data,error}=await db.from('yardivo_app_state').select('value_json').eq('key','yardivo_qr_scan_cfg_v583').eq('deleted',false).maybeSingle();
  if(error)throw error;return parse(data?.value_json,{enabled:true,byWarehouse:{}});
}
function roleQr(c,w){
  const x=c?.byWarehouse?.[w];
  if(x&&typeof x==='object'&&typeof x.gate==='boolean')return x.gate;
  if(x&&typeof x==='object'&&typeof x.enabled==='boolean')return x.enabled;
  if(typeof x==='boolean')return x;
  return c?.enabled!==false;
}
function warehouseIdsForLocation(m,loc){return (m.warehouses||[]).filter(w=>w&&w.active!==false&&String(w.location_id||'')===String(loc)).map(w=>String(w.id))}
function locationGateEnabled(c,m,loc){return warehouseIdsForLocation(m,loc).some(w=>roleQr(c,w))}
async function wallContext(raw){
  const {data,error}=await db.from('yardivo_app_state').select('value_json').eq('key','yardivo_self_gate_wall_tokens_v1').eq('deleted',false).maybeSingle();
  if(error)throw error;
  const x=parse(data?.value_json,{}),m=await master();
  for(const [k,v] of Object.entries(x||{})){
    if(String(v?.token||'')!==raw)continue;
    let location=String(v?.location_id||'');
    if(!location){const w=(m.warehouses||[]).find(z=>String(z.id)===String(k));location=String(w?.location_id||'')}
    if(location)return {location,key:String(k)};
  }
  return null;
}
async function event(passId,kind,message,actorRole='driver',actorName='Vozač'){
  const {error}=await db.from('yardivo_delivery_pass_events').insert({delivery_pass_id:passId,kind,message,actor_role:actorRole,actor_name:actorName});
  if(error)throw error;
}
async function findSession(raw){
  const h=await sha(raw),{data,error}=await db.from('yardivo_delivery_passes').select('*').eq('wall_session_token_hash',h).maybeSingle();
  if(error)throw error;return data;
}
function appAt(p){
  const d=String(p?.delivery_date||p?.date||'').slice(0,10),t=String(p?.requested_time||p?.time||'').slice(0,5);
  if(!d)return null;
  const z=new Date(`${d}T${t||'00:00'}:00+02:00`);
  return Number.isFinite(z.getTime())?z.toISOString():null;
}
function dockLabel(v){const s=String(v||'').trim();return s?'Rampa '+s.replace(/^R/i,''):''}
function appointmentOnTime(pass){if(!pass?.appointment_at)return false;const t=new Date(pass.appointment_at).getTime(),now=Date.now();return now>=t-15*60*1000&&now<=t+30*60*1000}
async function dockAvailable(pass){
  const dock=String(pass?.dock||'').trim();if(!dock)return false;
  let q=db.from('yardivo_delivery_passes').select('id').eq('warehouse',String(pass.warehouse||'')).eq('dock',dock).in('state',['PROCEED_DOCK']);
  if(pass.id)q=q.neq('id',pass.id);
  const {data,error}=await q.limit(1);if(error)throw error;return !(data||[]).length;
}
async function maybeAutoDock(p){
  if(!p||p.gate_decision!=='APPROVED'||!p.dock||!['PARKING','WAITING_DOCK'].includes(String(p.state)))return p;
  if(!appointmentOnTime(p)||!(await dockAvailable(p)))return p;
  const msg=`Rampa je slobodna i termin je aktivan. Idite na ${dockLabel(p.dock)}.`;
  const {data,error}=await db.from('yardivo_delivery_passes').update({state:'PROCEED_DOCK',parking_slot:null,last_instruction:msg,updated_at:new Date().toISOString()}).eq('id',p.id).select('*').single();
  if(error)throw error;await event(p.id,'instruction',msg,'reception','YardOn PRIJAM');return data||p;
}

function annKeys(x){
  const p=x?.payload||{};
  return [x?.announcement_id,p.id,p.announcementRef,p.orderNumber,p.reference,p.supplierDeliveryId,p.supplierPortalId,p.plannedPlate,p.vehiclePlate,p.arrivalPlate].map(norm).filter(Boolean);
}
function deliveryKeys(x){return [x?.id,x?.client_id,x?.order_number,x?.vehicle_plate,x?.trailer_plate].map(norm).filter(Boolean)}
function annSort(a,b){const ta=String(a?.appointment_date||'')+String(a?.appointment_time||''),tb=String(b?.appointment_date||'')+String(b?.appointment_time||'');return tb.localeCompare(ta)}
async function announcementsFor(whIds){
  const {data,error}=await db.from('yardivo_announcements').select('*').in('warehouse',whIds).eq('deleted',false).order('appointment_date',{ascending:false}).limit(300);
  if(error)throw error;return data||[];
}
async function resolveInLocation(ref,whIds){
  const key=norm(ref),anns=await announcementsFor(whIds);
  const exact=anns.find(x=>norm(x?.announcement_id)===key||norm(x?.payload?.id)===key);
  if(exact)return exact;
  const direct=anns.filter(x=>annKeys(x).includes(key)).sort(annSort)[0];
  if(direct)return direct;
  const {data:ds,error}=await db.from('yardivo_supplier_deliveries').select('id,client_id,order_number,vehicle_plate,trailer_plate,warehouse,status,delivery_date,requested_time').in('warehouse',whIds).order('delivery_date',{ascending:false}).limit(300);
  if(error)throw error;
  const active=(ds||[]).filter(x=>!['rejected','completed','cancelled','canceled'].includes(String(x.status||'').toLowerCase()));
  const rest=(ds||[]).filter(x=>!active.includes(x));
  const dHit=[...active,...rest].find(x=>deliveryKeys(x).includes(key));
  if(!dHit)return null;
  return anns.find(x=>String(x?.payload?.supplierDeliveryId||'')===String(dHit.id))||null;
}
async function expectedCheckin(hit){
  const p=hit?.payload||{},deliveryId=String(p.supplierDeliveryId||'').trim();
  let d:any=null;
  if(deliveryId){
    const q=await db.from('yardivo_supplier_deliveries').select('vehicle_plate,driver_name,trailer_plate').eq('id',deliveryId).maybeSingle();
    if(q.error)throw q.error;d=q.data;
  }
  return {
    plate:String(d?.vehicle_plate||p.plannedPlate||p.vehiclePlate||p.arrivalPlate||'').trim(),
    driver:String(d?.driver_name||p.plannedDriver||p.driverNameCanonical||p.driverName||'').trim()
  };
}
async function resolveGlobal(ref,m){
  const all=(m.warehouses||[]).filter(w=>w&&w.active!==false).map(w=>String(w.id));
  const hit=await resolveInLocation(ref,all);if(!hit)return null;
  const wh=String(hit.warehouse||hit.payload?.warehouse||''),w=(m.warehouses||[]).find(x=>String(x.id)===wh),loc=(m.locations||[]).find(x=>String(x.id)===String(w?.location_id||''));
  return {hit,locationId:String(w?.location_id||''),locationName:String(loc?.name||w?.location_id||'')};
}
async function issueFor(hit,m){
  const p=hit.payload||{},deliveryId=String(p.supplierDeliveryId||'').trim()||null;
  let delivery=null;
  if(deliveryId){const q=await db.from('yardivo_supplier_deliveries').select('*').eq('id',deliveryId).maybeSingle();if(q.error)throw q.error;delivery=q.data}
  const wh=String(hit.warehouse||p.warehouse||delivery?.warehouse||''),w=(m.warehouses||[]).find(x=>String(x.id)===wh),loc=String(w?.location_id||delivery?.location||p.location||'');
  let ex:any={data:null,error:null};
  if(deliveryId)ex=await db.from('yardivo_delivery_passes').select('*').eq('supplier_delivery_id',deliveryId).order('updated_at',{ascending:false}).limit(1).maybeSingle();
  if(!ex.data)ex=await db.from('yardivo_delivery_passes').select('*').eq('announcement_id',String(hit.announcement_id)).maybeSingle();
  if(ex.error)throw ex.error;
  if(ex.data&&!terminal(ex.data.state)){
    const canonicalSupplier=String(delivery?.supplier_name||hit.supplier||p.supplier||ex.data.supplier_name||'Dobavljač');
    const {data,error}=await db.from('yardivo_delivery_passes').update({announcement_id:String(hit.announcement_id),supplier_delivery_id:deliveryId,supplier_name:canonicalSupplier,warehouse:wh,location:loc,dock:null,payload:{...(ex.data.payload||{}),order_number:delivery?.order_number||p.orderNumber||'',pallets:delivery?.pallets??p.pallets??0,sku:delivery?.sku_count??p.sku??0,planned_dock:null},updated_at:new Date().toISOString()}).eq('id',ex.data.id).select('*').single();
    if(error)throw error;return data||ex.data;
  }
  const raw=tok(),h=await sha(raw);
  const row={announcement_id:String(hit.announcement_id),supplier_delivery_id:deliveryId,pass_token_hash:h,wall_session_token_hash:null,warehouse:wh,location:loc,supplier_name:String(delivery?.supplier_name||hit.supplier||p.supplier||'Dobavljač'),appointment_at:appAt(delivery||p),dock:null,parking_slot:null,driver_name:delivery?.driver_name||null,driver_phone:delivery?.driver_contact||null,vehicle_plate:delivery?.vehicle_plate||p.plannedPlate||p.vehiclePlate||null,trailer_plate:delivery?.trailer_plate||null,carrier_company:null,state:'OPEN',gate_decision:null,last_instruction:'Self Gate najava je pronađena. Dovršite check-in.',checked_in_at:null,completed_at:null,payload:{order_number:delivery?.order_number||p.orderNumber||'',pallets:delivery?.pallets??p.pallets??0,sku:delivery?.sku_count??p.sku??0,planned_dock:null},updated_at:new Date().toISOString()};
  if(ex.data){const {data,error}=await db.from('yardivo_delivery_passes').update(row).eq('id',ex.data.id).select('*').single();if(error)throw error;return data}
  const {data,error}=await db.from('yardivo_delivery_passes').insert(row).select('*').single();if(error)throw error;return data;
}
async function notifyGate(p,hit,iso){
  const key='yardivo_live_notifications_v1',{data:s,error:se}=await db.from('yardivo_app_state').select('*').eq('key',key).eq('deleted',false).maybeSingle();if(se)throw se;
  let list=parse(s?.value_json,[]);if(!Array.isArray(list))list=[];
  const id='GATE-REQ-'+String(p.id),n={id,event:'GATE_ENTRY_REQUEST',type:'warning',title:'ZAHTJEV ZA ULAZ',body:`${p.vehicle_plate||'Vozilo'} · ${p.driver_name||'Vozač'} · čeka odobrenje Porte`,roles:['gate','admin'],deliveryPassId:String(p.id),announcementId:String(p.announcement_id||hit?.announcement_id||''),supplierDeliveryId:String(p.supplier_delivery_id||''),warehouse:String(p.warehouse||''),location:String(p.location||''),source:'self_gate',at:iso,createdAt:iso,readBy:{}};
  list=[...list.filter(x=>String(x?.id)!==id),n].slice(-500);
  const patch={value_json:JSON.stringify(list),updated_at:iso,updated_by:'yardivo-self-gate-public',client_id:'yardivo-self-gate-public',deleted:false};
  const q=s?.key?await db.from('yardivo_app_state').update(patch).eq('key',key):await db.from('yardivo_app_state').insert({key,...patch});if(q.error)throw q.error;
}
function inactiveMessage(v){const s=String(v||'').toUpperCase();if(s==='COMPLETED')return 'ISPORUKA JE ZAVRŠENA.';if(s==='REJECTED')return 'ISPORUKA JE ODBIJENA.';if(s==='CANCELLED')return 'NAJAVA JE OTKAZANA.';return 'DELIVERY PASS VIŠE NIJE AKTIVAN.'}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});
  if(req.method!=='POST')return J({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  try{
    const b=await req.json().catch(()=>({})),action=String(b.action||'').toLowerCase(),raw=String(b.token||'').trim();
    if(!raw)return J({ok:false,error:'TOKEN_REQUIRED'},400);

    if(action==='wall_status'){
      const wc=await wallContext(raw);if(!wc)return J({ok:false,error:'WALL_QR_INVALID',message:'Self Gate QR nije valjan.'},404);
      const cfg=await qrCfg(),m=await master(),loc=(m.locations||[]).find(x=>String(x.id)===wc.location);
      return J({ok:true,enabled:locationGateEnabled(cfg,m,wc.location),location:wc.location,locationName:String(loc?.name||wc.location),warehouseName:String(loc?.name||wc.location),warehouses:warehouseIdsForLocation(m,wc.location)});
    }

    if(action==='wall_submit'){
      const wc=await wallContext(raw);if(!wc)return J({ok:false,error:'WALL_QR_INVALID',message:'Self Gate QR nije valjan.'},404);
      const cfg=await qrCfg(),m=await master(),whIds=warehouseIdsForLocation(m,wc.location);
      if(!whIds.length||!locationGateEnabled(cfg,m,wc.location))return J({ok:false,error:'SELF_CHECK_IN_NE_RADI_JAVITE_SE_PORTI',message:'Self Check-In trenutno ne radi. Javite se Porti.'},409);
      const ref=String(b.reference||'').trim();if(!ref)return J({ok:false,error:'UNESITE_BROJ_NAJAVE_ILI_NARUDZBE',message:'Unesite broj najave, broj narudžbe ili registraciju vozila.'},400);
      const hit=await resolveInLocation(ref,whIds);
      if(!hit){
        const elsewhere=await resolveGlobal(ref,m);
        if(elsewhere&&elsewhere.locationId!==wc.location)return J({ok:false,error:'NAJAVA_JE_NA_DRUGOJ_LOKACIJI',message:`Najava je pronađena, ali pripada lokaciji ${elsewhere.locationName||elsewhere.locationId}. Skenirajte Self Gate QR na toj lokaciji.`},409);
        return J({ok:false,error:'NAJAVA_NIJE_PRONADJENA_ZA_OVU_LOKACIJU',message:'Najava nije pronađena. Provjerite broj najave/narudžbe ili unesite registraciju vozila iz najave.'},404);
      }
      const hitWh=String(hit.warehouse||hit.payload?.warehouse||'');if(!roleQr(cfg,hitWh))return J({ok:false,error:'SELF_CHECK_IN_ISKLJUCEN_ZA_SKLADISTE_NAJAVE',message:'Self Check-In nije aktivan za skladište ove najave.'},409);
      const enteredPlate=String(b.plate||'').trim(),enteredDriver=String(b.driver||'').trim(),expected=await expectedCheckin(hit);
      if(expected.plate&&!enteredPlate)return J({ok:false,error:'REGISTRACIJA_OBAVEZNA',message:'Unesite registraciju vozila iz najave.'},400);
      if(expected.plate&&norm(enteredPlate)!==norm(expected.plate))return J({ok:false,error:'REGISTRACIJA_SE_NE_PODUDARA',message:'Registracija vozila ne odgovara najavi.'},409);
      if(expected.driver&&!enteredDriver)return J({ok:false,error:'VOZAC_OBAVEZAN',message:'Unesite ime vozača iz najave.'},400);
      if(expected.driver&&normPerson(enteredDriver)!==normPerson(expected.driver))return J({ok:false,error:'VOZAC_SE_NE_PODUDARA',message:'Ime vozača ne odgovara najavi.'},409);
      let p=await issueFor(hit,m);
      const session=tok(),sh=await sha(session),iso=new Date().toISOString(),w=(m.warehouses||[]).find(x=>String(x.id)===hitWh),whName=String(w?.name||hitWh),early=p.appointment_at?Date.now()<new Date(p.appointment_at).getTime()-15*60*1000:false;
      let instruction=`Najava pronađena · ${whName}. Čeka se odobrenje Porte.`;
      if(early)instruction=`Najava pronađena · ${whName}. Došli ste ranije; nakon odobrenja YardOn će odrediti rampu ili prvo slobodno parking mjesto.`;
      const wallPlate=String(b.plate||'').trim().toUpperCase()||p.vehicle_plate,wallDriver=String(b.driver||'').trim()||p.driver_name,wallPhone=String(b.phone||'').trim()||p.driver_phone;
      const upd=await db.from('yardivo_delivery_passes').update({wall_session_token_hash:sh,vehicle_plate:wallPlate,driver_name:wallDriver,driver_phone:wallPhone,state:'WAITING_GATE',checked_in_at:iso,last_instruction:instruction,location:wc.location,warehouse:hitWh,updated_at:iso}).eq('id',p.id).select('*').single();if(upd.error)throw upd.error;p=upd.data||p;
      if(p.supplier_delivery_id){const q=await db.from('yardivo_supplier_deliveries').update({vehicle_plate:wallPlate||null,driver_name:wallDriver||null,driver_contact:wallPhone||null,updated_at:iso}).eq('id',p.supplier_delivery_id);if(q.error)throw q.error}
      await event(p.id,'self_checkin',`Self Gate Check-In zaprimljen · ${whName}. Čeka se odobrenje Porte.`,'driver',wallDriver||'Vozač');
      await notifyGate(p,hit,iso);
      return J({ok:true,sessionToken:session,location:wc.location,warehouse:hitWh,warehouseName:whName,announcementId:String(hit.announcement_id),plannedDock:null});
    }

    let p=await findSession(raw);if(!p)return J({ok:false,error:'DELIVERY_PASS_INVALID',message:'Delivery Pass nije pronađen.'},404);
    if(terminal(p.state))return J({ok:false,error:'DELIVERY_PASS_INACTIVE',message:inactiveMessage(p.state),state:p.state},410);

    if(action==='status'){
      const aq=await db.from('yardivo_announcements').select('status,payload').eq('announcement_id',p.announcement_id).eq('deleted',false).maybeSingle();if(aq.error)throw aq.error;
      const as=String(aq.data?.status||aq.data?.payload?.status||'').toUpperCase();
      if(['ZAPRIMLJENO','COMPLETED','RECEIVED','ODBIJEN','REJECTED','OTKAZAN','OTKAZANO','CANCELLED','CANCELED'].includes(as)){
        let ns='COMPLETED';if(['ODBIJEN','REJECTED'].includes(as))ns='REJECTED';if(['OTKAZAN','OTKAZANO','CANCELLED','CANCELED'].includes(as))ns='CANCELLED';
        await db.from('yardivo_delivery_passes').update({state:ns,completed_at:ns==='COMPLETED'?new Date().toISOString():p.completed_at,updated_at:new Date().toISOString()}).eq('id',p.id);
        return J({ok:false,error:'DELIVERY_PASS_INACTIVE',message:inactiveMessage(ns),state:ns},410);
      }
      /* Ramp assignment is owned exclusively by yardivo-yard-dispatch after Gate approval. */
      const m=await master(),w=(m.warehouses||[]).find(x=>String(x.id)===String(p.warehouse)),locId=String(p.location||w?.location_id||''),loc=(m.locations||[]).find(x=>String(x.id)===locId),ev=await db.from('yardivo_delivery_pass_events').select('*').eq('delivery_pass_id',p.id).order('created_at',{ascending:false}).limit(30);if(ev.error)throw ev.error;
      return J({ok:true,pass:{...p,location:locId,location_name:String(loc?.name||locId),warehouse_name:String(w?.name||p.warehouse)},events:ev.data||[]});
    }

    if(action==='driver_message'){
      const msg=String(b.message||'').trim().slice(0,1000);if(!msg)return J({ok:false,error:'EMPTY_MESSAGE',message:'Upišite poruku.'},400);
      await event(p.id,'driver_message',msg,'driver',p.driver_name||'Vozač');
      const iso=new Date().toISOString(),key='yardivo_live_notifications_v1',{data:s,error:se}=await db.from('yardivo_app_state').select('*').eq('key',key).eq('deleted',false).maybeSingle();if(se)throw se;
      let list=parse(s?.value_json,[]);if(!Array.isArray(list))list=[];
      const n={id:'SELF-GATE-MSG-'+String(p.id)+'-'+String(Date.now()),event:'SELF_GATE_DRIVER_MESSAGE',type:'info',title:'PORUKA VOZAČA',body:`${p.supplier_name||'Dobavljač'} · ${p.vehicle_plate||'vozilo'} · ${msg}`,roles:['reception'],deliveryPassId:String(p.id),announcementId:String(p.announcement_id||''),supplierDeliveryId:String(p.supplier_delivery_id||''),warehouse:String(p.warehouse||''),location:String(p.location||''),source:'self_gate_chat',at:iso,createdAt:iso,readBy:{}};
      list=[...list,n].slice(-500);const patch={value_json:JSON.stringify(list),updated_at:iso,updated_by:'yardivo-self-gate-public',client_id:'yardivo-self-gate-public',deleted:false};
      const q=s?.key?await db.from('yardivo_app_state').update(patch).eq('key',key):await db.from('yardivo_app_state').insert({key,...patch});if(q.error)throw q.error;
      return J({ok:true});
    }
    return J({ok:false,error:'UNKNOWN_ACTION'},400);
  }catch(e){return J({ok:false,error:'SELF_GATE_ERROR',message:String(e?.message||e)},500)}
});