import { createClient } from "jsr:@supabase/supabase-js@2.116.0";

const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const J=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...H,"Content-Type":"application/json","Cache-Control":"no-store"}});
const db=createClient(Deno.env.get("SUPABASE_URL")??"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"",{auth:{persistSession:false,autoRefreshToken:false}});
function geminiModel(){return Deno.env.get("YARDIVO_GEMINI_MODEL")||"gemini-3.5-flash-lite"}
function geminiKey(){return Deno.env.get("GEMINI_API_KEY")||""}
function geminiText(out:any){return (Array.isArray(out?.candidates)?out.candidates:[]).flatMap((c:any)=>Array.isArray(c?.content?.parts)?c.content.parts:[]).map((p:any)=>typeof p?.text==="string"?p.text:"").filter(Boolean).join("\n").trim()}
async function geminiJson(instruction:string,payload:any){
 const key=geminiKey();if(!key)throw new Error("GEMINI_NOT_CONFIGURED");
 const model=geminiModel();
 const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(key),{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({systemInstruction:{parts:[{text:instruction}]},contents:[{role:"user",parts:[{text:JSON.stringify(payload)}]}],generationConfig:{responseMimeType:"application/json",temperature:0.1,maxOutputTokens:800,thinkingConfig:{thinkingLevel:"minimal"}}})
 });
 const out=await r.json().catch(()=>({}));if(!r.ok){const detail=String(out?.error?.message||out?.error?.status||"UNKNOWN").slice(0,500);throw new Error("GEMINI_"+r.status+":"+detail)}
 const raw=geminiText(out);if(!raw)throw new Error("GEMINI_EMPTY_RESPONSE");
 try{return JSON.parse(raw)}catch{throw new Error("GEMINI_INVALID_JSON")}
}

const role=(v:any)=>{let r=String(v??'').trim().toLowerCase();if(r==='voditelj'||r==='management')r='manager';if(r==='zalihe'||r.includes('zalih'))r='inventory';if(r==='prijam')r='reception';return r};
const arr=(v:any)=>Array.isArray(v)?[...new Set(v.map(String).filter(Boolean))]:[];
const n=(v:any,min=1)=>{const x=Number(v);if(!Number.isInteger(x)||x<min)throw new Error(`Vrijednost mora biti cijeli broj >= ${min}.`);return x};
const date=(v:any)=>{const x=String(v??'');if(!/^\d{4}-\d{2}-\d{2}$/.test(x))throw new Error('Datum dostave je obavezan.');return x};
const time=(v:any)=>{const x=String(v??'').slice(0,5);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(x))throw new Error('Odaberi valjani termin.');return x};
const mins=(v:any)=>{const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):NaN};
const hhmm=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const round15=(m:number)=>Math.max(30,Math.ceil(m/15)*15);
const dur=(p:number,rate:number)=>round15((Math.max(1,p)/Math.max(1,rate))*60);
const utc=(d:string,t:string)=>new Date(`${d}T${t}:00.000Z`).toISOString();
const warehouseOpenOn=(w:any,d:string)=>{const day=new Date(`${d}T12:00:00Z`).getUTCDay();const configured=Array.isArray(w?.working_days)?w.working_days.map(Number).filter((x:number)=>x>=0&&x<=6):null;const days=configured?.length?configured:[1,2,3,4,5];return days.includes(day)};
const order=(v:any)=>{const x=String(v??'').trim().toUpperCase();if(x&&!/^6W[A-Z0-9._/-]*$/.test(x))throw new Error('Broj narudžbe mora počinjati s 6W.');return x||null};

