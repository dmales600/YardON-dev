import { createClient } from "jsr:@supabase/supabase-js@2.116.0";

const H={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const J=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...H,"Content-Type":"application/json","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")??"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"",{auth:{persistSession:false,autoRefreshToken:false}});

const role=(v:any)=>{let r=String(v??'').trim().toLowerCase();if(r==='voditelj'||r==='management')r='manager';if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';if(r==='prijam')r='reception';return r};
const arr=(v:any)=>Array.isArray(v)?[...new Set(v.map(String).filter(Boolean))]:[];
const n=(v:any,min=1)=>{const x=Number(v);if(!Number.isInteger(x)||x<min)throw new Error(`Vrijednost mora biti cijeli broj >= ${min}.`);return x};
const date=(v:any)=>{const x=String(v??'');if(!/^\d{4}-\d{2}-\d{2}$/.test(x))throw new Error('Datum dostave je obavezan.');const wd=new Date(x+'T12:00:00Z').getUTCDay();if(wd===0)throw new Error('Nedjeljom skladište ne radi. Odaberi drugi datum.');if(wd===6)throw new Error('Subotom skladište ne radi. Odaberi drugi datum.');return x};
const time=(v:any)=>{const x=String(v??'').slice(0,5);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(x))throw new Error('Odaberi valjani termin.');return x};
const mins=(v:any)=>{const [h,m]=String(v||'').slice(0,5).split(':').map(Number);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:NaN};
const hhmm=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const dur=(pallets:number,rate:number)=>Math.max(30,Math.ceil(((pallets/rate)*60)/15)*15);
const warehouseOpenOn=(w:any,d:string)=>{const day=new Date(`${d}T12:00:00Z`).getUTCDay();const configured=Array.isArray(w?.working_days)?w.working_days.map(Number).filter((x:number)=>x>=0&&x<=6):null;const days=configured?.length?configured:[1,2,3,4,5];return days.includes(day)};
const order=(v:any)=>{const x=String(v??'').trim().toUpperCase();if(x&&!/^6W[A-Z0-9._/-]*$/.test(x))throw new Error('Broj narudžbe mora počinjati s 6W.');return x||null};
const utc=(d:string,t:string)=>new Date(`${d}T${t}:00.000Z`).toISOString();

