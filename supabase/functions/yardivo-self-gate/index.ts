import { createClient } from "jsr:@supabase/supabase-js@2.116.0";

const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const J=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...H,"Content-Type":"application/json","Cache-Control":"no-store"}});
const enc=new TextEncoder();
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",enc.encode(v));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function tok(){const b=new Uint8Array(32);crypto.getRandomValues(b);return btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function esc(v:any){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] as string))}
const BASE=()=>Deno.env.get("SUPABASE_URL")||"";
const db=()=>createClient(BASE(),Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",{auth:{persistSession:false,autoRefreshToken:false}});

async function auth(req:Request,roles:string[]){
  const bearer=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
  if(!bearer)return null;
  const d=db(),{data:u,error}=await d.auth.getUser(bearer); if(error||!u.user?.id)return null;
  const {data:a}=await d.from("yardivo_user_access").select("auth_user_id,username,app_role,active,warehouses,all_warehouses").eq("auth_user_id",u.user.id).maybeSingle();
  if(!a?.active||!roles.includes(String(a.app_role)))return null;
  return {user:u.user,access:a};
}
async function master(){
  const d=db(),{data}=await d.from("yardivo_app_state").select("value_json").eq("key","yardivo_master_data_registry_v583").eq("deleted",false).maybeSingle();
  try{return JSON.parse(String(data?.value_json||"{}"))}catch{return {locations:[],warehouses:[]}}
}
async function qrCfg(){
  const d=db(),{data}=await d.from("yardivo_app_state").select("value_json").eq("key","yardivo_qr_scan_cfg_v583").eq("deleted",false).maybeSingle();
  try{return JSON.parse(String(data?.value_json||"{}"))}catch{return {enabled:true,byWarehouse:{}}}
}
function roleQr(c:any,w:string,r:"gate"|"reception"){
  const x=c?.byWarehouse?.[w];
  if(x&&typeof x==="object"&&typeof x[r]==="boolean")return x[r];
  if(x&&typeof x==="object"&&typeof x.enabled==="boolean")return x.enabled;
  if(typeof x==="boolean")return x;
  return c?.enabled!==false;
}
async function wallContext(raw:string){
  const d=db(),{data}=await d.from("yardivo_app_state").select("value_json").eq("key","yardivo_self_gate_wall_tokens_v1").eq("deleted",false).maybeSingle();
  let x:any={};try{x=JSON.parse(String(data?.value_json||"{}"))}catch{}
  const m=await master();
  for(const [k,v] of Object.entries(x||{})){
    if(String((v as any)?.token||"")!==raw)continue;
    let location=String((v as any)?.location_id||"");
    if(!location){
      const w=(m.warehouses||[]).find((z:any)=>String(z.id)===String(k));
      location=String(w?.location_id||"");
    }
    if(location)return {location,key:String(k)};
  }
  return null;
}
function warehouseIdsForLocation(m:any,location:string){
  return (m.warehouses||[]).filter((w:any)=>w&&w.active!==false&&String(w.location_id||"")===String(location)).map((w:any)=>String(w.id));
}
function locationGateEnabled(c:any,m:any,location:string){
  const ids=warehouseIdsForLocation(m,location);
  return ids.some((w:string)=>roleQr(c,w,"gate"));
}
async function findPass(raw:string){
  const h=await sha(raw),d=db();
  const {data,error}=await d.from("yardivo_delivery_passes").select("*").or(`pass_token_hash.eq.${h},wall_session_token_hash.eq.${h}`).maybeSingle();
  if(error)throw error;
  return data;
}
function terminalState(v:any){
  return ["COMPLETED","REJECTED","CANCELLED","REVOKED","EXPIRED"].includes(String(v||"").toUpperCase());
}
function terminalMessage(v:any){
  const s=String(v||"").toUpperCase();
  if(s==="COMPLETED")return "DELIVERY PASS VIŠE NIJE AKTIVAN · ISPORUKA JE ZAVRŠENA.";
  if(s==="REJECTED")return "DELIVERY PASS VIŠE NIJE AKTIVAN · ISPORUKA JE ODBIJENA.";
  if(s==="CANCELLED")return "DELIVERY PASS VIŠE NIJE AKTIVAN · NAJAVA JE OTKAZANA.";
  if(s==="REVOKED")return "DELIVERY PASS VIŠE NIJE AKTIVAN · PASS JE OPOZVAN.";
  if(s==="EXPIRED")return "DELIVERY PASS VIŠE NIJE AKTIVAN · PASS JE ISTEKAO.";
  return "DELIVERY PASS VIŠE NIJE AKTIVAN.";
}
async function ann(id:string){
  const d=db(),{data,error}=await d.from("yardivo_announcements").select("*").eq("announcement_id",id).eq("deleted",false).maybeSingle();
  if(error)throw error;return data;
}
async function event(passId:string,kind:string,message:string,actorRole="yardivo",actorName="YardOn"){
  const d=db();await d.from("yardivo_delivery_pass_events").insert({delivery_pass_id:passId,kind,message,actor_role:actorRole,actor_name:actorName});
}
async function notifyLive(n:any){
  const d=db(),key="yardivo_live_notifications_v1";
  const {data:s,error:se}=await d.from("yardivo_app_state").select("*").eq("key",key).eq("deleted",false).maybeSingle();if(se)throw se;
  let rows:any[]=[];try{const x=JSON.parse(String(s?.value_json||"[]"));if(Array.isArray(x))rows=x}catch{}
  const id=String(n?.id||crypto.randomUUID());
  rows=[...rows.filter(x=>String(x?.id||"")!==id),{...n,id,at:n?.at||new Date().toISOString(),createdAt:n?.createdAt||new Date().toISOString(),readBy:n?.readBy&&typeof n.readBy==="object"?n.readBy:{}}];
  if(rows.length>500)rows=rows.slice(-500);
  const patch={value_json:JSON.stringify(rows),updated_at:new Date().toISOString(),updated_by:"yardivo-self-gate",client_id:"yardivo-self-gate",deleted:false};
  if(s?.key){const {error}=await d.from("yardivo_app_state").update(patch).eq("key",key);if(error)throw error}
  else{const {error}=await d.from("yardivo_app_state").insert({key,...patch});if(error)throw error}
}
async function notifyGateRequest(p:any,ar:any,iso:string){
  const pay=ar?.payload||{},plate=String(p?.vehicle_plate||""),driver=String(p?.driver_name||""),wh=String(p?.warehouse||ar?.warehouse||pay?.warehouse||"");
  await notifyLive({id:"GATE-REQ-"+String(p.id),event:"GATE_ENTRY_REQUEST",type:"warning",title:"ZAHTJEV ZA ULAZ",body:`${plate||"Vozilo bez registracije"} · ${driver||"Vozač"} · čeka odobrenje Porte`,roles:["gate","admin"],deliveryPassId:String(p.id),announcementId:String(p.announcement_id||ar?.announcement_id||""),supplierDeliveryId:String(p.supplier_delivery_id||pay?.supplierDeliveryId||""),warehouse:wh,location:String(p?.location||""),source:"self_gate",at:iso,createdAt:iso,readBy:{}});
}
async function notifyYardStatus(p:any,ar:any,status:string,iso:string,actor:string){
  const pay=ar?.payload||{},wh=String(p?.warehouse||ar?.warehouse||pay?.warehouse||""),plate=String(p?.vehicle_plate||pay?.arrivalPlate||pay?.plannedPlate||"");
  await notifyLive({id:"ANN-STATUS-"+String(p?.announcement_id||ar?.announcement_id||"")+"-"+status.toLowerCase().replace(/\s+/g,"-"),event:"ANNOUNCEMENT_STATUS_CHANGED",type:"success",title:"STATUS NAJAVE · "+status.toUpperCase(),body:`${plate||pay?.supplier||"Najava"} · ${status}`,roles:["admin","manager","inventory","reception","gate","supplier"],deliveryPassId:String(p?.id||""),announcementId:String(p?.announcement_id||ar?.announcement_id||""),supplierDeliveryId:String(p?.supplier_delivery_id||pay?.supplierDeliveryId||""),warehouse:wh,location:String(p?.location||""),status,source:"gate_decision",actor,at:iso,createdAt:iso,readBy:{}});
}
function dockLabel(v:any){const s=String(v||"").trim();if(!s)return"";return "Rampa "+s.replace(/^R/i,"")}
async function dockAvailable(pass:any){
  const dock=String(pass?.dock||"").trim();if(!dock)return false;
  const d=db();let q=d.from("yardivo_delivery_passes").select("id,state,dock").eq("warehouse",String(pass.warehouse||"")).eq("dock",dock).in("state",["PROCEED_DOCK"]);
  if(pass?.id)q=q.neq("id",pass.id);
  const {data,error}=await q.limit(1);if(error)throw error;return !(data||[]).length
}
async function parkingSlotFor(pass:any,preferred:any){
  const d=db(),wh=String(pass?.warehouse||""),want=String(preferred||"").trim().toUpperCase();
  const {data,error}=await d.from("yardivo_delivery_passes").select("id,parking_slot").eq("warehouse",wh).in("state",["PARKING","WAITING_DOCK"]).not("parking_slot","is",null);if(error)throw error;
  const used=new Set((data||[]).filter((x:any)=>String(x.id)!==String(pass?.id||"")).map((x:any)=>String(x.parking_slot||"").toUpperCase()));
  if(want&&!used.has(want))return want;
  for(let i=1;i<=30;i++){const p="P"+i;if(!used.has(p))return p}
  return want||"P1"
}
function appointmentOnTime(pass:any){
  if(!pass?.appointment_at)return false;const t=new Date(pass.appointment_at).getTime(),now=Date.now();return now>=t-15*60*1000&&now<=t+30*60*1000
}
function appAt(p:any){
  const date=String(p?.date||p?.delivery_date||"").slice(0,10),time=String(p?.time||p?.requested_time||"").slice(0,5);
  if(!date)return null; const dt=new Date(date+"T"+(time||"00:00")+":00+02:00"); return isNaN(dt.getTime())?null:dt.toISOString();
}
async function issueFromAnnouncement(id:string,actor:any){
  const d=db(),a=await ann(id);if(!a)throw new Error("ANNOUNCEMENT_NOT_FOUND");
  const p=a.payload||{}, raw=tok(), h=await sha(raw), wh=String(p.warehouse||a.warehouse||""),m=await master();
  const w=(m.warehouses||[]).find((x:any)=>String(x.id)===wh),loc=String(w?.location_id||p.location||"");
  const deliveryId=String(p.supplierDeliveryId||"").trim()||null;
  let delivery:any=null;if(deliveryId){const q=await d.from("yardivo_supplier_deliveries").select("*").eq("id",deliveryId).maybeSingle();delivery=q.data}
  const supplier=String(delivery?.supplier_name||p.supplier||a.supplier||"Dobavljač");
  const row:any={announcement_id:id,supplier_delivery_id:deliveryId,pass_token_hash:h,wall_session_token_hash:null,warehouse:wh,location:loc,supplier_name:supplier,appointment_at:appAt(delivery||p),dock:null,parking_slot:null,driver_name:delivery?.driver_name||null,driver_phone:delivery?.driver_contact||null,vehicle_plate:delivery?.vehicle_plate||null,trailer_plate:delivery?.trailer_plate||null,state:"OPEN",gate_decision:null,gate_decided_at:null,gate_decided_by:null,last_instruction:"Otvorite YardOn Delivery Pass i dovršite podatke prije dolaska.",checked_in_at:null,completed_at:null,revoked_at:null,revoked_by:null,terminal_reason:null,payload:{order_number:delivery?.order_number||p.orderNumber||"",pallets:delivery?.pallets??p.pallets??0,sku:delivery?.sku_count??p.sku??0},updated_at:new Date().toISOString()};
  const {data,error}=await d.from("yardivo_delivery_passes").upsert(row,{onConflict:"announcement_id"}).select("*").single();if(error)throw error;
  await event(data.id,"issued","YardOn DELIVERY PASS je aktiviran.",String(actor?.access?.app_role||"yardivo"),String(actor?.access?.username||"YardOn"));
  return {row:data,raw};
}
async function maybeAutoDock(pass:any){
  if(!pass||pass.gate_decision!=="APPROVED"||!pass.dock||!pass.appointment_at)return pass;
  if(!["PARKING","WAITING_DOCK"].includes(String(pass.state)))return pass;
  if(!appointmentOnTime(pass)||!(await dockAvailable(pass)))return pass;
  const msg=`Rampa je slobodna i termin je aktivan. Idite na ${dockLabel(pass.dock)}.`;
  const d=db(),{data}=await d.from("yardivo_delivery_passes").update({state:"PROCEED_DOCK",parking_slot:null,last_instruction:msg,updated_at:new Date().toISOString()}).eq("id",pass.id).select("*").single();
  await event(pass.id,"instruction",msg,"reception","YardOn PRIJAM");
  return data||pass;
}
function page(kind:string,token:string){
  const isWall=kind==="wall";
  return `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>YardOn ${isWall?"Self Gate Check-In":"Delivery Pass"}</title>
<style>*{box-sizing:border-box}body{margin:0;background:#06131d;color:#eaf5fb;font-family:Arial,sans-serif}.top{padding:22px;text-align:center;background:#081b29;border-bottom:1px solid #18394d}.logo{font-size:30px;font-weight:1000;letter-spacing:.12em}.sub{font-size:12px;color:#7fa4b8;margin-top:5px}.wrap{max-width:620px;margin:auto;padding:18px}.card{background:#0b2030;border:1px solid #21495f;border-radius:16px;padding:18px;margin-bottom:14px}.state{font-size:22px;font-weight:1000;margin:4px 0 8px}.red{border-color:#9e3942;background:#351419}.green{border-color:#2d8b56;background:#0d2d1b}.amber{border-color:#8b6a27;background:#342a10}label{display:block;font-size:11px;font-weight:900;color:#9ab6c6;margin:11px 0 5px}input,button,textarea{width:100%;padding:13px;border-radius:10px;border:1px solid #31556a;background:#071824;color:#eef8fd;font:inherit}button{margin-top:12px;background:#18bd67;color:#04130a;border:0;font-weight:1000;cursor:pointer}.secondary{background:#16364a;color:#dff3ff}.msg{padding:10px 0;border-bottom:1px solid #18394d;font-size:13px;line-height:1.45}.small{font-size:11px;color:#89a7b7;line-height:1.5}.dock{font-size:28px;font-weight:1000;color:#7ff0a7}.hidden{display:none}.err{color:#ff9ca4;font-weight:900}</style></head><body><div class="top"><div class="logo">YardOn</div><div class="sub">${isWall?"SELF GATE CHECK-IN":"DELIVERY PASS"}</div></div><div class="wrap">
<div id="app" class="card">Učitavanje...</div><div id="timeline" class="card hidden"><b>YardOn PORUKE</b><div id="events"></div></div></div>
<script>
const TOKEN=${JSON.stringify(token)}, KIND=${JSON.stringify(kind)}, URL=location.origin+location.pathname;
async function api(action,payload={}){const r=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token:TOKEN,...payload})});const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||d.error||'Greška');return d}
function e(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function form(pass){return '<div class="state">Dovršite podatke vozača</div><div class="small">'+e(pass.supplier_name||'')+' · '+e(pass.warehouse_name||pass.warehouse||'')+'</div><label>REGISTRACIJA VOZILA</label><input id="plate" value="'+e(pass.vehicle_plate||'')+'"><label>IME I PREZIME VOZAČA</label><input id="driver" value="'+e(pass.driver_name||'')+'"><label>MOBITEL VOZAČA</label><input id="phone" value="'+e(pass.driver_phone||'')+'"><label>BROJ NARUDŽBE (opcionalno)</label><input id="orderNo" value="'+e(pass.payload?.order_number||'')+'"><label>REGISTRACIJA PRIKOLICE (opcionalno)</label><input id="trailer" value="'+e(pass.trailer_plate||'')+'"><label>PRIJEVOZNIK (opcionalno)</label><input id="carrier" value="'+e(pass.carrier_company||'')+'"><button onclick="submitInfo()">POTVRDI SELF CHECK-IN</button>'}
function statusCard(p){let cls=p.state==='REJECTED'?'red':p.state==='PROCEED_DOCK'?'green':p.state==='PARKING'?'amber':'card';let title={WAITING_GATE:'ČEKA ODOBRENJE PORTE',PARKING:'ULAZ ODOBREN · PARKING',PROCEED_DOCK:'IDITE NA RAMPU',REJECTED:'ULAZ NIJE ODOBREN',COMPLETED:'ZAVRŠENO'}[p.state]||'YardOn DELIVERY PASS';let extra=p.state==='PROCEED_DOCK'?'<div class="dock">'+e(p.last_instruction||'')+'</div>':'<div style="font-size:16px;font-weight:900">'+e(p.last_instruction||'')+'</div>';return '<div class="'+cls+'"><div class="small">'+e(p.supplier_name||'')+' · '+e(p.warehouse_name||p.warehouse||'')+'</div><div class="state">'+title+'</div>'+extra+(p.parking_slot?'<div class="small">Parking: <b>'+e(p.parking_slot)+'</b></div>':'')+'<div class="small" style="margin-top:10px">Registracija: '+e(p.vehicle_plate||'—')+' · Vozač: '+e(p.driver_name||'—')+'</div></div><div class="card"><b>CHAT S PRIJAMOM</b><div class="small">Poruka ide direktno Prijamu za ovaj Delivery Pass.</div><textarea id="driverMsg" placeholder="Npr. stigao sam na parking, problem kod rampe, trebam pomoć..."></textarea><button class="secondary" onclick="sendMsg()">POŠALJI PRIJAMU</button></div>'}
async function submitInfo(){try{await api('submit_info',{plate:plate.value,driver:driver.value,phone:phone.value,orderNumber:document.getElementById('orderNo')?.value||'',trailer:trailer.value,carrier:carrier.value});await load()}catch(x){alert(x.message)}}
async function sendMsg(){const v=document.getElementById('driverMsg')?.value?.trim();if(!v)return;try{await api('driver_message',{message:v});document.getElementById('driverMsg').value='';await load()}catch(x){alert(x.message)}}
async function wallSubmit(){try{const d=await api('wall_submit',{reference:ref.value,plate:wplate.value,driver:wdriver.value,phone:wphone.value});location.href=URL+'?pass='+encodeURIComponent(d.sessionToken)}catch(x){document.getElementById('wallErr').textContent=x.message}}
async function load(){try{if(KIND==='wall'){const d=await api('wall_status');if(!d.enabled){app.className='card red';app.innerHTML='<div class="state">SELF CHECK-IN · NE RADI</div><div>Javite se djelatniku na Porti.</div>';return}app.innerHTML='<div class="state">YardOn SELF GATE CHECK-IN</div><div class="small">'+e(d.warehouseName)+' · skenirano na ulazu</div><label>BROJ NAJAVE / NARUDŽBE</label><input id="ref"><label>REGISTRACIJA VOZILA</label><input id="wplate"><label>IME VOZAČA</label><input id="wdriver"><label>MOBITEL</label><input id="wphone"><div id="wallErr" class="err"></div><button onclick="wallSubmit()">NASTAVI</button>';return}
const d=await api('status'),p=d.pass;document.getElementById('app').outerHTML='<div id="app">'+((p.state==='OPEN'||p.state==='INFO_REQUIRED')?'<div class="card">'+form(p)+'</div>':statusCard(p))+'</div>';const tl=document.getElementById('timeline');tl.classList.remove('hidden');document.getElementById('events').innerHTML=(d.events||[]).map(x=>'<div class="msg"><b>'+e(x.actor_name||'YardOn')+'</b> · '+new Date(x.created_at).toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'})+'<br>'+e(x.message)+'</div>').join('')||'<div class="small">Nema novih poruka.</div>'}catch(x){app.className='card red';app.innerHTML='<div class="state">GREŠKA</div><div>'+e(x.message)+'</div>'}}
load();if(KIND==='pass')setInterval(load,5000);
</script></body></html>`;
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  try{
    const u=new URL(req.url);
    if(req.method==="GET"){
      const pass=u.searchParams.get("pass")||"",wall=u.searchParams.get("wall")||"";
      if(pass)return new Response(page("pass",pass),{headers:{...H,"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
      if(wall)return new Response(page("wall",wall),{headers:{...H,"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
      return new Response("YardOn SELF GATE",{headers:{...H,"Content-Type":"text/plain"}});
    }
    if(req.method!=="POST")return J({ok:false,error:"METHOD_NOT_ALLOWED"},405);
    const b=await req.json().catch(()=>({})),action=String(b.action||"").toLowerCase(),d=db();

    if(action==="wall_token_status"||action==="wall_token_create"||action==="wall_token_regenerate"){
      const a=await auth(req,["admin"]);if(!a)return J({ok:false,error:"FORBIDDEN"},403);
      const m=await master(),location=String(b.location||"").trim();
      if(!location)return J({ok:false,error:"LOCATION_REQUIRED"},400);
      const loc=(m.locations||[]).find((z:any)=>String(z.id)===location&&z.active!==false);
      if(!loc)return J({ok:false,error:"LOCATION_NOT_FOUND"},404);
      const {data:s,error:se}=await d.from("yardivo_app_state").select("*").eq("key","yardivo_self_gate_wall_tokens_v1").eq("deleted",false).maybeSingle();
      if(se)throw se;
      let x:any={};try{x=JSON.parse(String(s?.value_json||"{}"))}catch{}
      const existing=String(x?.[location]?.token||"");
      if(action==="wall_token_status"){
        const cfg=await qrCfg();
        const enabled=locationGateEnabled(cfg,m,location);
        return J({ok:true,location,locationName:String(loc?.name||location),exists:!!existing,enabled});
      }
      if(action==="wall_token_create"&&existing){
        return J({ok:true,location,locationName:String(loc?.name||location),exists:true,created:false,url:`${BASE()}/functions/v1/yardivo-self-gate?wall=${encodeURIComponent(existing)}`});
      }
      if(action==="wall_token_regenerate"&&b.confirm!==true)return J({ok:false,error:"REGENERATE_CONFIRM_REQUIRED"},400);
      const raw=tok();
      x[location]={token:raw,location_id:location,scope:"location",created_at:new Date().toISOString(),created_by:String(a.access.username||"admin")};
      const patch={value_json:JSON.stringify(x),updated_at:new Date().toISOString(),updated_by:String(a.access.username||"admin"),client_id:"yardivo-self-gate-admin"};
      let q;
      if(s?.key)q=await d.from("yardivo_app_state").update(patch).eq("key","yardivo_self_gate_wall_tokens_v1");
      else q=await d.from("yardivo_app_state").insert({key:"yardivo_self_gate_wall_tokens_v1",...patch,deleted:false});
      if(q.error)throw q.error;
      return J({ok:true,location,locationName:String(loc?.name||location),exists:true,created:!existing,regenerated:!!existing,url:`${BASE()}/functions/v1/yardivo-self-gate?wall=${encodeURIComponent(raw)}`});
    }

    if(action==="wall_link"){
      const a=await auth(req,["admin"]);if(!a)return J({ok:false,error:"FORBIDDEN"},403);
      const m=await master();
      let location=String(b.location||"").trim();
      const wh=String(b.warehouse||"").trim();
      if(!location&&wh){
        const w=(m.warehouses||[]).find((z:any)=>String(z.id)===wh);
        location=String(w?.location_id||"");
      }
      if(!location)return J({ok:false,error:"LOCATION_REQUIRED"},400);
      const {data:s}=await d.from("yardivo_app_state").select("value_json").eq("key","yardivo_self_gate_wall_tokens_v1").eq("deleted",false).maybeSingle();
      let x:any={};try{x=JSON.parse(String(s?.value_json||"{}"))}catch{}
      const raw=String(x?.[location]?.token||"");
      if(!raw)return J({ok:false,error:"WALL_TOKEN_NOT_FOUND"},404);
      const loc=(m.locations||[]).find((z:any)=>String(z.id)===location);
      return J({ok:true,location,locationName:String(loc?.name||location),url:`${BASE()}/functions/v1/yardivo-self-gate?wall=${encodeURIComponent(raw)}`});
    }
    if(action==="issue"){
      const a=await auth(req,["admin","inventory","manager"]);if(!a)return J({ok:false,error:"FORBIDDEN"},403);
      const id=String(b.announcementId||"").trim();if(!id)return J({ok:false,error:"ANNOUNCEMENT_REQUIRED"},400);
      const out=await issueFromAnnouncement(id,a),url=`${BASE()}/functions/v1/yardivo-self-gate?pass=${encodeURIComponent(out.raw)}`;
      return J({ok:true,url,token:out.raw,pass:out.row});
    }
    if(action==="list_gate"){
      const a=await auth(req,["admin","gate"]);if(!a)return J({ok:false,error:"FORBIDDEN"},403);
      let q=d.from("yardivo_delivery_passes").select("*").in("state",["WAITING_GATE","PARKING","PROCEED_DOCK","WAITING_DOCK"]).order("updated_at",{ascending:false}).limit(50);
      if(String(a.access.app_role)!=="admin"&&!a.access.all_warehouses)q=q.in("warehouse",a.access.warehouses||[]);
      const {data,error}=await q;if(error)throw error;
      const rows=data||[],ids=[...new Set(rows.map((x:any)=>String(x.announcement_id||"")).filter(Boolean))];
      let anns:any[]=[];if(ids.length){const aq=await d.from("yardivo_announcements").select("announcement_id,warehouse,supplier,status,payload").in("announcement_id",ids).eq("deleted",false);if(aq.error)throw aq.error;anns=aq.data||[]}
      const amap=new Map(anns.map((x:any)=>[String(x.announcement_id),x])),m=await master();
      const out=rows.map((p:any)=>{
        const ar=amap.get(String(p.announcement_id)),pay=ar?.payload||{},w=(m.warehouses||[]).find((x:any)=>String(x.id)===String(p.warehouse)),locId=String(p.location||w?.location_id||""),loc=(m.locations||[]).find((x:any)=>String(x.id)===locId);
        return {...p,announcement_ref:String(pay.announcementRef||p.announcement_id||""),order_number:String(pay.orderNumber||p.payload?.order_number||""),warehouse_name:String(w?.name||p.warehouse||""),location_name:String(loc?.name||locId),announcement_status:String(ar?.status||pay.status||"")};
      });
      return J({ok:true,rows:out});
    }
    if(action==="manual_gate_enter"){
      const a=await auth(req,["admin","gate"]);if(!a)return J({ok:false,error:"FORBIDDEN"},403);
      const announcementId=String(b.announcementId||"").trim();if(!announcementId)return J({ok:false,error:"ANNOUNCEMENT_REQUIRED"},400);
      const ar=await ann(announcementId);if(!ar)return J({ok:false,error:"ANNOUNCEMENT_NOT_FOUND"},404);
      const wh=String(ar.warehouse||ar.payload?.warehouse||"");
      if(String(a.access.app_role)!=="admin"&&!a.access.all_warehouses&&!(a.access.warehouses||[]).map(String).includes(wh))return J({ok:false,error:"FORBIDDEN_WAREHOUSE"},403);
      const iso=new Date().toISOString(),pay={...(ar.payload||{}),status:"U dvorištu",gateCheckedAt:iso,gateCheckedBy:a.access.username,yardArrivalAt:iso,firstArrivalAt:ar.payload?.firstArrivalAt||iso,manualGateEntry:true,updatedAt:iso,updatedBy:a.access.username};
      await d.from("yardivo_announcements").update({status:"U dvorištu",payload:pay,updated_by:a.access.username,updated_at:iso}).eq("announcement_id",announcementId);
      const {data:p}=await d.from("yardivo_delivery_passes").select("*").eq("announcement_id",announcementId).maybeSingle();
      let state="U_DVORISTU",message="Ulaz ručno evidentiran na Porti.";
      if(p){
        const ps="PARKING",parking=await parkingSlotFor(p,""),msg=`Ulaz odobren ručno. Idite na parking ${parking}. YardOn će vam automatski poslati poruku čim vam dodijeli slobodnu rampu.`;
        await d.from("yardivo_delivery_passes").update({state:ps,parking_slot:parking,gate_decision:"APPROVED",gate_decided_at:iso,gate_decided_by:a.access.username,last_instruction:msg,updated_at:iso}).eq("id",p.id);
        await event(p.id,"gate",msg,"gate",a.access.username);state=ps;message=msg;
        if(p.supplier_delivery_id)await d.from("yardivo_supplier_deliveries").update({status:"arrival",vehicle_plate:p.vehicle_plate,driver_name:p.driver_name,driver_contact:p.driver_phone,trailer_plate:p.trailer_plate,updated_at:iso}).eq("id",p.supplier_delivery_id);
        await notifyYardStatus(p,ar,"U dvorištu",iso,a.access.username);
      }
      return J({ok:true,state,message,status:"U dvorištu",announcementId});
    }

    if(action==="gate_request_inventory"){
      const a=await auth(req,["admin","gate"]);if(!a)return J({ok:false,error:"FORBIDDEN"},403);
      const id=String(b.id||"").trim(),{data:p}=await d.from("yardivo_delivery_passes").select("*").eq("id",id).maybeSingle();if(!p)return J({ok:false,error:"PASS_NOT_FOUND"},404);
      const ar=await ann(String(p.announcement_id));
      const missing=[];if(!String(p.vehicle_plate||"").trim())missing.push("REGISTRACIJA");if(!String(p.driver_name||"").trim())missing.push("IME VOZAČA");
      const iso=new Date().toISOString(),reason=missing.length?missing.join(" + "):String(b.reason||"DODATNA PROVJERA");
      await notifyLive({id:"GATE-INVENTORY-REQ-"+String(p.id),event:"GATE_INVENTORY_INFO_REQUEST",type:"warning",title:"PORTA TRAŽI PODATKE",body:`${p.supplier_name||"Dobavljač"} · ${reason} · zahtjev za dopunu prije ulaza`,roles:["inventory","admin"],deliveryPassId:String(p.id),announcementId:String(p.announcement_id||""),supplierDeliveryId:String(p.supplier_delivery_id||""),warehouse:String(p.warehouse||""),location:String(p.location||""),missing,source:"gate",requestedBy:String(a.access.username||"Porta"),at:iso,createdAt:iso,readBy:{}});
      await event(p.id,"inventory_request",`Porta je zatražila dopunu podataka od Zaliha: ${reason}.`,"gate",String(a.access.username||"Porta"));
      return J({ok:true,requested:true,missing});
    }

    if(action==="gate_decide"){
      const a=await auth(req,["admin","gate"]);if(!a)return J({ok:false,error:"FORBIDDEN"},403);
      const id=String(b.id||""),decision=String(b.decision||"").toUpperCase(),{data:p}=await d.from("yardivo_delivery_passes").select("*").eq("id",id).maybeSingle();if(!p)return J({ok:false,error:"PASS_NOT_FOUND"},404);
      if(decision==="APPROVE"){
        const missing=[];if(!String(p.vehicle_plate||"").trim())missing.push("REGISTRACIJA");if(!String(p.driver_name||"").trim())missing.push("IME VOZAČA");
        if(missing.length)return J({ok:false,error:"DRIVER_INFO_REQUIRED",missing,message:"Nedostaju podaci vozača: "+missing.join(", ")+". Pošalji zahtjev ZALIHAMA."},409);
      }
      if(decision==="REJECT"){
        const msg=String(b.message||"Ulaz nije odobren. Javite se Porti.");await d.from("yardivo_delivery_passes").update({state:"REJECTED",gate_decision:"REJECTED",gate_decided_at:new Date().toISOString(),gate_decided_by:a.access.username,last_instruction:msg,updated_at:new Date().toISOString()}).eq("id",id);await event(id,"gate",msg,"gate",a.access.username);return J({ok:true});
      }
      const parking=await parkingSlotFor(p,"");
      const state="PARKING",msg=`Ulaz odobren. Idite na parking ${parking}. YardOn će vam automatski poslati poruku čim vam dodijeli slobodnu rampu.`;
      const iso=new Date().toISOString();await d.from("yardivo_delivery_passes").update({state,parking_slot:parking,gate_decision:"APPROVED",gate_decided_at:iso,gate_decided_by:a.access.username,last_instruction:msg,updated_at:iso}).eq("id",id);await event(id,"gate",msg,"gate",a.access.username);
      const ar=await ann(p.announcement_id);if(ar){const pay={...(ar.payload||{}),status:"U dvorištu",gateCheckedAt:iso,gateCheckedBy:a.access.username,yardArrivalAt:iso,firstArrivalAt:ar.payload?.firstArrivalAt||iso,arrivalPlate:p.vehicle_plate||"",arrivalDriver:p.driver_name||"",driverName:p.driver_name||"",driverContact:p.driver_phone||"",trailerPlate:p.trailer_plate||"",updatedAt:iso,updatedBy:a.access.username};await d.from("yardivo_announcements").update({status:"U dvorištu",payload:pay,updated_by:a.access.username,updated_at:iso}).eq("announcement_id",p.announcement_id);if(p.supplier_delivery_id)await d.from("yardivo_supplier_deliveries").update({status:"arrival",vehicle_plate:p.vehicle_plate,driver_name:p.driver_name,driver_contact:p.driver_phone,trailer_plate:p.trailer_plate,updated_at:iso}).eq("id",p.supplier_delivery_id);await notifyYardStatus(p,ar,"U dvorištu",iso,a.access.username)}
      return J({ok:true,state,message:msg,status:"U dvorištu",announcementId:p.announcement_id,supplierDeliveryId:p.supplier_delivery_id||null});
    }
    if(action==="revoke_pass"){
      const a=await auth(req,["admin","manager","inventory"]);if(!a)return J({ok:false,error:"FORBIDDEN"},403);
      const id=String(b.id||"").trim(),announcementId=String(b.announcementId||"").trim();
      let q=d.from("yardivo_delivery_passes").select("*");
      q=id?q.eq("id",id):q.eq("announcement_id",announcementId);
      const {data:p,error:pe}=await q.maybeSingle();if(pe)throw pe;if(!p)return J({ok:false,error:"PASS_NOT_FOUND"},404);
      const iso=new Date().toISOString();
      await d.from("yardivo_delivery_passes").update({state:"REVOKED",terminal_reason:"MANUALLY_REVOKED",revoked_at:iso,revoked_by:a.access.username,updated_at:iso}).eq("id",p.id);
      await event(p.id,"revoked","YardOn Delivery Pass je opozvan.",String(a.access.app_role),a.access.username);
      return J({ok:true,state:"REVOKED"});
    }
    if(action==="instruction"){
      const a=await auth(req,["admin","gate","reception"]);if(!a)return J({ok:false,error:"FORBIDDEN"},403);
      const id=String(b.id||""),{data:p}=await d.from("yardivo_delivery_passes").select("*").eq("id",id).maybeSingle();if(!p)return J({ok:false,error:"PASS_NOT_FOUND"},404);
      const dock=String(b.dock||p.dock||""),parking=await parkingSlotFor(p,b.parkingSlot||p.parking_slot),requested=String(b.message||"").trim();
      let state=String(b.state||p.state),msg=requested||"Nova YardOn uputa.",finalDock=dock,finalParking=parking;
      if(dock){
        const probe={...p,dock};
        if(appointmentOnTime(probe)&&await dockAvailable(probe)){state="PROCEED_DOCK";finalParking=null;msg=requested||`Rampa je slobodna. Idite na ${dockLabel(dock)}.`}
        else{state="PARKING";msg=requested||`Ostanite na parkingu ${parking}. Rampa još nije slobodna ili termin nije aktivan.`}
      }
      await d.from("yardivo_delivery_passes").update({dock:finalDock,parking_slot:finalParking,state,last_instruction:msg,updated_at:new Date().toISOString()}).eq("id",id);await event(id,"instruction",msg,String(a.access.app_role),a.access.username);return J({ok:true,state,message:msg});
    }

    if(action==="list_reception_chats"){
      const a=await auth(req,["admin","reception"]);if(!a)return J({ok:false,error:"FORBIDDEN"},403);
      let q=d.from("yardivo_delivery_passes").select("*").in("state",["WAITING_GATE","PARKING","WAITING_DOCK","PROCEED_DOCK"]).order("updated_at",{ascending:false}).limit(100);
      if(String(a.access.app_role)!=="admin"&&!a.access.all_warehouses)q=q.in("warehouse",a.access.warehouses||[]);
      const {data,error}=await q;if(error)throw error;
      const out=[];for(const p of data||[]){const {data:events}=await d.from("yardivo_delivery_pass_events").select("*").eq("delivery_pass_id",p.id).order("created_at",{ascending:false}).limit(30);const unread=(events||[]).filter((x:any)=>x.actor_role==="driver").length;out.push({...p,events:events||[],unread_driver_messages:unread})}
      return J({ok:true,rows:out});
    }
    if(action==="reception_send"){
      const a=await auth(req,["admin","reception"]);if(!a)return J({ok:false,error:"FORBIDDEN"},403);
      const id=String(b.id||""),msg=String(b.message||"").trim().slice(0,1000);if(!msg)return J({ok:false,error:"EMPTY_MESSAGE"},400);
      const {data:p}=await d.from("yardivo_delivery_passes").select("*").eq("id",id).maybeSingle();if(!p)return J({ok:false,error:"PASS_NOT_FOUND"},404);
      if(String(a.access.app_role)!=="admin"&&!a.access.all_warehouses&&!(a.access.warehouses||[]).map(String).includes(String(p.warehouse)))return J({ok:false,error:"FORBIDDEN_WAREHOUSE"},403);
      await event(id,"reception_message",msg,"reception",String(a.access.username||"Prijam"));
      await d.from("yardivo_delivery_passes").update({last_instruction:msg,updated_at:new Date().toISOString()}).eq("id",id);
      return J({ok:true});
    }

    const raw=String(b.token||"").trim();if(!raw)return J({ok:false,error:"TOKEN_REQUIRED"},400);
    if(action==="wall_status"){
      const wc=await wallContext(raw);if(!wc)return J({ok:false,error:"WALL_QR_INVALID"},404);
      const cfg=await qrCfg(),m=await master(),loc=(m.locations||[]).find((x:any)=>String(x.id)===wc.location);
      return J({ok:true,enabled:locationGateEnabled(cfg,m,wc.location),location:wc.location,locationName:String(loc?.name||wc.location),warehouses:warehouseIdsForLocation(m,wc.location)});
    }
    if(action==="wall_submit"){
      const wc=await wallContext(raw);if(!wc)return J({ok:false,error:"WALL_QR_INVALID"},404);
      const cfg=await qrCfg(),m=await master(),whIds=warehouseIdsForLocation(m,wc.location);
      if(!whIds.length||!locationGateEnabled(cfg,m,wc.location))return J({ok:false,error:"SELF_CHECK_IN_NE_RADI_JAVITE_SE_PORTI"},409);
      const ref=String(b.reference||"").trim().toLowerCase();if(!ref)return J({ok:false,error:"UNESITE_BROJ_NAJAVE_ILI_NARUDZBE"},400);
      const {data:rows,error}=await d.from("yardivo_announcements").select("*").in("warehouse",whIds).eq("deleted",false).limit(200);if(error)throw error;
      const hit=(rows||[]).find((x:any)=>{const p=x.payload||{};return [x.announcement_id,p.announcementRef,p.orderNumber,p.reference,p.supplierDeliveryId].some(v=>String(v||"").trim().toLowerCase()===ref)});
      if(!hit)return J({ok:false,error:"NAJAVA_NIJE_PRONADJENA_ZA_OVU_LOKACIJU"},404);
      const hitWh=String(hit.warehouse||hit.payload?.warehouse||"");
      if(!roleQr(cfg,hitWh,"gate"))return J({ok:false,error:"SELF_CHECK_IN_ISKLJUCEN_ZA_SKLADISTE_NAJAVE"},409);
      let {data:p}=await d.from("yardivo_delivery_passes").select("*").eq("announcement_id",hit.announcement_id).maybeSingle();
      if(!p){const fake={access:{app_role:"yardivo",username:"SELF GATE"}},out=await issueFromAnnouncement(hit.announcement_id,fake);p=out.row}
      const session=tok(),sh=await sha(session),iso=new Date().toISOString();
      const w=(m.warehouses||[]).find((x:any)=>String(x.id)===hitWh),whName=String(w?.name||hitWh);
      const early=p.appointment_at?Date.now()<new Date(p.appointment_at).getTime()-15*60*1000:false;
      const dock=String(p.dock||"");
      let instruction=`Najava pronađena · ${whName}. Čeka se odobrenje Porte.`;
      if(early)instruction=`Najava pronađena · ${whName}. Došli ste ranije; Porta će dodijeliti parking.`;
      else if(dock)instruction=`Najava pronađena · ${whName}. Rampa ${String(dock).replace(/^R/i,"")} je planirana; čeka se potvrda Porte.`;
      const wallPlate=String(b.plate||"").trim().toUpperCase()||p.vehicle_plate,wallDriver=String(b.driver||"").trim()||p.driver_name;
      await d.from("yardivo_delivery_passes").update({wall_session_token_hash:sh,vehicle_plate:wallPlate,driver_name:wallDriver,driver_phone:String(b.phone||"").trim()||p.driver_phone,state:"WAITING_GATE",checked_in_at:iso,last_instruction:instruction,location:wc.location,warehouse:hitWh,updated_at:iso}).eq("id",p.id);
      p={...p,vehicle_plate:wallPlate,driver_name:wallDriver,driver_phone:String(b.phone||"").trim()||p.driver_phone,state:"WAITING_GATE",checked_in_at:iso,location:wc.location,warehouse:hitWh};
      await event(p.id,"self_checkin",`Self Gate Check-In zaprimljen · ${whName}. Čeka se odobrenje Porte.`,"driver",String(b.driver||"Vozač"));
      await notifyGateRequest(p,hit,iso);
      return J({ok:true,sessionToken:session,location:wc.location,warehouse:hitWh,warehouseName:whName});
    }

    let p=await findPass(raw);if(!p)return J({ok:false,error:"DELIVERY_PASS_INVALID"},404);
    if(terminalState(p.state))return J({ok:false,error:"DELIVERY_PASS_INACTIVE",message:terminalMessage(p.state),state:p.state},410);
    if(action==="status"){
      const ar=await ann(String(p.announcement_id));
      const as=String(ar?.status||ar?.payload?.status||"").toUpperCase();
      if(["ZAPRIMLJEN","COMPLETED","RECEIVED","ODBIJEN","REJECTED","OTKAZAN","OTKAZANO","CANCELLED","CANCELED"].includes(as)){
        let ns="COMPLETED",reason="DELIVERY_COMPLETED";
        if(["ODBIJEN","REJECTED"].includes(as)){ns="REJECTED";reason="DELIVERY_REJECTED"}
        if(["OTKAZAN","OTKAZANO","CANCELLED","CANCELED"].includes(as)){ns="CANCELLED";reason="DELIVERY_CANCELLED"}
        await d.from("yardivo_delivery_passes").update({state:ns,terminal_reason:reason,completed_at:ns==="COMPLETED"?new Date().toISOString():p.completed_at,revoked_at:ns!=="COMPLETED"?new Date().toISOString():p.revoked_at,updated_at:new Date().toISOString()}).eq("id",p.id);
        return J({ok:false,error:"DELIVERY_PASS_INACTIVE",message:terminalMessage(ns),state:ns},410);
      }
      p=await maybeAutoDock(p);const m=await master(),w=(m.warehouses||[]).find((x:any)=>String(x.id)===String(p.warehouse)),locId=String(p.location||w?.location_id||""),loc=(m.locations||[]).find((x:any)=>String(x.id)===locId);const {data:events}=await d.from("yardivo_delivery_pass_events").select("*").eq("delivery_pass_id",p.id).order("created_at",{ascending:false}).limit(30);
      return J({ok:true,pass:{...p,location:locId,location_name:String(loc?.name||locId),warehouse_name:String(w?.name||p.warehouse)},events:events||[]});
    }
    if(action==="submit_info"){
      const plate=String(b.plate||"").trim().toUpperCase(),driver=String(b.driver||"").trim(),phone=String(b.phone||"").trim(),orderNo=String(b.orderNumber||"").trim().toUpperCase();if(!plate||!driver)return J({ok:false,error:"REGISTRACIJA_I_VOZAC_SU_OBAVEZNI"},400);
      const iso=new Date().toISOString(),payload={...(p.payload||{}),order_number:orderNo||p.payload?.order_number||""};
      await d.from("yardivo_delivery_passes").update({vehicle_plate:plate,driver_name:driver,driver_phone:phone,trailer_plate:String(b.trailer||"").trim().toUpperCase()||null,carrier_company:String(b.carrier||"").trim()||null,payload,state:"WAITING_GATE",checked_in_at:iso,last_instruction:"Podaci su zaprimljeni. Čeka se odobrenje Porte.",updated_at:iso}).eq("id",p.id);
      if(p.supplier_delivery_id)await d.from("yardivo_supplier_deliveries").update({vehicle_plate:plate,driver_name:driver,driver_contact:phone,trailer_plate:String(b.trailer||"").trim().toUpperCase()||null,...(orderNo?{order_number:orderNo}:{}),updated_at:iso}).eq("id",p.supplier_delivery_id);
      p={...p,vehicle_plate:plate,driver_name:driver,driver_phone:phone,trailer_plate:String(b.trailer||"").trim().toUpperCase()||null,payload,state:"WAITING_GATE",checked_in_at:iso};
      const ar=await ann(String(p.announcement_id));
      await event(p.id,"self_checkin","Podaci vozača su potvrđeni. Čeka se odobrenje Porte.","driver",driver);
      await notifyGateRequest(p,ar,iso);
      return J({ok:true});
    }
    if(action==="driver_message"){
      const msg=String(b.message||"").trim().slice(0,1000);if(!msg)return J({ok:false,error:"EMPTY_MESSAGE"},400);await event(p.id,"driver_message",msg,"driver",p.driver_name||"Vozač");return J({ok:true});
    }
    return J({ok:false,error:"UNKNOWN_ACTION"},400);
  }catch(e){console.error(e);return J({ok:false,error:String((e as any)?.message||e)},500)}
});