async function profile(req:Request){
  const h=req.headers.get('Authorization')??'';if(!h.startsWith('Bearer '))throw new Error('Nedostaje prijava.');
  const {data:u,error:e}=await db.auth.getUser(h.slice(7));if(e||!u.user?.id)throw new Error('Neispravna prijava.');
  const {data:p,error:pe}=await db.from('yardivo_user_access').select('auth_user_id,username,app_role,location,locations,active,warehouses,supplier_id,supplier_name,all_locations,all_warehouses').eq('auth_user_id',u.user.id).maybeSingle();
  if(pe)throw pe;if(!p?.active)throw new Error('Account nije aktivan.');return p;
}
async function master(){
  const {data,error}=await db.from('yardivo_app_state').select('value_json').eq('key','yardivo_master_data_registry_v583').eq('deleted',false).maybeSingle();if(error)throw error;
  if(data?.value_json&&typeof data.value_json==='object')return data.value_json;
  try{return JSON.parse(String(data?.value_json||'{}'))}catch{return {locations:[],warehouses:[],suppliers:[]}}
}
function supplierScope(p:any,m:any){let locs=arr(p.locations),whs=arr(p.warehouses);const s=(m.suppliers||[]).find((x:any)=>x&&x.active!==false&&String(x.id)===String(p.supplier_id||''));if(s){locs=p.all_locations?arr((m.locations||[]).filter((x:any)=>x&&x.active!==false).map((x:any)=>x.id)):arr(s.locations);whs=p.all_warehouses?arr((m.warehouses||[]).filter((x:any)=>x&&x.active!==false).map((x:any)=>x.id)):arr(s.warehouses)}return {locs,whs}}
async function warehouseAllowed(p:any,wid:any,locId?:any){
  const id=String(wid??'').trim();if(!id)throw new Error('Odaberi skladište.');
  const m=await master(),w=(m.warehouses||[]).find((x:any)=>x&&x.active!==false&&String(x.id)===id);if(!w)throw new Error('Skladište nije aktivno u Master Data.');
  const r=role(p.app_role),loc=String(w.location_id||'');
  if(r==='supplier'){const sc=supplierScope(p,m);if(!sc.whs.includes(id)||!sc.locs.includes(loc))throw new Error('Skladište ili lokacija nisu dodijeljeni ovom Supplier accountu.');}
  else if(r!=='admin'&&!p.all_warehouses&&!arr(p.warehouses).includes(id))throw new Error('Skladište nije dodijeljeno ovom accountu.');
  if(locId&&String(locId)!==loc)throw new Error('Odabrano skladište ne pripada odabranoj lokaciji.');
  return {m,w,loc};
}
function rampHours(w:any,r:any){const wf=mins(w.reception_from),wt=mins(w.reception_to),rf=mins(r?.from),rt=mins(r?.to);return {from:Number.isFinite(rf)?rf:wf,to:Number.isFinite(rt)?rt:wt}}
function activeRamps(w:any){return (Array.isArray(w?.ramp_settings)?w.ramp_settings:[]).filter((r:any)=>r&&r.active!==false&&Number(r.number)>0&&Number(r.pallets_per_hour)>0).map((r:any)=>{const h=rampHours(w,r);return {...r,number:Number(r.number),pallets_per_hour:Number(r.pallets_per_hour),from_min:h.from,to_min:h.to}}).filter((r:any)=>Number.isFinite(r.from_min)&&Number.isFinite(r.to_min)&&r.to_min>r.from_min)}
function lanesAt(ramps:any[],s:number,e:number){return ramps.filter(r=>s>=r.from_min&&e<=r.to_min)}
async function validateCapacity(w:any,d:string,t:string,pallets:number,ignoreId?:string){
  if(!warehouseOpenOn(w,d))throw new Error('Skladište ne radi na odabrani dan.');
  const ramps=activeRamps(w);if(!ramps.length)throw new Error('Nema aktivnih rampi s konfiguriranim kapacitetom.');
  const rf=mins(w.reception_from),rt=mins(w.reception_to);if(!Number.isFinite(rf)||!Number.isFinite(rt)||rt<=rf)throw new Error('Vrijeme prijama nije potpuno konfigurirano.');
  const avg=ramps.reduce((s:number,r:any)=>s+r.pallets_per_hour,0)/ramps.length,start=mins(t),duration=dur(pallets,avg),end=start+duration;
  if(!Number.isFinite(start)||start<rf||end>rt)throw new Error('Termin je izvan radnog vremena prijama.');
  const {data,error}=await db.from('yardivo_supplier_deliveries').select('id,requested_time,pallets,status,duration_minutes').eq('warehouse',String(w.id)).eq('delivery_date',d).not('requested_time','is',null);if(error)throw error;
  const busy=(data||[]).filter((x:any)=>String(x.id)!==String(ignoreId||'')&&!['rejected','completed','cancelled','canceled'].includes(String(x.status||'').toLowerCase())).map((x:any)=>{const s=mins(x.requested_time),len=Number(x.duration_minutes)||dur(Math.max(1,Number(x.pallets||1)),avg);return {start:s,end:s+len}}).filter((x:any)=>Number.isFinite(x.start));
  for(let s=start;s<end;s+=15){const cap=lanesAt(ramps,s,s+15).length,used=busy.filter((x:any)=>s<x.end&&s+15>x.start).length;if(cap<=0||used>=cap)throw new Error('Kapacitet termina je upravo popunjen. Odaberi drugi termin.');}
  return {time:t,duration_minutes:duration,slot_start:utc(d,t),slot_end:utc(d,hhmm(end)),capacity_lanes:ramps.length};
}
function documentFields(b:any){const name=String(b.document_name??'').trim(),mime=String(b.document_mime??'').trim(),data=String(b.document_base64??'').trim();if(!data)return {document_name:null,document_mime:null,document_base64:null};if(mime!=='application/pdf')throw new Error('Dokument mora biti PDF.');if(data.length>2100000)throw new Error('PDF je veći od 1.5 MB.');return {document_name:name||'dokument.pdf',document_mime:mime,document_base64:data}}
async function geminiProposalReason(x:any,d:string,t:string,w:any){
 const out=await geminiJson("Ti si YardOn AI za optimizaciju termina. Procijeni već kapacitetno-validiran prijedlog termina. Vrati samo JSON {approved:true|false,reason:string}. Ne izmišljaj podatke. approved=false samo ako vidiš očit operativni problem u danim podacima. reason napiši kratko na hrvatskom za dobavljača.",{current:{date:x.delivery_date,time:String(x.requested_time||"").slice(0,5),pallets:Number(x.pallets||0),supplier:x.supplier_name||x.supplier_username||""},proposed:{date:d,time:t},warehouse:{id:String(w?.id||""),name:String(w?.name||""),reception_from:String(w?.reception_from||""),reception_to:String(w?.reception_to||"")}});
 if(out?.approved!==true)throw new Error("GEMINI_REJECTED_PROPOSAL");
 return String(out?.reason||"YardOn AI predlaže rasterećeniji termin.").trim().slice(0,500);
}
async function rowById(id:any){const {data,error}=await db.from('yardivo_supplier_deliveries').select('*').eq('id',String(id??'')).maybeSingle();if(error)throw error;if(!data)throw new Error('Najava nije pronađena.');return data}
async function mine(p:any,cid:any){const {data,error}=await db.from('yardivo_supplier_deliveries').select('*').eq('supplier_auth_user_id',p.auth_user_id).eq('client_id',String(cid??'')).maybeSingle();if(error)throw error;if(!data)throw new Error('Najava nije pronađena.');return data}