async function profile(req:Request){
  const h=req.headers.get('Authorization')??'';
  if(!h.startsWith('Bearer '))throw new Error('Nedostaje prijava.');
  const {data:u,error:e}=await db.auth.getUser(h.slice(7));
  if(e||!u.user?.id)throw new Error('Neispravna prijava.');
  const {data:p,error:pe}=await db.from('yardivo_user_access')
    .select('auth_user_id,username,app_role,location,locations,active,warehouses,supplier_id,supplier_name,all_locations,all_warehouses')
    .eq('auth_user_id',u.user.id).maybeSingle();
  if(pe)throw pe;if(!p?.active)throw new Error('Account nije aktivan.');return p;
}
async function master(){
  const {data,error}=await db.from('yardivo_app_state').select('value_json').eq('key','yardivo_master_data_registry_v583').eq('deleted',false).maybeSingle();
  if(error)throw error;try{return JSON.parse(String(data?.value_json||'{}'))}catch{return {locations:[],warehouses:[],suppliers:[]}};
}
async function mutateNotifications(authUserId:any,fn:(rows:any[])=>any[]){
  const key='yardivo_live_notifications_v1';
  const {data:s,error:se}=await db.from('yardivo_app_state').select('value_json').eq('key',key).eq('deleted',false).maybeSingle();
  if(se)throw se;
  let rows:any[]=[];try{const z=JSON.parse(String(s?.value_json||'[]'));if(Array.isArray(z))rows=z}catch{}
  rows=fn(rows);
  if(rows.length>500)rows=rows.slice(-500);
  const {error}=await db.rpc('yardivo_edge_put_state',{p_auth_user_id:authUserId,p_key:key,p_value:JSON.stringify(rows),p_client_id:'yardivo-supplier-deliveries'});
  if(error)throw error;
}
async function notifySupplierRequest(x:any,authUserId:any){
  const id='SUPREQ-'+String(x.id);
  const n={id,event:'SUPPLIER_REQUEST',type:'blue',title:'NOVA NAJAVA DOBAVLJAČA',body:`${x.supplier_name||x.supplier_username||'Dobavljač'} · ${x.delivery_date||''} ${String(x.requested_time||'').slice(0,5)}`,at:new Date().toISOString(),createdAt:new Date().toISOString(),roles:['admin','manager','inventory'],supplier:x.supplier_name||x.supplier_username||'',supplierDeliveryId:String(x.id),publicAnnouncementId:String(x.client_id||''),announcementId:'SUPDEL-'+String(x.id),warehouse:String(x.warehouse||''),location:String(x.location||''),readBy:{}};
  await mutateNotifications(authUserId,rows=>[...rows.filter(v=>String(v?.id)!==id && !(String(v?.event||'').toUpperCase()==='SUPPLIER_REQUEST' && String(v?.supplierDeliveryId||'')===String(x.id))),n]);
}
async function removeSupplierRequestNotification(id:any,authUserId:any){
  const nid='SUPREQ-'+String(id);
  await mutateNotifications(authUserId,rows=>rows.filter(v=>String(v?.id)!==nid&&String(v?.supplierDeliveryId||'')!==String(id)));
}
async function notifyConfirmedToReception(x:any,authUserId:any,kind='NEW'){
  const id=(kind==='RESCHEDULE'?'SUP-RESCHEDULED-':'SUP-CONFIRMED-')+String(x.id)+'-'+String(x.updated_at||'');
  const title=kind==='RESCHEDULE'?'PROMJENA TERMINA PRIHVAĆENA':'NOVA NAJAVA';
  const body=`${x.supplier_name||x.supplier_username||"Dobavljač"} · ${x.delivery_date||""} ${String(x.requested_time||"").slice(0,5)} · ${String(x.warehouse||"")}${x.dock?" · "+x.dock:""}`;
  const n={id,event:kind==='RESCHEDULE'?'TERM_CHANGE':'ANNOUNCEMENT_CREATED',type:'green',title,body,at:new Date().toISOString(),createdAt:new Date().toISOString(),roles:['admin','manager','reception'],supplier:x.supplier_name||x.supplier_username||'',supplierDeliveryId:String(x.id),publicAnnouncementId:String(x.client_id||''),announcementId:'SUPDEL-'+String(x.id),warehouse:String(x.warehouse||''),location:String(x.location||''),readBy:{}};
  await mutateNotifications(authUserId,rows=>[...rows.filter(v=>String(v?.id)!==id),n]);
}
async function notifySmartProposalToSupplier(x:any,authUserId:any,reason:string){
  const id='TERM-PROPOSAL-'+String(x.id)+'-'+String(x.updated_at||'');
  const oldSlot=`${x.delivery_date||""} ${String(x.requested_time||"").slice(0,5)} ${x.dock||""}`.trim();
  const newSlot=`${x.proposed_date||x.delivery_date||""} ${String(x.proposed_time||"").slice(0,5)} ${x.proposed_dock||""}`.trim();
  const n={id,event:'TERM_PROPOSAL',type:'blue',title:'ZAHTJEV ZA PROMJENU TERMINA',body:`${x.supplier_name||x.supplier_username||"Dobavljač"} · ${oldSlot} → ${newSlot}. ${reason||"YardOn Smart predlaže rasterećeniji termin."}`,at:new Date().toISOString(),createdAt:new Date().toISOString(),roles:['supplier'],targetSupplierAuthUserId:String(x.supplier_auth_user_id||''),targetSupplierUsername:String(x.supplier_username||''),supplier:x.supplier_name||x.supplier_username||'',supplierDeliveryId:String(x.id),publicAnnouncementId:String(x.client_id||''),announcementId:'SUPDEL-'+String(x.id),warehouse:String(x.warehouse||''),location:String(x.location||''),readBy:{}};
  await mutateNotifications(authUserId,rows=>[...rows.filter(v=>String(v?.id)!==id),n]);
}
async function notifySupplierAlternativeToInventory(x:any,authUserId:any,note:string){
  const id='TERM-ALT-'+String(x.id)+'-'+String(x.updated_at||'');
  const n={id,event:'TERM_CHANGE',type:'yellow',title:'DOBAVLJAČ TRAŽI DRUGI TERMIN',body:`${x.supplier_name||x.supplier_username||"Dobavljač"} · ${note||"Traži alternativni termin."}`,at:new Date().toISOString(),createdAt:new Date().toISOString(),roles:['admin','inventory'],supplier:x.supplier_name||x.supplier_username||'',supplierDeliveryId:String(x.id),publicAnnouncementId:String(x.client_id||''),announcementId:'SUPDEL-'+String(x.id),warehouse:String(x.warehouse||''),location:String(x.location||''),readBy:{}};
  await mutateNotifications(authUserId,rows=>[...rows.filter(v=>String(v?.id)!==id),n]);
}
async function notifySupplierSelfService(x:any,authUserId:any,kind:string,note:string){
  const isCancel=kind==='CANCEL';
  const id=(isCancel?'SUP-CANCEL-REQ-':'SUP-RESCHEDULE-REQ-')+String(x.id)+'-'+String(x.updated_at||'');
  const desired=isCancel?'':[`${x.proposed_date||''}`,String(x.proposed_time||'').slice(0,5),String(x.proposed_dock||'')].filter(Boolean).join(' ');
  const n={
    id,
    event:isCancel?'SUPPLIER_CANCEL_REQUEST':'RESCHEDULE',
    type:isCancel?'red':'yellow',
    title:isCancel?'DOBAVLJAČ TRAŽI OTKAZIVANJE':'DOBAVLJAČ TRAŽI PROMJENU TERMINA',
    body:`${x.supplier_name||x.supplier_username||'Dobavljač'} · ${isCancel?(note||'Zahtjev za otkazivanje najave.'):(desired||note||'Zahtjev za promjenu termina.')}`,
    at:new Date().toISOString(),createdAt:new Date().toISOString(),
    roles:['admin','inventory'],
    supplier:x.supplier_name||x.supplier_username||'',
    supplierDeliveryId:String(x.id),
    announcementId:'SUPDEL-'+String(x.id),
    warehouse:String(x.warehouse||''),
    location:String(x.location||''),
    readBy:{}
  };
  await mutateNotifications(authUserId,rows=>[...rows.filter(v=>String(v?.id)!==id),n]);
}

