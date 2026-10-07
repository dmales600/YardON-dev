import { createClient } from "jsr:@supabase/supabase-js@2.116.0";
const H={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const J=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...H,"Content-Type":"application/json","Cache-Control":"no-store"}});
const enc=new TextEncoder();
const ws=(v:any)=>Array.isArray(v)?v.map(x=>String(x)).filter(Boolean):[];
const b64=(b:Uint8Array)=>btoa(String.fromCharCode(...b)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
function token(){const b=new Uint8Array(32);crypto.getRandomValues(b);return b64(b)}
async function hash(v:string){const d=await crypto.subtle.digest("SHA-256",enc.encode(v));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function qrMarker(meta:any){return '[[YARDIVO_GATE_QR_V583:'+b64(enc.encode(JSON.stringify(meta)))+']]'}
function cleanQrMarker(v:any){return String(v||'').replace(/\[\[YARDIVO_GATE_QR_V583:[A-Za-z0-9_-]+\]\]/g,'').replace(/\n{3,}/g,'\n\n').trim()}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:H});
  if(req.method!=="POST")return J({ok:false,error:"POST_REQUIRED"},405);
  try{
    const bearer=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
    const url=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:u,error:ue}=await db.auth.getUser(bearer);
    if(ue||!u.user?.id)return J({ok:false,error:"AUTH_REQUIRED"},401);
    const {data:access,error:ae}=await db.from("yardivo_user_access").select("auth_user_id,username,app_role,location,active,warehouses").eq("auth_user_id",u.user.id).maybeSingle();
    if(ae||!access?.active)return J({ok:false,error:"YARDIVO_AUTHORIZATION_DENIED"},403);
    const role=String(access.app_role||"").toLowerCase();
    if(!["admin","manager","inventory","reception","gate"].includes(role))return J({ok:false,error:"FORBIDDEN"},403);

    const {data:ms,error:me}=await db.from("yardivo_app_state").select("value_json").eq("key","yardivo_master_data_registry_v583").eq("deleted",false).maybeSingle();
    if(me)throw me;
    let master:any={locations:[],warehouses:[]};try{master=JSON.parse(String(ms?.value_json||"{}"))}catch{}
    const locMap=new Map((master.locations||[]).map((x:any)=>[String(x.id),x]));
    const whMap=new Map((master.warehouses||[]).filter((x:any)=>x&&x.active!==false).map((x:any)=>[String(x.id),x]));
    const allowed=(w:any)=>role==="admin"||ws(access.warehouses).includes(String(w));
    const locOf=(w:any)=>{const x:any=whMap.get(String(w));return x?String(x.location_id||""):""};
    const nameLoc=(id:any)=>String((locMap.get(String(id)) as any)?.name||"Lokacija");
    const nameWh=(id:any)=>String((whMap.get(String(id)) as any)?.name||"Skladište");
    const supplierMap=new Map((master.suppliers||[]).filter((x:any)=>x&&x.active!==false).map((x:any)=>[String(x.id),x]));
    const body=await req.json().catch(()=>({})),action=String(body.action||"validate").toLowerCase();