async function mutateNotifications(authUserId:any,fn:(rows:any[])=>any[]){
  const key='yardivo_live_notifications_v1';const {data:s,error:se}=await db.from('yardivo_app_state').select('value_json').eq('key',key).eq('deleted',false).maybeSingle();if(se)throw se;
  let rows:any[]=[];try{const z=typeof s?.value_json==='string'?JSON.parse(s.value_json):s?.value_json;if(Array.isArray(z))rows=z}catch{}
  rows=fn(rows);if(rows.length>500)rows=rows.slice(-500);
  const {error}=await db.rpc('yardivo_edge_put_state',{p_auth_user_id:authUserId,p_key:key,p_value:JSON.stringify(rows),p_client_id:'yardivo-supplier-time-ops'});if(error)throw error;
}
async function notifySupplierRequest(x:any,authUserId:any){const id='SUPREQ-'+String(x.id),now=new Date().toISOString();const z={id,event:'SUPPLIER_REQUEST',type:'blue',title:'NOVA NAJAVA DOBAVLJAČA',body:`${x.supplier_name||x.supplier_username||'Dobavljač'} · ${x.delivery_date||''} ${String(x.requested_time||'').slice(0,5)} · rampa se dodjeljuje interno`,at:now,createdAt:now,roles:['admin','manager','inventory'],supplier:x.supplier_name||x.supplier_username||'',supplierDeliveryId:String(x.id),announcementId:'SUPDEL-'+String(x.id),warehouse:String(x.warehouse||''),location:String(x.location||''),readBy:{}};await mutateNotifications(authUserId,rows=>[...rows.filter(v=>String(v?.id)!==id),z])}
async function notifyConfirmed(x:any,authUserId:any,kind='NEW'){const now=new Date().toISOString(),id=(kind==='RESCHEDULE'?'SUP-RESCHEDULED-':'SUP-CONFIRMED-')+String(x.id)+'-'+String(x.updated_at||'');const z={id,event:kind==='RESCHEDULE'?'TERM_CHANGE':'ANNOUNCEMENT_CREATED',type:'green',title:kind==='RESCHEDULE'?'PROMJENA TERMINA PRIHVAĆENA':'NOVA NAJAVA',body:`${x.supplier_name||x.supplier_username||'Dobavljač'} · ${x.delivery_date||''} ${String(x.requested_time||'').slice(0,5)} · ${String(x.warehouse||'')} · rampa TBD`,at:now,createdAt:now,roles:['admin','manager','reception','inventory'],supplier:x.supplier_name||x.supplier_username||'',supplierDeliveryId:String(x.id),announcementId:'SUPDEL-'+String(x.id),warehouse:String(x.warehouse||''),location:String(x.location||''),readBy:{}};await mutateNotifications(authUserId,rows=>[...rows.filter(v=>String(v?.id)!==id),z])}
async function notifyProposal(x:any,authUserId:any,reason:string){const id='TERM-PROPOSAL-'+String(x.id)+'-'+String(x.updated_at||''),now=new Date().toISOString();const z={id,event:'TERM_PROPOSAL',type:'blue',title:'ZAHTJEV ZA PROMJENU TERMINA',body:`${x.supplier_name||x.supplier_username||'Dobavljač'} · ${x.delivery_date||''} ${String(x.requested_time||'').slice(0,5)} → ${x.proposed_date||x.delivery_date||''} ${String(x.proposed_time||'').slice(0,5)}. ${reason||'YardOn predlaže rasterećeniji termin.'}`,at:now,createdAt:now,roles:['supplier'],targetSupplierAuthUserId:String(x.supplier_auth_user_id||''),targetSupplierUsername:String(x.supplier_username||''),supplierDeliveryId:String(x.id),warehouse:String(x.warehouse||''),location:String(x.location||''),readBy:{}};await mutateNotifications(authUserId,rows=>[...rows.filter(v=>String(v?.id)!==id),z])}
function announcementPayload(x:any){return {id:'SUPDEL-'+String(x.id),supplierDeliveryId:String(x.id),supplierPortalId:String(x.client_id||''),supplierSource:'supplier_live',supplier:x.supplier_name||x.supplier_username||'Supplier',warehouse:String(x.warehouse||''),location:String(x.location||''),date:String(x.delivery_date||''),time:String(x.requested_time||'').slice(0,5),pallets:Number(x.pallets||0),sku:Number(x.sku_count||0),plannedPlate:x.vehicle_plate||'',trailerPlate:x.trailer_plate||'',plannedDriver:x.driver_name||'',driverContact:x.driver_contact||'',reference:x.delivery_note||'',supplierNote:x.note||'',dock:x.dock||'',plannedDock:x.dock||'',duration:Number(x.duration_minutes||60),status:'Najavljen',supplierApprovalStatus:x.status,updatedAt:x.updated_at}}
async function mirrorAnnouncement(x:any,p:any){const st=String(x.status||'').toLowerCase();if(!['confirmed','arrival','dock','receiving','completed'].includes(st))return;const payload=announcementPayload(x),status={confirmed:'Najavljen',arrival:'U dvorištu',dock:'Na rampi',receiving:'Zaprimanje',completed:'Zaprimljeno'}[st]||'Najavljen';payload.status=status;const row={announcement_id:'SUPDEL-'+String(x.id),appointment_date:x.delivery_date,appointment_time:x.requested_time,supplier:x.supplier_name||x.supplier_username||null,warehouse:x.warehouse,status,created_by:'supplier:'+String(x.supplier_username||''),updated_by:p?.username||'yardivo-supplier-time-ops',payload,source_key:'yardivo_supplier_deliveries',deleted:false,updated_at:new Date().toISOString()};const {error}=await db.from('yardivo_announcements').upsert(row,{onConflict:'announcement_id'});if(error)throw error}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});if(req.method!=='POST')return J({ok:false,error:'Method not allowed'},405);
  try{
    const p=await profile(req),r=role(p.app_role),b=await req.json().catch(()=>({})),a=String(b.action||'').toLowerCase();
    if(a==='upsert'){
      if(r!=='supplier')throw new Error('Samo Supplier može poslati najavu.');
      const cid=String(b.client_id??'').trim();if(!cid)throw new Error('Nedostaje client_id.');
      const {data:existing,error:ee}=await db.from('yardivo_supplier_deliveries').select('*').eq('supplier_auth_user_id',p.auth_user_id).eq('client_id',cid).maybeSingle();if(ee)throw ee;
      if(existing&&!['pending','revision_requested'].includes(String(existing.status||'').toLowerCase()))throw new Error('Ovu najavu više nije moguće mijenjati kroz novi unos.');
      const {w,loc}=await warehouseAllowed(p,b.warehouse,b.location),pal=n(b.pallets),sku=n(b.sku_count),d=date(b.delivery_date),t=time(b.requested_time),slot=await validateCapacity(w,d,t,pal,existing?.id);
      const row={client_id:cid,supplier_auth_user_id:p.auth_user_id,supplier_username:p.username,supplier_name:p.supplier_name??p.username,location:loc,warehouse:String(w.id),order_number:order(b.order_number),delivery_date:d,requested_time:slot.time,pallets:pal,sku_count:sku,dock:null,dock_number:null,duration_minutes:slot.duration_minutes,slot_start:slot.slot_start,slot_end:slot.slot_end,vehicle_plate:String(b.vehicle_plate??'').trim().toUpperCase()||null,trailer_plate:String(b.trailer_plate??'').trim().toUpperCase()||null,driver_name:String(b.driver_name??'').trim()||null,driver_contact:String(b.driver_contact??'').trim()||null,delivery_note:String(b.delivery_note??'').trim()||null,note:String(b.note??'').trim()||null,...documentFields(b),status:'pending',proposed_time:null,proposed_dock:null,proposed_date:null,review_note:existing?.status==='revision_requested'?'Dobavljač je ponovno poslao termin na provjeru. Rampa se dodjeljuje interno.':existing?.review_note||null,updated_at:new Date().toISOString()};
      const {data,error}=await db.from('yardivo_supplier_deliveries').upsert(row,{onConflict:'supplier_auth_user_id,client_id'}).select('*').single();if(error)throw error;if(!existing)await notifySupplierRequest(data,p.auth_user_id);return J({ok:true,data});
    }

    if(a==='internal_update'){
      if(!['admin','manager','inventory','reception'].includes(r))throw new Error('Nema ovlasti.');
      const x=await rowById(b.id);if(r!=='admin'&&!p.all_warehouses&&!arr(p.warehouses).includes(String(x.warehouse)))throw new Error('Nema ovlasti za ovo skladište.');
      const requestedStatus='status' in b?String(b.status||'').toLowerCase():String(x.status||'').toLowerCase(),previous=String(x.status||'').toLowerCase();
      if(r==='reception'&&(['delivery_date','requested_time'].some(k=>k in b)||['pending','revision_requested','proposal_sent','confirmed','reschedule_requested','cancel_requested','rejected','cancelled'].includes(requestedStatus)&&'status' in b))throw new Error('Prijam ne može odobravati ili premještati Supplier najave.');
      const patch:any={updated_at:new Date().toISOString()};
      for(const k of ['vehicle_plate','trailer_plate','driver_name','driver_contact'])if(k in b)patch[k]=String(b[k]??'').trim()||null;
      if('review_note' in b)patch.review_note=String(b.review_note??'').trim()||null;
      const d=('delivery_date' in b)?date(b.delivery_date):String(x.delivery_date),t=('requested_time' in b)?time(b.requested_time):String(x.requested_time||'').slice(0,5);
      const planning=['pending','revision_requested','proposal_sent','confirmed','reschedule_requested','cancel_requested','rejected','cancelled'].includes(requestedStatus);
      if(t&&(planning||'delivery_date' in b||'requested_time' in b)){
        const {w,loc}=await warehouseAllowed(p,x.warehouse,x.location),slot=await validateCapacity(w,d,t,Number(x.pallets),String(x.id));
        Object.assign(patch,{location:loc,delivery_date:d,requested_time:slot.time,dock:null,dock_number:null,duration_minutes:slot.duration_minutes,slot_start:slot.slot_start,slot_end:slot.slot_end});
      }
      if('status' in b){if(!['pending','revision_requested','proposal_sent','confirmed','reschedule_requested','cancel_requested','arrival','dock','receiving','completed','rejected','cancelled'].includes(requestedStatus))throw new Error('Nepoznat status.');patch.status=requestedStatus;if(requestedStatus==='proposal_sent'){patch.proposed_date=('proposed_date' in b)?date(b.proposed_date):d;patch.proposed_time=('proposed_time' in b)?time(b.proposed_time):t;patch.proposed_dock=null}if(requestedStatus==='rejected'){patch.slot_start=null;patch.slot_end=null;patch.dock_number=null;patch.dock=null;patch.duration_minutes=null}}
      const {data,error}=await db.from('yardivo_supplier_deliveries').update(patch).eq('id',x.id).select('*').single();if(error)throw error;await mirrorAnnouncement(data,p);if(requestedStatus==='confirmed'&&previous!=='confirmed')await notifyConfirmed(data,p.auth_user_id,'NEW');return J({ok:true,data});
    }

    if(a==='internal_resolve_supplier_request'){
      if(!['admin','inventory'].includes(r))throw new Error('Samo Admin ili Upravljanje zalihama može riješiti Supplier zahtjev.');
      const x=await rowById(b.id);if(r!=='admin'&&!p.all_warehouses&&!arr(p.warehouses).includes(String(x.warehouse)))throw new Error('Nema ovlasti za ovo skladište.');
      const st=String(x.status||'').toLowerCase(),decision=String(b.decision||'').toLowerCase();if(!['reschedule_requested','cancel_requested'].includes(st))throw new Error('Nema aktivnog Supplier zahtjeva.');if(!['approve','reject'].includes(decision))throw new Error('Nepoznata odluka.');
      if(st==='cancel_requested')return J({ok:false,code:'USE_CANONICAL_CANCEL_RESOLVER',error:'Otkazivanje se rješava kroz postojeći canonical resolver.'},409);
      if(decision==='reject'){const {data,error}=await db.from('yardivo_supplier_deliveries').update({status:'confirmed',proposed_date:null,proposed_time:null,proposed_dock:null,updated_at:new Date().toISOString()}).eq('id',x.id).select('*').single();if(error)throw error;return J({ok:true,data})}
      const d=String(x.proposed_date||x.delivery_date),t=String(x.proposed_time||x.requested_time).slice(0,5),{w,loc}=await warehouseAllowed(p,x.warehouse,x.location),slot=await validateCapacity(w,d,t,Number(x.pallets),String(x.id));
      const {data,error}=await db.from('yardivo_supplier_deliveries').update({status:'confirmed',location:loc,delivery_date:d,requested_time:slot.time,dock:null,dock_number:null,duration_minutes:slot.duration_minutes,slot_start:slot.slot_start,slot_end:slot.slot_end,proposed_date:null,proposed_time:null,proposed_dock:null,updated_at:new Date().toISOString()}).eq('id',x.id).select('*').single();if(error)throw error;await mirrorAnnouncement(data,p);await notifyConfirmed(data,p.auth_user_id,'RESCHEDULE');return J({ok:true,data});
    }

    if(a==='smart_propose'){
      if(!['admin','inventory'].includes(r))throw new Error('Samo Upravljanje zalihama ili Admin može poslati Smart prijedlog.');
      const x=await rowById(b.id);if(String(x.status||'').toLowerCase()!=='confirmed')throw new Error('Smart prijedlog se šalje samo za potvrđenu najavu.');
      const d=date(b.proposed_date),t=time(b.proposed_time),{w}=await warehouseAllowed(p,x.warehouse,x.location);await validateCapacity(w,d,t,Number(x.pallets),String(x.id));const reason=await geminiProposalReason(x,d,t,w);
      const {data,error}=await db.from('yardivo_supplier_deliveries').update({status:'proposal_sent',proposed_date:d,proposed_time:t,proposed_dock:null,review_note:[String(x.review_note||'').trim(),`YardOn prijedlog termina: ${x.delivery_date} ${String(x.requested_time||'').slice(0,5)} → ${d} ${t}. ${reason}`].filter(Boolean).join('\n'),updated_at:new Date().toISOString()}).eq('id',x.id).select('*').single();if(error)throw error;await notifyProposal(data,p.auth_user_id,reason);return J({ok:true,data});
    }

    if(a==='supplier_accept'){
      if(r!=='supplier')throw new Error('Samo Supplier može prihvatiti ponuđeni termin.');
      const x=await mine(p,b.client_id);if(String(x.status)!=='proposal_sent')throw new Error('Nema aktivnog prijedloga termina.');
      const d=String(x.proposed_date||x.delivery_date),t=String(x.proposed_time||x.requested_time).slice(0,5),{w,loc}=await warehouseAllowed(p,x.warehouse,x.location),slot=await validateCapacity(w,d,t,Number(x.pallets),String(x.id));
      const {data,error}=await db.from('yardivo_supplier_deliveries').update({status:'confirmed',location:loc,delivery_date:d,requested_time:slot.time,dock:null,dock_number:null,duration_minutes:slot.duration_minutes,slot_start:slot.slot_start,slot_end:slot.slot_end,proposed_date:null,proposed_time:null,proposed_dock:null,review_note:[String(x.review_note||'').trim(),'Dobavljač je prihvatio YardOn predloženi termin. Rampa se dodjeljuje interno.'].filter(Boolean).join('\n'),updated_at:new Date().toISOString()}).eq('id',x.id).select('*').single();if(error)throw error;await mirrorAnnouncement(data,p);await notifyConfirmed(data,p.auth_user_id,'RESCHEDULE');return J({ok:true,data});
    }

    return J({ok:false,error:'Nepoznata time-only akcija.'},400);
  }catch(e){const msg=e instanceof Error?e.message:String(e);return J({ok:false,error:msg},400)}
});