function supplierScope(p:any,m:any){
  let locs=arr(p.locations),whs=arr(p.warehouses);
  const s=(m.suppliers||[]).find((x:any)=>x&&x.active!==false&&String(x.id)===String(p.supplier_id||''));
  if(s){
    locs=p.all_locations?arr((m.locations||[]).filter((x:any)=>x&&x.active!==false).map((x:any)=>x.id)):arr(s.locations);
    whs=p.all_warehouses?arr((m.warehouses||[]).filter((x:any)=>x&&x.active!==false).map((x:any)=>x.id)):arr(s.warehouses);
  }
  return {locs,whs};
}
function canWarehouse(p:any,wid:string){return role(p.app_role)==='admin'||p.all_warehouses||arr(p.warehouses).includes(wid)};
async function warehouseAllowed(p:any,wid:any,locId?:any){
  const id=String(wid??'').trim();if(!id)throw new Error('Odaberi skladište.');
  const m=await master(),w=(m.warehouses||[]).find((x:any)=>x&&x.active!==false&&String(x.id)===id);
  if(!w)throw new Error('Skladište nije aktivno u Master Data.');
  const r=role(p.app_role),loc=String(w.location_id||'');
  if(r==='supplier'){
    const sc=supplierScope(p,m);
    if(!sc.whs.includes(id)||!sc.locs.includes(loc))throw new Error('Skladište ili lokacija nisu dodijeljeni ovom Supplier accountu.');
  }else if(r!=='admin'&&!canWarehouse(p,id))throw new Error('Skladište nije dodijeljeno ovom accountu.');
  if(locId&&String(locId)!==loc)throw new Error('Odabrano skladište ne pripada odabranoj lokaciji.');
  return {m,w,loc};
}
function rampConfig(w:any,dock:any){
  const rn=Number(String(dock??'').replace(/\D/g,''));
  const ramp=(w.ramp_settings||[]).find((r:any)=>r&&r.active!==false&&Number(r.number)===rn);
  if(!ramp)throw new Error('Odabrana rampa nije aktivna.');
  const rate=Number(ramp.pallets_per_hour||0);if(rate<=0)throw new Error('Kapacitet rampe nije konfiguriran.');
  const rf=mins(ramp.from),rt=mins(ramp.to),wf=mins(w.reception_from),wt=mins(w.reception_to);const from=Number.isFinite(rf)?rf:wf,to=Number.isFinite(rt)?rt:wt;
  if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)throw new Error('Vrijeme rada rampe nije potpuno konfigurirano.');
  return {rn,ramp,rate,from,to};
}
async function validateSlot(w:any,d:string,t:string,dock:any,pallets:number,ignoreId?:string){
  if(!warehouseOpenOn(w,d))throw new Error('Skladište ne radi subotom i nedjeljom. Odaberi radni dan.');
  const cfg=rampConfig(w,dock),start=mins(t),duration=dur(pallets,cfg.rate),end=start+duration;
  if(!Number.isFinite(start)||start<cfg.from||end>cfg.to)throw new Error('Termin je izvan radnog vremena prijama.');
  const {data,error}=await db.from('yardivo_supplier_deliveries')
    .select('id,requested_time,pallets,status,dock,dock_number,duration_minutes')
    .eq('warehouse',String(w.id)).eq('delivery_date',d).not('requested_time','is',null);
  if(error)throw error;
  for(const x of data||[]){
    if(ignoreId&&String(x.id)===String(ignoreId))continue;
    if(['rejected','completed'].includes(String(x.status||'').toLowerCase()))continue;
    const rn=Number(x.dock_number||String(x.dock||'').replace(/\D/g,''));if(rn!==cfg.rn)continue;
    const a=mins(x.requested_time),xd=Number(x.duration_minutes)||dur(Math.max(1,Number(x.pallets||1)),cfg.rate);
    if(Number.isFinite(a)&&start<a+xd&&end>a)throw new Error('Termin je upravo zauzet. Odaberi drugi slobodan termin.');
  }
  return {dock:'R'+cfg.rn,dock_number:cfg.rn,time:t,duration_minutes:duration,slot_start:utc(d,t),slot_end:utc(d,hhmm(end))};
}
function decodeGateQr(v:any){
  const text=String(v||''),m=text.match(/\[\[YARDIVO_GATE_QR_V583:([A-Za-z0-9_-]+)\]\]/);
  if(!m)return null;
  try{
    let b=String(m[1]).replace(/-/g,'+').replace(/_/g,'/');
    b+='='.repeat((4-b.length%4)%4);
    const bin=atob(b),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
    const x=JSON.parse(new TextDecoder().decode(bytes));
    return x&&typeof x==='object'?x:null;
  }catch{return null}
}
function documentFields(b:any){
  const name=String(b.document_name??'').trim(),mime=String(b.document_mime??'').trim(),data=String(b.document_base64??'').trim();
  if(!data)return {document_name:null,document_mime:null,document_base64:null};
  if(mime!=='application/pdf')throw new Error('Dokument mora biti PDF.');
  if(data.length>2100000)throw new Error('PDF je veći od 1.5 MB.');
  return {document_name:name||'dokument.pdf',document_mime:mime,document_base64:data};
}
const LIST_FIELDS='id,client_id,supplier_auth_user_id,supplier_username,supplier_name,warehouse,order_number,delivery_date,requested_time,pallets,vehicle_plate,driver_name,delivery_note,note,status,dock,created_at,updated_at,driver_contact,sku_count,trailer_plate,review_note,proposed_time,proposed_dock,document_name,document_mime,location,dock_number,duration_minutes,slot_start,slot_end,proposed_date';
async function mine(p:any,cid:any){
  const {data,error}=await db.from('yardivo_supplier_deliveries').select('*').eq('supplier_auth_user_id',p.auth_user_id).eq('client_id',String(cid??'')).maybeSingle();
  if(error)throw error;if(!data)throw new Error('Najava nije pronađena.');return data;
}
async function rowById(id:any){const {data,error}=await db.from('yardivo_supplier_deliveries').select('*').eq('id',String(id??'')).maybeSingle();if(error)throw error;if(!data)throw new Error('Najava nije pronađena.');return data;}
function announcementPayload(x:any){
  return {id:'SUPDEL-'+String(x.id),supplierDeliveryId:String(x.id),supplierPortalId:String(x.client_id||''),supplierSource:'supplier_live',supplier:x.supplier_name||x.supplier_username||'Supplier',warehouse:String(x.warehouse||''),location:String(x.location||''),date:String(x.delivery_date||''),time:String(x.requested_time||'').slice(0,5),pallets:Number(x.pallets||0),sku:Number(x.sku_count||0),plannedPlate:x.vehicle_plate||'',trailerPlate:x.trailer_plate||'',plannedDriver:x.driver_name||'',driverContact:x.driver_contact||'',reference:x.delivery_note||'',supplierNote:x.note||'',dock:x.dock||'',duration:Number(x.duration_minutes||60),status:'Najavljen',supplierApprovalStatus:x.status,updatedAt:x.updated_at};
}
async function mirrorAnnouncement(x:any,p:any){
  const st=String(x.status||'').toLowerCase();if(!['confirmed','arrival','dock','receiving','completed'].includes(st))return;
  const payload=announcementPayload(x);
  const status={confirmed:'Najavljen',arrival:'U dvorištu',dock:'Na rampi',receiving:'Zaprimanje',completed:'Zaprimljeno'}[st]||'Najavljen';payload.status=status;
  const row={announcement_id:'SUPDEL-'+String(x.id),appointment_date:x.delivery_date,appointment_time:x.requested_time,supplier:x.supplier_name||x.supplier_username||null,warehouse:x.warehouse,status,created_by:'supplier:'+String(x.supplier_username||''),updated_by:p?.username||'yardivo-supplier-deliveries',payload,source_key:'yardivo_supplier_deliveries',deleted:false,updated_at:new Date().toISOString()};
  const {error}=await db.from('yardivo_announcements').upsert(row,{onConflict:'announcement_id'});if(error)throw error;
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});
  if(req.method!=='POST')return J({ok:false,error:'Method not allowed'},405);
  try{
    const p=await profile(req),r=role(p.app_role),b=await req.json().catch(()=>({})),a=String(b.action??'').toLowerCase();

    if(a==='upsert'){
      if(r!=='supplier')throw new Error('Samo Supplier može poslati najavu.');
      const cid=String(b.client_id??'').trim();if(!cid)throw new Error('Nedostaje client_id.');
      const {data:existing,error:ee}=await db.from('yardivo_supplier_deliveries').select('*').eq('supplier_auth_user_id',p.auth_user_id).eq('client_id',cid).maybeSingle();if(ee)throw ee;
      if(existing&&!['pending','revision_requested'].includes(String(existing.status||'').toLowerCase()))throw new Error('Ovu najavu više nije moguće mijenjati kroz novi unos.');
      const {w,loc}=await warehouseAllowed(p,b.warehouse,b.location);
      const pal=n(b.pallets),sku=n(b.sku_count),d=date(b.delivery_date),t=time(b.requested_time),slot=await validateSlot(w,d,t,b.dock,pal,existing?.id);
      const row={client_id:cid,supplier_auth_user_id:p.auth_user_id,supplier_username:p.username,supplier_name:p.supplier_name??p.username,location:loc,warehouse:String(w.id),order_number:order(b.order_number),delivery_date:d,requested_time:slot.time,pallets:pal,sku_count:sku,dock:slot.dock,dock_number:slot.dock_number,duration_minutes:slot.duration_minutes,slot_start:slot.slot_start,slot_end:slot.slot_end,vehicle_plate:String(b.vehicle_plate??'').trim().toUpperCase()||null,trailer_plate:String(b.trailer_plate??'').trim().toUpperCase()||null,driver_name:String(b.driver_name??'').trim()||null,driver_contact:String(b.driver_contact??'').trim()||null,delivery_note:String(b.delivery_note??'').trim()||null,note:String(b.note??'').trim()||null,...documentFields(b),status:'pending',proposed_time:null,proposed_dock:null,review_note:existing?.status==='revision_requested'?'Dobavljač je ponovno poslao najavu na provjeru.':existing?.review_note||null,updated_at:new Date().toISOString()};
      const {data,error}=await db.from('yardivo_supplier_deliveries').upsert(row as any,{onConflict:'supplier_auth_user_id,client_id'}).select('*').single();if(error)throw error;
      if(!existing)await notifySupplierRequest(data,p.auth_user_id);
      return J({ok:true,data});
    }

    if(a==='list_mine'){
      if(r!=='supplier')throw new Error('Akcija je dostupna samo Supplieru.');
      const uname=String(p.username||'').replace(/[^a-zA-Z0-9._-]/g,'');
      const mineQ=await db.from('yardivo_supplier_deliveries').select(LIST_FIELDS)
        .or(`supplier_auth_user_id.eq.${p.auth_user_id},supplier_username.eq.${uname}`)
        .order('created_at',{ascending:false});
      if(mineQ.error)throw mineQ.error;
      const rows=(mineQ.data||[]);
      const ids=rows.map((x:any)=>String(x.id)).filter(Boolean);
      let amap=new Map<string,any>();
      if(ids.length){
        const aq=await db.from('yardivo_announcements')
          .select('announcement_id,status,payload,updated_at')
          .in('payload->>supplierDeliveryId',ids)
          .eq('deleted',false);
        if(aq.error)throw aq.error;
        for(const ar of aq.data||[]){
          const sid=String(ar?.payload?.supplierDeliveryId||'');
          if(sid)amap.set(sid,ar);
        }
        const missing=ids.filter((id:string)=>!amap.has(id));
        if(missing.length){
          const legacy=await db.from('yardivo_announcements')
            .select('announcement_id,status,payload,updated_at')
            .in('announcement_id',missing.map((id:string)=>'SUPDEL-'+id))
            .eq('deleted',false);
          if(legacy.error)throw legacy.error;
          for(const ar of legacy.data||[]){
            const sid=String(ar?.payload?.supplierDeliveryId||String(ar.announcement_id||'').replace(/^SUPDEL-/,''));
            if(sid&&!amap.has(sid))amap.set(sid,ar);
          }
        }
      }
      const statusMap:any={'NAJAVLJEN':'confirmed','U DVORIŠTU':'arrival','NA RAMPI':'dock','ZAPRIMANJE':'receiving','ZAPRIMLJEN':'completed','ZAPRIMLJENO':'completed','ODBIJEN':'rejected','OTKAZAN':'cancelled','OTKAZANO':'cancelled'};
      const out=rows.map((x:any)=>{
        const ar=amap.get(String(x.id)),ast=String(ar?.status||ar?.payload?.status||'').trim().toUpperCase();
        const effective=statusMap[ast]||String(x.status||'pending').toLowerCase();
        const qr=decodeGateQr(x.review_note);
        return {...x,effective_status:effective,announcement_id:ar?.announcement_id||null,announcement_status:ar?.status||ar?.payload?.status||null,announcement_updated_at:ar?.updated_at||null,gate_qr_ready:!!qr?.qrUrl,gate_qr_url:String(qr?.qrUrl||''),gate_qr_token:String(qr?.token||''),gate_qr_issued_at:String(qr?.issuedAt||'')};
      });
      return J({ok:true,data:out});
    }

    // Resolve public supplier booking references even for old/cancelled records.
    // This action returns no delivery data, is JWT-authenticated and warehouse-scoped.
    if(a==='notification_reference'){
      if(!['admin','manager','inventory','reception'].includes(r))throw new Error('Nema ovlasti.');
      const id=String(b.id||'').trim();
      if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))throw new Error('Neispravan ID najave.');
      const {data:delivery,error}=await db.from('yardivo_supplier_deliveries')
        .select('id,client_id,warehouse').eq('id',id).maybeSingle();
      if(error)throw error;
      if(!delivery)throw new Error('Najava nije pronađena.');
      if(!canWarehouse(p,String(delivery.warehouse||'')))throw new Error('Skladište nije dostupno ovom korisniku.');
      return J({ok:true,data:{id:String(delivery.id),client_id:String(delivery.client_id||'')}});
    }

    if(a==='list_internal'){
      if(!['admin','manager','inventory','reception'].includes(r))throw new Error('Nema ovlasti.');
      let q=db.from('yardivo_supplier_deliveries').select(LIST_FIELDS).not('status','in','(cancelled,canceled)').order('created_at',{ascending:false}).limit(500);
      if(r!=='admin'&&!p.all_warehouses){const ws=arr(p.warehouses);if(!ws.length)return J({ok:true,data:[]});q=q.in('warehouse',ws)}
      const {data,error}=await q;if(error)throw error;return J({ok:true,data:data||[]});
    }


    if(a==='archive_document'){
      if(!['admin','manager','inventory','reception'].includes(r))throw new Error('Nema ovlasti za arhiviranje dokumenta.');
      const x=await rowById(b.id);
      if(r!=='admin'&&!p.all_warehouses&&!arr(p.warehouses).includes(String(x.warehouse)))throw new Error('Nema ovlasti za ovo skladište.');
      if(!String(x.document_base64||'').trim())throw new Error('Najava nema priložen PDF dokument.');
      const archived={
        supplier_delivery_id:x.id,
        announcement_id:'SUPDEL-'+String(x.id),
        supplier_name:x.supplier_name||x.supplier_username||null,
        warehouse:String(x.warehouse||''),
        location:x.location||null,
        delivery_date:x.delivery_date||null,
        appointment_time:x.requested_time||null,
        dock:x.dock||null,
        document_name:x.document_name||'dokument.pdf',
        document_mime:x.document_mime||'application/pdf',
        document_base64:x.document_base64,
        source:'supplier_delivery',
        archived_by:p.auth_user_id,
        archived_by_username:p.username||null,
        archived_by_role:r,
        archived_at:new Date().toISOString()
      };
      const {data,error}=await db.from('yardivo_document_archive')
        .upsert(archived,{onConflict:'supplier_delivery_id'})
        .select('id,supplier_delivery_id,announcement_id,supplier_name,warehouse,location,delivery_date,appointment_time,dock,document_name,document_mime,source,archived_by_username,archived_by_role,archived_at,created_at')
        .single();
      if(error)throw error;
      return J({ok:true,data});
    }

    if(a==='list_archive'){
      if(!['admin','manager','inventory','reception'].includes(r))throw new Error('Nema ovlasti.');
      let q=db.from('yardivo_document_archive')
        .select('id,supplier_delivery_id,announcement_id,supplier_name,warehouse,location,delivery_date,appointment_time,dock,document_name,document_mime,source,archived_by_username,archived_by_role,archived_at,created_at')
        .order('archived_at',{ascending:false}).limit(500);
      if(r!=='admin'&&!p.all_warehouses){
        const ws=arr(p.warehouses);
        if(!ws.length)return J({ok:true,data:[]});
        q=q.in('warehouse',ws);
      }
      const {data,error}=await q;if(error)throw error;
      return J({ok:true,data:data||[]});
    }

    if(a==='delete_archive_document'){
      if(!['admin','manager','inventory','reception'].includes(r))throw new Error('Nema ovlasti.');
      const {data:x,error:xe}=await db.from('yardivo_document_archive').select('id,warehouse,document_name').eq('id',String(b.id||'')).maybeSingle();
      if(xe)throw xe;if(!x)throw new Error('Arhivirani dokument nije pronađen.');
      if(r!=='admin'&&!p.all_warehouses&&!arr(p.warehouses).includes(String(x.warehouse)))throw new Error('Nema ovlasti za ovo skladište.');
      const {error}=await db.from('yardivo_document_archive').delete().eq('id',x.id);
      if(error)throw error;
      return J({ok:true,deleted_id:x.id});
    }

    if(a==='delete_archive_all'){
      if(!['admin','manager','inventory','reception'].includes(r))throw new Error('Nema ovlasti.');
      let q=db.from('yardivo_document_archive').delete();
      if(r!=='admin'&&!p.all_warehouses){
        const ws=arr(p.warehouses);
        if(!ws.length)return J({ok:true,deleted:0});
        q=q.in('warehouse',ws);
      }else{
        q=q.neq('id','00000000-0000-0000-0000-000000000000');
      }
      const {data,error}=await q.select('id');
      if(error)throw error;
      return J({ok:true,deleted:Array.isArray(data)?data.length:0});
    }

    if(a==='get_archive_document'){
      if(!['admin','manager','inventory','reception'].includes(r))throw new Error('Nema ovlasti.');
      const {data,error}=await db.from('yardivo_document_archive').select('*').eq('id',String(b.id||'')).maybeSingle();
      if(error)throw error;if(!data)throw new Error('Arhivirani dokument nije pronađen.');
      if(r!=='admin'&&!p.all_warehouses&&!arr(p.warehouses).includes(String(data.warehouse)))throw new Error('Nema ovlasti za ovo skladište.');
      return J({ok:true,data});
    }

    if(a==='vehicle'){
      if(r!=='supplier')throw new Error('Samo Supplier može koristiti ovu akciju.');
      const x=await mine(p,b.client_id);if(['completed','rejected'].includes(String(x.status||'').toLowerCase()))throw new Error('Najava je zaključena.');
      const {data,error}=await db.from('yardivo_supplier_deliveries').update({vehicle_plate:String(b.vehicle_plate??'').trim().toUpperCase()||null,trailer_plate:String(b.trailer_plate??'').trim().toUpperCase()||null,driver_name:String(b.driver_name??'').trim()||null,driver_contact:String(b.driver_contact??'').trim()||null,updated_at:new Date().toISOString()}).eq('id',x.id).select('*').single();if(error)throw error;await mirrorAnnouncement(data,p);return J({ok:true,data});
    }

    if(a==='smart_propose'){
      if(!['admin','inventory'].includes(r))throw new Error('Samo Upravljanje zalihama ili Admin može poslati Smart prijedlog.');
      const x=await rowById(b.id);
      if(r!=='admin'&&!p.all_warehouses&&!arr(p.warehouses).includes(String(x.warehouse)))throw new Error('Nema ovlasti za ovo skladište.');
      if(String(x.status||'').toLowerCase()!=='confirmed')throw new Error('Smart prijedlog se šalje samo za potvrđenu najavu.');
      const pd=date(b.proposed_date),pt=time(b.proposed_time),pdock=String(b.proposed_dock||'').trim().toUpperCase();
      const {w}=await warehouseAllowed(p,x.warehouse,x.location);
      await validateSlot(w,pd,pt,pdock,Number(x.pallets),String(x.id));
      const reason=String(b.reason||'YardOn Smart predlaže rasterećeniji termin.').trim();
      const note=[String(x.review_note||'').trim(),`YardOn Smart prijedlog: ${x.delivery_date} ${String(x.requested_time||"").slice(0,5)} ${x.dock||""} → ${pd} ${pt} ${pdock}. ${reason}`].filter(Boolean).join('\n');
      const {data,error}=await db.from('yardivo_supplier_deliveries').update({status:'proposal_sent',proposed_date:pd,proposed_time:pt,proposed_dock:pdock,review_note:note,updated_at:new Date().toISOString()}).eq('id',x.id).select('*').single();
      if(error)throw error;
      await notifySmartProposalToSupplier(data,p.auth_user_id,reason);
      return J({ok:true,data});
    }

    if(a==='supplier_accept'){
      if(r!=='supplier')throw new Error('Samo Supplier može prihvatiti ponuđeni termin.');
      const x=await mine(p,b.client_id);if(String(x.status)!=='proposal_sent')throw new Error('Nema aktivnog prijedloga termina.');
      const pd=String(x.proposed_date||x.delivery_date),pt=String(x.proposed_time||x.requested_time).slice(0,5),pdock=String(x.proposed_dock||x.dock||'').trim().toUpperCase();
      const {w,loc}=await warehouseAllowed(p,x.warehouse,x.location);
      const slot=await validateSlot(w,pd,pt,pdock,Number(x.pallets),String(x.id));
      const note=[String(x.review_note||'').trim(),'Dobavljač je prihvatio YardOn Smart predloženi termin.'].filter(Boolean).join('\n');
      const {data,error}=await db.from('yardivo_supplier_deliveries').update({status:'confirmed',location:loc,delivery_date:pd,requested_time:slot.time,dock:slot.dock,dock_number:slot.dock_number,duration_minutes:slot.duration_minutes,slot_start:slot.slot_start,slot_end:slot.slot_end,proposed_date:null,proposed_time:null,proposed_dock:null,review_note:note,updated_at:new Date().toISOString()}).eq('id',x.id).select('*').single();
      if(error)throw error;await mirrorAnnouncement(data,p);
      await notifyConfirmedToReception(data,p.auth_user_id,'RESCHEDULE');
      return J({ok:true,data});
    }

    if(a==='supplier_request_alternative'){
      if(r!=='supplier')throw new Error('Samo Supplier može zatražiti drugi termin.');
      const x=await mine(p,b.client_id);if(String(x.status)!=='proposal_sent')throw new Error('Nema aktivnog prijedloga termina.');
      const note=String(b.note||'Dobavljač traži drugi termin.').trim();
      const {data,error}=await db.from('yardivo_supplier_deliveries').update({status:'revision_requested',review_note:note,proposed_date:null,proposed_time:null,proposed_dock:null,updated_at:new Date().toISOString()}).eq('id',x.id).select('*').single();
      if(error)throw error;
      await notifySupplierAlternativeToInventory(data,p.auth_user_id,note);
      return J({ok:true,data});
    }



    if(a==='supplier_get_document'){
      if(r!=='supplier')throw new Error('Akcija je dostupna samo Supplieru.');
      const x=await mine(p,b.client_id);
      if(!x.document_base64)throw new Error('Dokument nije dostupan.');
      return J({ok:true,data:{
        client_id:x.client_id,
        document_name:x.document_name||'dokument.pdf',
        document_mime:x.document_mime||'application/pdf',
        document_base64:x.document_base64
      }});
    }

    if(a==='supplier_reschedule_request'){
      if(r!=='supplier')throw new Error('Samo Supplier može zatražiti promjenu termina.');
      const x=await mine(p,b.client_id);
      const st=String(x.status||'').toLowerCase();
      if(!['pending','confirmed','proposal_sent','revision_requested'].includes(st))throw new Error('Za ovu najavu više nije moguće zatražiti promjenu termina.');
      const pd=String(b.proposed_date||'').trim()?date(b.proposed_date):null;
      const pt=String(b.proposed_time||'').trim()?time(b.proposed_time):null;
      const pdock=String(b.proposed_dock||'').trim().toUpperCase()||null;
      const note=String(b.note||'').trim().slice(0,1000);
      if(!pd&&!pt&&!pdock&&!note)throw new Error('Upiši željenu promjenu termina ili napomenu.');
      if(pdock&&!/^R?\d+$/i.test(pdock))throw new Error('Rampa nije ispravna.');
      const review=[String(x.review_note||'').trim(),`Zahtjev dobavljača za promjenu termina: ${[pd,pt,pdock,note].filter(Boolean).join(' · ')}`].filter(Boolean).join('\n');
      const {data,error}=await db.from('yardivo_supplier_deliveries').update({
        status:'reschedule_requested',
        proposed_date:pd,
        proposed_time:pt,
        proposed_dock:pdock,
        review_note:review,
        updated_at:new Date().toISOString()
      }).eq('id',x.id).select('*').single();
      if(error)throw error;
      await notifySupplierSelfService(data,p.auth_user_id,'RESCHEDULE',note);
      return J({ok:true,data});
    }

    if(a==='supplier_cancel_request'){
      if(r!=='supplier')throw new Error('Samo Supplier može zatražiti otkazivanje.');
      const x=await mine(p,b.client_id);
      const st=String(x.status||'').toLowerCase();
      if(!['pending','confirmed','proposal_sent','revision_requested','reschedule_requested'].includes(st))throw new Error('Za ovu najavu više nije moguće zatražiti otkazivanje.');
      const note=String(b.note||'').trim().slice(0,1000);
      if(!note)throw new Error('Upiši razlog otkazivanja.');
      const review=[String(x.review_note||'').trim(),`Zahtjev dobavljača za otkazivanje: ${note}`].filter(Boolean).join('\n');
      const {data,error}=await db.from('yardivo_supplier_deliveries').update({
        status:'cancel_requested',
        review_note:review,
        proposed_date:null,
        proposed_time:null,
        proposed_dock:null,
        updated_at:new Date().toISOString()
      }).eq('id',x.id).select('*').single();
      if(error)throw error;
      await notifySupplierSelfService(data,p.auth_user_id,'CANCEL',note);
      return J({ok:true,data});
    }

    if(a==='internal_resolve_supplier_request'){
      if(!['admin','inventory'].includes(r))throw new Error('Samo Admin ili Upravljanje zalihama može riješiti Supplier zahtjev.');
      const x=await rowById(b.id);
      if(r!=='admin'&&!p.all_warehouses&&!arr(p.warehouses).includes(String(x.warehouse)))throw new Error('Nema ovlasti za ovo skladište.');
      const st=String(x.status||'').toLowerCase(),decision=String(b.decision||'').toLowerCase();
      if(!['reschedule_requested','cancel_requested'].includes(st))throw new Error('Nema aktivnog Supplier zahtjeva.');
      if(!['approve','reject'].includes(decision))throw new Error('Nepoznata odluka.');

      if(st==='cancel_requested'){
        if(decision==='approve'){
          const alias='SUPDEL-'+String(x.id),now=new Date().toISOString();
          const {data:anns,error:ae}=await db.from('yardivo_announcements').select('announcement_id').or(`announcement_id.eq.${alias},payload->>supplierDeliveryId.eq.${String(x.id)}`);
          if(ae)throw ae;
          const annIds=[...new Set((anns||[]).map((a:any)=>String(a.announcement_id)).filter(Boolean))];
          if(annIds.length){const {error:de}=await db.from('yardivo_announcements').delete().in('announcement_id',annIds);if(de)throw de;}
          const {data,error}=await db.from('yardivo_supplier_deliveries').update({status:'cancelled',slot_start:null,slot_end:null,dock_number:null,duration_minutes:null,updated_at:now}).eq('id',x.id).select('*').single();
          if(error)throw error;
          await removeSupplierRequestNotification(x.id,p.auth_user_id);
          return J({ok:true,data});
        }else{
          const {data,error}=await db.from('yardivo_supplier_deliveries').update({status:'confirmed',updated_at:new Date().toISOString()}).eq('id',x.id).select('*').single();
          if(error)throw error;
          return J({ok:true,data});
        }
      }

      if(decision==='reject'){
        const {data,error}=await db.from('yardivo_supplier_deliveries').update({status:'confirmed',proposed_date:null,proposed_time:null,proposed_dock:null,updated_at:new Date().toISOString()}).eq('id',x.id).select('*').single();
        if(error)throw error;return J({ok:true,data});
      }

      const pd=String(x.proposed_date||x.delivery_date),pt=String(x.proposed_time||x.requested_time).slice(0,5),pdock=String(x.proposed_dock||x.dock||'').trim().toUpperCase();
      const {w,loc}=await warehouseAllowed(p,x.warehouse,x.location);
      const slot=await validateSlot(w,pd,pt,pdock,Number(x.pallets),String(x.id));
      const {data,error}=await db.from('yardivo_supplier_deliveries').update({
        status:'confirmed',location:loc,delivery_date:pd,requested_time:slot.time,dock:slot.dock,dock_number:slot.dock_number,
        duration_minutes:slot.duration_minutes,slot_start:slot.slot_start,slot_end:slot.slot_end,
        proposed_date:null,proposed_time:null,proposed_dock:null,updated_at:new Date().toISOString()
      }).eq('id',x.id).select('*').single();
      if(error)throw error;await mirrorAnnouncement(data,p);await notifyConfirmedToReception(data,p.auth_user_id,'RESCHEDULE');
      return J({ok:true,data});
    }

    if(a==='delete_internal'){
      if(!['admin','inventory'].includes(r))throw new Error('Samo Admin ili Upravljanje zalihama može izbrisati Supplier najavu.');
      const x=await rowById(b.id);
      if(r!=='admin'&&!p.all_warehouses&&!arr(p.warehouses).includes(String(x.warehouse)))throw new Error('Nema ovlasti za ovo skladište.');
      if(['arrival','dock','receiving','completed'].includes(String(x.status||'').toLowerCase()))throw new Error('Najava je već u operativnom procesu i ne može se izbrisati.');
      const alias='SUPDEL-'+String(x.id);
      const {data:anns,error:afe}=await db.from('yardivo_announcements')
        .select('announcement_id')
        .or(`announcement_id.eq.${alias},payload->>supplierDeliveryId.eq.${String(x.id)}`);
      if(afe)throw afe;
      const annIds=[...new Set((anns||[]).map((a:any)=>String(a.announcement_id)).filter(Boolean))];
      const passIds=[alias,...annIds];
      const {error:gpe}=await db.from('yardivo_gate_passes').delete().in('announcement_id',passIds);if(gpe)throw gpe;
      const {error:dpe}=await db.from('yardivo_delivery_passes').delete().in('announcement_id',passIds);if(dpe&&String(dpe.message||'').indexOf('does not exist')<0)throw dpe;
      if(annIds.length){const {error:ae}=await db.from('yardivo_announcements').delete().in('announcement_id',annIds);if(ae)throw ae;}
      const now=new Date().toISOString();
      const {error:de}=await db.from('yardivo_supplier_deliveries').update({
        status:'cancelled',
        review_note:'IZBRISANA NAJAVA',
        proposed_time:null,
        proposed_dock:null,
        slot_start:null,
        slot_end:null,
        updated_at:now
      }).eq('id',x.id);if(de)throw de;
      await removeSupplierRequestNotification(x.id,p.auth_user_id);
      try{
        await mutateNotifications(p.auth_user_id,rows=>rows.filter(v=>
          String(v?.supplierDeliveryId||'')!==String(x.id) &&
          !passIds.includes(String(v?.announcementId||''))
        ));
      }catch(_){}
      return J({ok:true,deleted_id:x.id,client_id:x.client_id,tombstone:true,status:'cancelled',removed_announcements:annIds});
    }

    if(a==='internal_update'){
      if(!['admin','manager','inventory','reception'].includes(r))throw new Error('Nema ovlasti.');
      const x=await rowById(b.id);if(r!=='admin'&&!p.all_warehouses&&!arr(p.warehouses).includes(String(x.warehouse)))throw new Error('Nema ovlasti za ovo skladište.');
      const requestedStatus='status' in b?String(b.status??'').toLowerCase():String(x.status||'').toLowerCase();
      const previousStatus=String(x.status||'').toLowerCase();
      if(r==='reception'&&('status' in b||'delivery_date' in b||'requested_time' in b||'dock' in b))throw new Error('Prijam ne može odobravati ili premještati Supplier najave.');
      const patch:any={updated_at:new Date().toISOString()};
      for(const k of ['vehicle_plate','trailer_plate','driver_name','driver_contact'])if(k in b)patch[k]=String(b[k]??'').trim()||null;
      if('review_note' in b)patch.review_note=String(b.review_note??'').trim()||null;
      let newDate=String(x.delivery_date),newTime=String(x.requested_time||'').slice(0,5),newDock=String(x.dock||'');
      if('delivery_date' in b)newDate=date(b.delivery_date);if('requested_time' in b)newTime=time(b.requested_time);if('dock' in b)newDock=String(b.dock??'').trim().toUpperCase();
      const moving=('delivery_date' in b)||('requested_time' in b)||('dock' in b)||requestedStatus==='confirmed';
      if(moving&&newTime&&newDock){
        const {w,loc}=await warehouseAllowed(p,x.warehouse,x.location);const slot=await validateSlot(w,newDate,newTime,newDock,Number(x.pallets),String(x.id));
        Object.assign(patch,{location:loc,delivery_date:newDate,requested_time:slot.time,dock:slot.dock,dock_number:slot.dock_number,duration_minutes:slot.duration_minutes,slot_start:slot.slot_start,slot_end:slot.slot_end});
      }
      if('status' in b){
        if(!['pending','revision_requested','proposal_sent','confirmed','reschedule_requested','cancel_requested','arrival','dock','receiving','completed','rejected','cancelled'].includes(requestedStatus))throw new Error('Nepoznat status.');
        if(['arrival','dock','receiving','completed'].includes(requestedStatus)&&!['admin','manager','inventory','reception'].includes(r))throw new Error('Nema ovlasti za operativni status.');
        patch.status=requestedStatus;
        if(requestedStatus==='proposal_sent'){patch.proposed_date=('proposed_date' in b)?date(b.proposed_date):newDate;patch.proposed_time=('proposed_time' in b)?time(b.proposed_time):(newTime||null);patch.proposed_dock=('proposed_dock' in b)?String(b.proposed_dock||'').trim().toUpperCase():(newDock||null);}
        if(requestedStatus==='rejected'){patch.slot_start=null;patch.slot_end=null;patch.dock_number=null;patch.duration_minutes=null;}
      }
      const {data,error}=await db.from('yardivo_supplier_deliveries').update(patch).eq('id',x.id).select('*').single();if(error)throw error;await mirrorAnnouncement(data,p);
      if(requestedStatus==='confirmed'&&previousStatus!=='confirmed')await notifyConfirmedToReception(data,p.auth_user_id,'NEW');
      return J({ok:true,data});
    }

    return J({ok:false,error:'Nepoznata akcija.'},400);
  }catch(e){if(!(e instanceof Error))console.error(e);const msg=e instanceof Error?e.message:String(e);return J({ok:false,error:msg},400)}
});