const {data:qrs,error:qrse}=await db.from("yardivo_app_state").select("value_json").eq("key","yardivo_qr_scan_cfg_v583").eq("deleted",false).maybeSingle();if(qrse)throw qrse;
let qrCfg:any={enabled:true,byWarehouse:{}};try{const q=JSON.parse(String(qrs?.value_json||"{}"));if(q&&typeof q==="object")qrCfg={enabled:q.enabled!==false,byWarehouse:q.byWarehouse&&typeof q.byWarehouse==="object"?q.byWarehouse:{}}}catch{}
const qrFor=(warehouse:any,target:any)=>{
  const wh=String(warehouse||""),rr=String(target||"").toLowerCase()==="gate"?"gate":"reception";
  const v=qrCfg.byWarehouse?.[wh];
  // Per-warehouse / per-role setting is authoritative.
  if(v&&typeof v==="object"&&typeof v[rr]==="boolean")return !!v[rr];
  if(v&&typeof v==="object"&&v.roles&&typeof v.roles[rr]==="boolean")return !!v.roles[rr];
  // Legacy warehouse-wide values remain fallback only.
  if(typeof v==="boolean")return v;
  if(v&&typeof v==="object"&&typeof v.enabled==="boolean")return !!v.enabled;
  return qrCfg.enabled!==false;
};
const resolveWarehouse=(value:any)=>{
  const raw=String(value||"").trim();
  if(!raw)return "";
  if(whMap.has(raw))return raw;
  for(const [id,w] of whMap.entries())if(String((w as any)?.name||"").trim()===raw)return String(id);
  return "";
};

    async function ann(id:any){
      const wanted=String(id||"");
      let {data,error}=await db.from("yardivo_announcements").select("announcement_id,payload,deleted").eq("announcement_id",wanted).eq("deleted",false).maybeSingle();
      if(error)throw error;
      if(data)return data;
      const deliveryId=wanted.startsWith("SUPDEL-")?wanted.slice(7):wanted;
      if(deliveryId){
        const q=await db.from("yardivo_announcements").select("announcement_id,payload,deleted").contains("payload",{supplierDeliveryId:deliveryId}).eq("deleted",false).limit(1).maybeSingle();
        if(q.error)throw q.error;
        if(q.data)return q.data;
      }
      return null;
    }
    async function save(row:any,p:any){const {error}=await db.from("yardivo_announcements").update({status:p.status||null,appointment_date:p.date||null,appointment_time:p.time||null,supplier:p.supplier||null,warehouse:p.warehouse||null,updated_by:access.username||role,payload:p,updated_at:new Date().toISOString()}).eq("announcement_id",row.announcement_id).eq("deleted",false);if(error)throw error}
    async function loadDelivery(p:any){
      const deliveryId=String(p?.supplierDeliveryId||"").trim();
      if(!deliveryId)return null;
      const {data,error}=await db.from("yardivo_supplier_deliveries").select("id,supplier_username,supplier_name,warehouse,location,delivery_date,requested_time,pallets,sku_count,vehicle_plate,driver_name,driver_contact,trailer_plate,dock,dock_number,order_number,status").eq("id",deliveryId).maybeSingle();
      if(error)throw error;
      return data;
    }
    function masterSupplierName(delivery:any,p:any){
      const direct=String(delivery?.supplier_name||"").trim();
      if(direct){
        const hit=(master.suppliers||[]).find((s:any)=>String(s?.name||"").trim().toLowerCase()===direct.toLowerCase());
        if(hit?.name)return String(hit.name);
      }
      const user=String(delivery?.supplier_username||"").trim().toLowerCase();
      if(user){
        const hit=(master.suppliers||[]).find((s:any)=>{
          const n=String(s?.name||"").trim().toLowerCase();
          return n===user || n.replace(/[^a-z0-9]/g,"")===user.replace(/[^a-z0-9]/g,"");
        });
        if(hit?.name)return String(hit.name);
      }
      return direct||String(p?.supplier||"Dobavljač");
    }
    async function syncDelivery(p:any,status:string,iso:string){
      const deliveryId=String(p?.supplierDeliveryId||"").trim();
      if(!deliveryId)return;
      const map:any={
        "U dvorištu":"arrival",
        "RAMPA":"dock",
        "Zaprimanje":"receiving",
        "ZAPRIMLJEN":"completed",
        "ODBIJEN":"rejected"
      };
      const dbStatus=map[String(status)]||String(status||"").toLowerCase();
      const patch:any={status:dbStatus,updated_at:iso};
      const {error}=await db.from("yardivo_supplier_deliveries").update(patch).eq("id",deliveryId);
      if(error)throw error;
    }
    async function scan(pass:any,a:any,act:string,result:string,details:any={}){const {error}=await db.from("yardivo_gate_pass_scans").insert({gate_pass_id:pass.id,announcement_id:pass.announcement_id,action:act,result,scanned_by:u.user.id,username:access.username,app_role:role,warehouse:a?.payload?.warehouse||null,location:locOf(a?.payload?.warehouse),details});if(error)throw error}
    async function notify(p:any){const key="yardivo_live_notifications_v1";let arr:any[]=[];const {data:s}=await db.from("yardivo_app_state").select("value_json").eq("key",key).eq("deleted",false).maybeSingle();try{const z=JSON.parse(String(s?.value_json||"[]"));if(Array.isArray(z))arr=z}catch{}arr.push(p);if(arr.length>500)arr=arr.slice(-500);const {error}=await db.rpc("yardivo_edge_put_state",{p_auth_user_id:u.user.id,p_key:key,p_value:JSON.stringify(arr),p_client_id:"yardivo-gate-pass"});if(error)throw error}

    async function validateIssueAnnouncement(id:string){
      if(!["admin","manager","inventory"].includes(role))return {error:J({ok:false,error:"FORBIDDEN"},403)};
      if(!id)return {error:J({ok:false,error:"ANNOUNCEMENT_REQUIRED"},400)};
      const a=await ann(id);if(!a)return {error:J({ok:false,error:"ANNOUNCEMENT_NOT_FOUND"},404)};
      const w=String(a.payload?.warehouse||"");if(!whMap.has(w))return {error:J({ok:false,error:"WAREHOUSE_NOT_ACTIVE_IN_MASTER"},409)};if(!allowed(w))return {error:J({ok:false,error:"WAREHOUSE_SCOPE_DENIED"},403)};
      return {a,w};
    }
    async function uniquePreparedToken(){
      for(let i=0;i<12;i++){
        const c=token(),ch=await hash(c),{data,error}=await db.from("yardivo_gate_passes").select("id").or(`gate_token_hash.eq.${ch},dock_token_hash.eq.${ch}`).limit(1);
        if(error)throw error;if(!data?.length)return {token:c,hash:ch};
      }
      throw new Error("UNIQUE_QR_TOKEN_GENERATION_FAILED");
    }

    if(action==="mobile_bootstrap"){
      if(!["admin","reception","gate"].includes(role))return J({ok:false,error:"FORBIDDEN"},403);
      const target=String(body.type||"").toLowerCase()==="gate"?"gate":"dock";
      if(target==="gate"&&!["gate","admin"].includes(role))return J({ok:false,error:"GATE_ROLE_REQUIRED"},403);
      if(target==="dock"&&!["reception","admin"].includes(role))return J({ok:false,error:"RECEPTION_ROLE_REQUIRED"},403);
      let w=resolveWarehouse(body.warehouse);
      const scoped=(master.warehouses||[]).filter((x:any)=>x&&x.active!==false&&allowed(x.id)).map((x:any)=>({id:String(x.id),name:String(x.name||x.id),location:String(x.location_id||"")}));
      if(!w&&scoped.length)w=String(scoped[0].id);
      if(!w||!whMap.has(w))return J({ok:false,error:"WAREHOUSE_REQUIRED"},400);
      if(!allowed(w))return J({ok:false,error:"WAREHOUSE_SCOPE_DENIED"},403);
      const date=String(body.date||"").trim();
      let rows:any[]=[];
      if(date&&["reception","admin"].includes(role)){
        const q=await db.from("yardivo_announcements")
          .select("announcement_id,payload,status,appointment_time,supplier,warehouse,appointment_date")
          .eq("warehouse",w).eq("appointment_date",date).eq("deleted",false).order("appointment_time",{ascending:true});
        if(q.error)throw q.error;
        rows=(q.data||[]).map((r:any)=>{
          const p=r.payload||{};
          return {
            id:String(r.announcement_id||""),
            supplier:String(p.supplier||r.supplier||"Dobavljač"),
            time:String(p.time||r.appointment_time||"").slice(0,5),
            dock:(p.dock?("R"+String(p.dock).replace(/^R/i,"")):"—"),
            pallets:Number(p.pallets||0),
            sku:Number(p.sku??p.skuCount??0),
            status:String(p.status||r.status||"U dolasku"),
            plate:String(p.arrivalPlate||p.plannedPlate||p.plate||""),
            driver:String(p.arrivalDriver||p.plannedDriver||p.driverName||p.driver||"")
          };
        });
      }
      return J({ok:true,warehouse:w,warehouseName:nameWh(w),location:locOf(w),locationName:nameLoc(locOf(w)),qrEnabled:qrFor(w,target),target,warehouses:scoped,rows});
    }

    if(action==="prepare"){
      const id=String(body.announcementId||"").trim(),v=await validateIssueAnnouncement(id);if(v.error)return v.error;
      const prepared=await uniquePreparedToken(),qrUrl=`https://yardivo.app/q/pass/${encodeURIComponent(prepared.token)}`;
      return J({ok:true,prepared:true,kind:"dock",announcementId:id,token:prepared.token,qrToken:prepared.token,qrUrl,oneQr:false,gateToken:null,dockToken:prepared.token,gateUrl:null,dockUrl:qrUrl});
    }

    if(action==="issue"){
      const id=String(body.announcementId||"").trim(),v=await validateIssueAnnouncement(id);if(v.error)return v.error;
      let t=String(body.token||"").trim(),h="";
      if(t){h=await hash(t);const {data:used,error:ue}=await db.from("yardivo_gate_passes").select("id,announcement_id").or(`gate_token_hash.eq.${h},dock_token_hash.eq.${h}`).limit(1);if(ue)throw ue;if((used||[]).some((x:any)=>String(x.announcement_id)!==id))return J({ok:false,error:"QR_TOKEN_ALREADY_USED"},409)}
      else{const prepared=await uniquePreparedToken();t=prepared.token;h=prepared.hash}
      let hiddenGate=await uniquePreparedToken();for(let i=0;i<8&&hiddenGate.hash===h;i++)hiddenGate=await uniquePreparedToken();
      const now=new Date().toISOString(),{data,error}=await db.from("yardivo_gate_passes").upsert({announcement_id:id,gate_token_hash:hiddenGate.hash,dock_token_hash:h,status:"ACTIVE",valid_from:body.validFrom||null,valid_until:body.validUntil||null,issued_at:now,gate_used_at:null,dock_used_at:null,revoked_at:null,created_by:u.user.id,updated_at:now},{onConflict:"announcement_id"}).select("id").single();if(error)throw error;
      const qrUrl=`https://yardivo.app/q/pass/${encodeURIComponent(t)}`;
      const deliveryId=String((v as any)?.a?.payload?.supplierDeliveryId||"").trim();
      if(deliveryId){
        const meta={kind:"dock",token:t,qrUrl,issuedAt:now,announcementId:id,supplierDeliveryId:deliveryId};
        const {data:sd,error:sde}=await db.from("yardivo_supplier_deliveries").select("review_note").eq("id",deliveryId).maybeSingle();
        if(sde)throw sde;
        if(sd){
          const human=cleanQrMarker(sd.review_note);
          const {error:ue}=await db.from("yardivo_supplier_deliveries").update({review_note:(human?human+"\n":"")+qrMarker(meta),updated_at:now}).eq("id",deliveryId);
          if(ue)throw ue;
        }
      }
      return J({ok:true,id:data.id,kind:"dock",announcementId:id,token:t,qrToken:t,qrUrl,oneQr:false,gateToken:null,dockToken:t,gateUrl:null,dockUrl:qrUrl});
    }

    const raw=String(body.token||"").trim();if(!raw)return J({ok:false,valid:false,error:"TOKEN_REQUIRED"},400);
    const hh=await hash(raw),{data:pass,error:pe}=await db.from("yardivo_gate_passes").select("*").or(`gate_token_hash.eq.${hh},dock_token_hash.eq.${hh}`).maybeSingle();if(pe||!pass)return J({ok:false,valid:false,error:"QR_NOT_FOUND"},404);
    if(pass.status!=="ACTIVE")return J({ok:false,valid:false,error:`PASS_${pass.status}`},409);
    const now=new Date();if(pass.valid_from&&now<new Date(pass.valid_from))return J({ok:false,valid:false,error:"PASS_NOT_YET_VALID"},409);if(pass.valid_until&&now>new Date(pass.valid_until))return J({ok:false,valid:false,error:"PASS_EXPIRED"},409);
    const arow=await ann(String(pass.announcement_id));if(!arow)return J({ok:false,valid:false,error:"ANNOUNCEMENT_NOT_FOUND"},404);
    const a=arow.payload||{};
    const delivery=await loadDelivery(a);
    const warehouse=String(delivery?.warehouse||a.warehouse||"");
    if(!whMap.has(warehouse))return J({ok:false,valid:false,error:"WAREHOUSE_NOT_ACTIVE_IN_MASTER"},409);
    if(!allowed(warehouse))return J({ok:false,valid:false,error:"WAREHOUSE_SCOPE_DENIED"},403);
    const supplierName=masterSupplierName(delivery,a);
    const displayLocation=nameLoc(locOf(warehouse));
    const displayWarehouse=nameWh(warehouse);
    const one=pass.gate_token_hash===hh&&pass.dock_token_hash===hh,reqType=String(body.type||"").toLowerCase();
    let type=one?(reqType==="gate"||reqType==="dock"?reqType:(role==="gate"?"gate":role==="reception"?"dock":pass.gate_used_at?"dock":"gate")):(pass.gate_token_hash===hh?"gate":"dock");
    if(["validate","arrival","dock","complete"].includes(action)&&!qrFor(warehouse,type))return J({ok:false,valid:false,error:"QR_SCAN_DISABLED",warehouse,warehouseName:displayWarehouse,type},409);

    if(action==="validate"){
      if(type==="gate"&&!['gate','admin'].includes(role))return J({ok:false,valid:false,error:"GATE_ROLE_REQUIRED"},403);
      if(type==="dock"&&!['reception','admin'].includes(role))return J({ok:false,valid:false,error:"RECEPTION_ROLE_REQUIRED"},403);
      await scan(pass,arow,type==="gate"?"VALIDATE_GATE":"VALIDATE_DOCK","OK");
      return J({
        ok:true,valid:true,type,oneQr:one,
        nextAction:type==="gate"?"arrival":(pass.dock_used_at?"complete":"dock"),
        announcementId:arow.announcement_id,
        supplierDeliveryId:a.supplierDeliveryId||"",
        supplier:supplierName,
        plate:delivery?.vehicle_plate||a.plannedPlate||a.arrivalPlate||a.plate||"",
        trailerPlate:delivery?.trailer_plate||a.trailerPlate||"",
        driver:delivery?.driver_name||a.plannedDriver||a.driverName||a.driver||"",
        driverContact:delivery?.driver_contact||a.driverContact||"",
        orderNumber:delivery?.order_number||a.orderNumber||a.reference||"",
        date:delivery?.delivery_date||a.date||"",
        time:String(delivery?.requested_time||a.time||"").slice(0,5),
        pallets:Number(delivery?.pallets??a.pallets??0),
        sku:Number(delivery?.sku_count??a.sku??a.skuCount??0),
        location:locOf(warehouse),
        locationName:displayLocation,
        warehouse,
        warehouseName:displayWarehouse,
        dock:(delivery?.dock||a.dock)?`R${String(delivery?.dock||a.dock).replace(/^R/i,"")}`:"—",
        status:a.status||"",
        gateUsedAt:pass.gate_used_at||null,
        dockUsedAt:pass.dock_used_at||null,
        dockArrivalAt:a.dockArrivalAt||null,
        completedAt:a.receivingCompletedAt||null,
        completionResult:a.receivingResult||null
      });
    }
    if(action==="arrival"){
      if(type!=="gate"||!['gate','admin'].includes(role))return J({ok:false,error:"GATE_ROLE_REQUIRED"},403);
      if(pass.gate_used_at)return J({ok:true,already:true,status:"U dvorištu",at:pass.gate_used_at});
      const t=new Date(),iso=t.toISOString();a.status="U dvorištu";a.actualDate=a.actualDate||iso.slice(0,10);a.actualTime=a.actualTime||iso.slice(11,16);a.firstArrivalAt=a.firstArrivalAt||iso;a.yardArrivalAt=a.yardArrivalAt||iso;a.gateCheckedAt=iso;a.gateCheckedBy=access.username||role;a.gatePassId=pass.id;a.updatedAt=iso;a.updatedBy=access.username||role;
      await save(arow,a);await syncDelivery(a,"U dvorištu",iso);await db.from("yardivo_gate_passes").update({gate_used_at:iso,updated_at:iso}).eq("id",pass.id);await scan(pass,arow,"GATE_IN","OK");await notify({id:"GATE-"+crypto.randomUUID(),event:"TRUCK_ARRIVED",title:"KAMION U DVORIŠTU",body:`${supplierName||"Dobavljač"} · ${a.plannedPlate||a.arrivalPlate||a.plate||"bez registracije"} · ${warehouse}`,at:iso,createdAt:iso,roles:["admin","manager","inventory","reception","gate"],readBy:{},supplier:supplierName||"",announcementId:a.id??arow.announcement_id,warehouse,location:locOf(warehouse),source:"gate_scanner"});return J({ok:true,status:"U dvorištu",announcementId:arow.announcement_id,at:iso});
    }
    if(action==="dock"){
      if(type!=="dock"||!['reception','admin'].includes(role))return J({ok:false,error:"RECEPTION_ROLE_REQUIRED"},403);
      const yardStatus=String(a.status||"").trim().toUpperCase(),deliveryStatus=String(delivery?.status||"").trim().toLowerCase();
      const gateOk=!!pass.gate_used_at||["U DVORIŠTU","NA RAMPI","RAMPA","ZAPRIMANJE","ZAPRIMLJEN","ZAPRIMLJENO"].includes(yardStatus)||["arrival","dock","receiving","completed"].includes(deliveryStatus);
      if(!gateOk)return J({ok:false,error:"TRUCK_NOT_CHECKED_IN_AT_GATE",message:"Vozač prvo mora završiti Gate Check-In na ulazu."},409);
      if(pass.dock_used_at)return J({ok:true,already:true,status:"RAMPA",at:pass.dock_used_at,nextAction:"complete"});
      const iso=new Date().toISOString();a.status="Zaprimanje";a.dockArrivalAt=a.dockArrivalAt||iso;a.receivingStartedAt=a.receivingStartedAt||iso;a.dockCheckedAt=iso;a.dockCheckedBy=access.username||role;a.gatePassId=pass.id;a.updatedAt=iso;a.updatedBy=access.username||role;
      await save(arow,a);await syncDelivery(a,"Zaprimanje",iso);await db.from("yardivo_gate_passes").update({dock_used_at:iso,updated_at:iso}).eq("id",pass.id);
      const dockNow=String(delivery?.dock||a.dock||"").trim();const dpMsg=`Kamion je skeniran na ${dockNow?("R"+dockNow.replace(/^R/i,"")):"rampi"}. Zaprimanje je započelo.`;
      await db.from("yardivo_delivery_passes").update({state:"RECEIVING",dock:dockNow?("R"+dockNow.replace(/^R/i,"")):null,parking_slot:null,last_instruction:dpMsg,updated_at:iso}).eq("announcement_id",arow.announcement_id);
      await scan(pass,arow,"DOCK_IN","OK",{dock:a.dock||null,dockArrivalAt:iso,receivingStartedAt:iso});await notify({id:"DOCK-"+crypto.randomUUID(),event:"TRUCK_ON_DOCK",title:"KAMION NA RAMPI · ZAPRIMANJE",body:`${supplierName||"Dobavljač"} · ${displayWarehouse}${a.dock?" · R"+String(a.dock).replace(/^R/i,""):""}`,at:iso,createdAt:iso,roles:["reception","admin"],readBy:{},supplier:supplierName||"",announcementId:a.id??arow.announcement_id,warehouse,location:locOf(warehouse),source:"dock_scanner"});return J({ok:true,status:"Zaprimanje",announcementId:arow.announcement_id,at:iso,nextAction:"complete"});
    }
    if(action==="complete"){
      if(type!=="dock"||!['reception','admin'].includes(role))return J({ok:false,error:"RECEPTION_ROLE_REQUIRED"},403);
      const outcome=String(body.outcome||"").toLowerCase();
      if(!["received","rejected"].includes(outcome))return J({ok:false,error:"OUTCOME_REQUIRED"},400);
      const iso=new Date().toISOString(),status=outcome==="received"?"ZAPRIMLJEN":"ODBIJEN";
      a.status=status;a.receivingResult=status;a.receivingCompletedAt=iso;a.receivingCompletedBy=access.username||role;a.updatedAt=iso;a.updatedBy=access.username||role;
      await save(arow,a);await syncDelivery(a,status,iso);
      const {error:ge}=await db.from("yardivo_gate_passes").update({status:"COMPLETED",updated_at:iso}).eq("id",pass.id);if(ge)throw ge;
      const terminalState=outcome==="received"?"COMPLETED":"REJECTED";
      const terminalReason=outcome==="received"?"DELIVERY_COMPLETED":"DELIVERY_REJECTED";
      const dpPatch:any={state:terminalState,terminal_reason:terminalReason,updated_at:iso};
      if(outcome==="received")dpPatch.completed_at=iso;else dpPatch.revoked_at=iso;
      const {error:dpe}=await db.from("yardivo_delivery_passes").update(dpPatch).eq("announcement_id",arow.announcement_id);
      if(dpe)console.error("delivery pass terminal sync",dpe);
      await scan(pass,arow,outcome==="received"?"RECEIVED":"REJECTED","OK",{completedAt:iso,status});
      await notify({id:"RCV-"+crypto.randomUUID(),event:outcome==="received"?"DELIVERY_RECEIVED":"DELIVERY_REJECTED",title:status,body:`${supplierName||"Dobavljač"} · ${displayWarehouse}${a.dock?" · R"+String(a.dock).replace(/^R/i,""):""}`,at:iso,createdAt:iso,roles:["admin","manager","inventory","reception"],readBy:{},supplier:supplierName||"",announcementId:a.id??arow.announcement_id,warehouse,location:locOf(warehouse),source:"reception_scanner"});
      return J({ok:true,status,announcementId:arow.announcement_id,at:iso});
    }
    if(action==="revoke"){
      if(!['admin','manager','inventory'].includes(role))return J({ok:false,error:"FORBIDDEN"},403);
      const iso=new Date().toISOString(),{error}=await db.from("yardivo_gate_passes").update({status:"REVOKED",revoked_at:iso,updated_at:iso}).eq("id",pass.id);if(error)throw error;return J({ok:true,status:"REVOKED"});
    }
    return J({ok:false,error:"UNKNOWN_ACTION"},400);
  }catch(e){console.error(e);return J({ok:false,error:String((e as any)?.message||e)},500)}
});