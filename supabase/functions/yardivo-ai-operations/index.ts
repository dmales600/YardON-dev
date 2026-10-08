import { createClient } from "jsr:@supabase/supabase-js@2.116.0";

const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const J=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...CORS,"Content-Type":"application/json","Cache-Control":"no-store"}});
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


const role=(v:any)=>{let r=String(v??"").trim().toLowerCase();if(r==="voditelj"||r==="management")r="manager";if(r==="zalihe"||r.includes("zalih"))r="inventory";if(r==="prijam")r="reception";return r};
const uniq=(a:any[])=>[...new Set((Array.isArray(a)?a:[]).map(String).filter(Boolean))];
const mins=(v:any)=>{const m=String(v??"").match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):NaN};
const hh=(m:number)=>`${String(Math.floor(m/60)).padStart(2,"0")}:${String(Math.max(0,m%60)).padStart(2,"0")}`;
const round15=(m:number)=>Math.max(15,Math.ceil(m/15)*15);
const dockNum=(v:any)=>{const n=Number(String(v??"").replace(/\D/g,""));return Number.isFinite(n)&&n>0?n:null};
const parseJson=(v:any,f:any)=>{try{const x=typeof v==="string"?JSON.parse(v):v;return x??f}catch{return f}};
const safeDate=(v:any)=>{const x=String(v??"").slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(x))throw new Error("Neispravan datum.");return x};
const isoSlot=(d:string,t:string)=>new Date(`${d}T${t}:00.000Z`).toISOString();

async function profile(req:Request){
 const h=req.headers.get("Authorization")??"";if(!h.startsWith("Bearer "))throw new Error("Nedostaje prijava.");
 const {data:u,error:ue}=await db.auth.getUser(h.slice(7));if(ue||!u.user?.id)throw new Error("Neispravna prijava.");
 const {data:p,error:pe}=await db.from("yardivo_user_access").select("auth_user_id,username,app_role,active,location,locations,warehouses,all_locations,all_warehouses").eq("auth_user_id",u.user.id).maybeSingle();
 if(pe)throw pe;if(!p?.active)throw new Error("Account nije aktivan.");
 const r=role(p.app_role);if(!["admin","manager","inventory","reception"].includes(r))throw new Error("Nema ovlasti za AI Operations.");
 return {...p,role:r};
}
async function master(){const {data,error}=await db.from("yardivo_app_state").select("value_json").eq("key","yardivo_master_data_registry_v583").eq("deleted",false).maybeSingle();if(error)throw error;return parseJson(data?.value_json,{locations:[],warehouses:[]})}
function allowedWarehouses(p:any,m:any){const all=(m.warehouses||[]).filter((w:any)=>w&&w.active!==false);if(p.role==="admin")return all;const assigned=new Set(uniq(p.warehouses));if(p.all_warehouses){const locs=new Set(uniq(p.locations));if(String(p.location||"")&&String(p.location)!=="ALL")locs.add(String(p.location));if(!locs.size)return all;return all.filter((w:any)=>locs.has(String(w.location_id||"")))}return all.filter((w:any)=>assigned.has(String(w.id)))}
function rampList(w:any){const settings=(Array.isArray(w?.ramp_settings)?w.ramp_settings:[]).filter((r:any)=>r&&r.active!==false&&Number(r.number)>0).map((r:any)=>({number:Number(r.number),name:String(r.name||("Rampa "+r.number)),from:String(r.from||w.reception_from||"06:00").slice(0,5),to:String(r.to||w.reception_to||"18:00").slice(0,5),pallets_per_hour:Math.max(1,Number(r.pallets_per_hour||33))}));if(settings.length)return settings.sort((a:any,b:any)=>a.number-b.number);const count=Math.max(0,Number(w?.ramps||0)),out=[];for(let i=1;i<=count;i++)out.push({number:i,name:"Rampa "+i,from:String(w.reception_from||"06:00").slice(0,5),to:String(w.reception_to||"18:00").slice(0,5),pallets_per_hour:33});return out}
function supplierDirectory(m:any){
 const alias=new Map<string,string>();
 for(const s of (Array.isArray(m?.suppliers)?m.suppliers:[]).filter((x:any)=>x&&x.active!==false)){
  const name=String(s?.name||"").trim();if(!name)continue;
  for(const v of [s.name,s.username,s.id,s.code,s.supplier_code]){
   const k=String(v||"").trim().toLocaleLowerCase("hr-HR");if(k)alias.set(k,name);
  }
 }
 return alias;
}
function canonicalSupplier(raw:any,dir:Map<string,string>){
 const v=String(raw??"").trim();if(!v)return "";
 return dir.get(v.toLocaleLowerCase("hr-HR"))||"";
}
function durationFor(a:any,ramps:any[]){const p=a?.payload||{},explicit=Number(p.duration||p.duration_minutes||0);if(Number.isFinite(explicit)&&explicit>0)return round15(explicit);const pallets=Math.max(1,Number(p.pallets||a?.pallets||1)),avg=ramps.length?ramps.reduce((s:number,r:any)=>s+Number(r.pallets_per_hour||33),0)/ramps.length:33;return round15((pallets/Math.max(1,avg))*60)}
function normalizeAnnouncement(a:any,dir:Map<string,string>){const p=a?.payload&&typeof a.payload==="object"?a.payload:{},supplier=canonicalSupplier(a.supplier||p.supplier||p.supplier_name||p.supplier_username,dir);return {id:String(a.announcement_id||p.id||""),supplier_delivery_id:String(p.supplierDeliveryId||""),supplier,warehouse:String(a.warehouse||p.warehouse||""),date:String(a.appointment_date||p.date||"").slice(0,10),time:String(a.appointment_time||p.time||"").slice(0,5),pallets:Number(p.pallets||0),sku:Number(p.sku||p.sku_count||0),current_dock:dockNum(p.dock),status:String(a.status||p.status||"Najavljen"),plate:String(p.plannedPlate||p.vehicle_plate||p.plate||""),driver:String(p.plannedDriver||p.driver_name||p.driver||""),payload:p,updated_at:String(a.updated_at||"")}}
async function geminiPlanOrder(rows:any[],w:any){
 const input=rows.map((x:any)=>({id:String(x.id),supplier:String(x.supplier||""),time:String(x.time||""),pallets:Number(x.pallets||0),sku:Number(x.sku||0),status:String(x.status||"")}));
 const out=await geminiJson("Ti si YardOn AI Operations planer. Vrati isključivo JSON {ordered_ids:[...]}. Ne izmišljaj ID-eve. Poredaj sve dostave za sigurno operativno planiranje: poštuj termine, smanji čekanje i rizik kašnjenja. Ne dodjeljuj rampu; YardOn deterministički provjerava kapacitet i rampu.",{warehouse:{id:String(w?.id||""),name:String(w?.name||""),reception_from:String(w?.reception_from||""),reception_to:String(w?.reception_to||"")},deliveries:input});
 const ids=Array.isArray(out?.ordered_ids)?out.ordered_ids.map(String):[];const valid=new Set(input.map((x:any)=>x.id));
 if(ids.length!==input.length||new Set(ids).size!==ids.length||ids.some((id:string)=>!valid.has(id)))throw new Error("GEMINI_INVALID_PLAN_ORDER");
 return ids;
}

function fallbackPlanOrder(rows:any[]){
 return rows.slice().sort((a:any,b:any)=>String(a.time||"").localeCompare(String(b.time||""))||String(a.id||"").localeCompare(String(b.id||""))).map((x:any)=>String(x.id));
}
function dedupeNormalized(rows:any[]){
 const out=new Map<string,any>();
 const score=(x:any)=>{
  const st=String(x?.status||"").toLowerCase();
  const rank=["receiving","dock","arrival","confirmed","pending"].includes(st)?5:["stigao","na rampi","zaprimanje"].some(k=>st.includes(k))?4:1;
  return rank*1e15+(Date.parse(String(x?.updated_at||""))||0);
 };
 for(const x of rows){
  const key=String(x?.supplier_delivery_id||x?.id||"");
  if(!key)continue;
  const prev=out.get(key);
  if(!prev||score(x)>=score(prev))out.set(key,x);
 }
 return [...out.values()];
}
function planWarehouse(rows:any[],w:any,aiOrderIds:string[]=[]){
 const ramps=rampList(w),tracks=new Map<number,{r:any,next:number,jobs:number}>();for(const r of ramps)tracks.set(r.number,{r,next:mins(r.from),jobs:0});const planned:any[]=[];
 const rank=new Map(aiOrderIds.map((id:string,i:number)=>[String(id),i]));for(const a of rows.slice().sort((x,y)=>(rank.get(String(x.id))??999999)-(rank.get(String(y.id))??999999)||String(x.time).localeCompare(String(y.time))||String(x.id).localeCompare(String(y.id)))){
  const req=mins(a.time),duration=durationFor(a,ramps);if(!Number.isFinite(req)||!ramps.length){planned.push({...a,duration_minutes:duration,planned_dock:null,planned_start:a.time||"",planned_end:"",shift_minutes:0,parking_risk:false,predicted_parking:null,plan_issue:ramps.length?"INVALID_TIME":"NO_ACTIVE_RAMPS"});continue}
  const candidates:any[]=[];for(const t of tracks.values()){const rf=mins(t.r.from),rt=mins(t.r.to);if(!Number.isFinite(rf)||!Number.isFinite(rt)||rt<=rf)continue;const start=Math.max(req,rf,t.next),end=start+duration;if(end>rt)continue;candidates.push({t,start,end,shift:Math.max(0,start-req),keep:a.current_dock===t.r.number?0:1})}
  candidates.sort((x,y)=>x.start-y.start||x.keep-y.keep||x.t.jobs-y.t.jobs||x.t.r.number-y.t.r.number);const best=candidates[0];if(!best){planned.push({...a,duration_minutes:duration,planned_dock:null,planned_start:a.time,planned_end:"",shift_minutes:0,parking_risk:true,predicted_parking:null,plan_issue:"NO_CAPACITY"});continue}
  best.t.next=best.end;best.t.jobs++;planned.push({...a,duration_minutes:duration,planned_dock:best.t.r.number,planned_start:hh(best.start),planned_end:hh(best.end),shift_minutes:best.shift,parking_risk:best.shift>0,predicted_parking:null,plan_issue:best.shift>0?"WAIT_EXPECTED":null});
 }
 const bays=Array.from({length:42},(_,i)=>({slot:"P"+(i+1),freeAt:-1}));const waiters=planned.filter(x=>x.parking_risk&&x.plan_issue==="WAIT_EXPECTED").sort((a,b)=>String(a.time).localeCompare(String(b.time)));for(const x of waiters){const start=mins(x.time),end=mins(x.planned_start),bay=bays.find(b=>b.freeAt<=start);if(bay){x.predicted_parking=bay.slot;bay.freeAt=end}}
 return {ramps,planned};
}
function planSummary(plan:any[],warehouses:any[]){const total=plan.length,assigned=plan.filter(x=>x.planned_dock).length,waiting=plan.filter(x=>x.parking_risk&&x.plan_issue==="WAIT_EXPECTED").length,noCapacity=plan.filter(x=>x.plan_issue==="NO_CAPACITY"||x.plan_issue==="NO_ACTIVE_RAMPS").length;let used=0,open=0;for(const w of warehouses){for(const r of rampList(w)){const a=mins(r.from),b=mins(r.to);if(Number.isFinite(a)&&Number.isFinite(b)&&b>a)open+=b-a}}for(const x of plan)if(x.planned_dock)used+=Number(x.duration_minutes||0);return {total,assigned,waiting,no_capacity:noCapacity,utilization_pct:open?Math.min(100,Math.round(used/open*100)):0}}
async function readState(key:string,fallback:any){const {data,error}=await db.from("yardivo_app_state").select("value_json").eq("key",key).eq("deleted",false).maybeSingle();if(error)throw error;return parseJson(data?.value_json,fallback)}
async function writeState(key:string,value:any,actor:string){const {data,error}=await db.from("yardivo_app_state").select("key").eq("key",key).eq("deleted",false).maybeSingle();if(error)throw error;const patch={value_json:JSON.stringify(value),updated_at:new Date().toISOString(),updated_by:actor,client_id:"yardivo-ai-operations",deleted:false};const q=data?.key?await db.from("yardivo_app_state").update(patch).eq("key",key):await db.from("yardivo_app_state").insert({key,...patch});if(q.error)throw q.error}
async function updatePersistedPlan(id:string,x:any,p:any,source:string){
 const nextDock=x.planned_dock?`R${x.planned_dock}`:null;
 const nextStart=x.planned_dock&&x.planned_start?isoSlot(x.date,x.planned_start):null;
 const nextEnd=x.planned_dock&&x.planned_end?isoSlot(x.date,x.planned_end):null;
 const now=new Date().toISOString();
 const {error:ue}=await db.from("yardivo_supplier_deliveries").update({planned_dock:nextDock,planned_start:nextStart,planned_end:nextEnd,planning_source:source,planned_at:now}).eq("id",id);if(ue)throw ue;
 const {data:annRows,error:ar}=await db.from("yardivo_announcements").select("announcement_id,payload").eq("deleted",false).contains("payload",{supplierDeliveryId:id});if(ar)throw ar;
 for(const a of annRows||[]){
  const pay={...(a?.payload&&typeof a.payload==="object"?a.payload:{}),plannedDock:x.planned_dock||null,aiPlannedDock:nextDock,aiPlannedStart:x.planned_start||null,aiPlannedEnd:x.planned_end||null,aiPlanUpdatedAt:now,aiPlanSource:source};
  const {error:ae}=await db.from("yardivo_announcements").update({payload:pay,updated_by:"ai-operations:"+String(p.username||p.role||"system"),updated_at:now}).eq("announcement_id",a.announcement_id).eq("deleted",false);if(ae)throw ae;
 }
 return {nextDock,nextStart,nextEnd,now};
}
function sameDecision(a:any,b:any){
 return String(a?.supplierDeliveryId||"")===String(b?.supplierDeliveryId||"")
  &&String(a?.status||"")==="PENDING_INVENTORY"
  &&String(a?.old?.dock||"")===String(b?.old?.dock||"")
  &&String(a?.old?.time||"")===String(b?.old?.time||"")
  &&String(a?.newSlot?.dock||"")===String(b?.newSlot?.dock||"")
  &&String(a?.newSlot?.time||"")===String(b?.newSlot?.time||"");
}
function changeReason(x:any,oldDock:any,oldStart:any,nextDock:any,nextStart:any){
 const parts=[];
 if(String(oldDock||"")!==String(nextDock||""))parts.push(`AI predlaže promjenu rampe ${oldDock||"R-"} → ${nextDock||"R-"} zbog novog rasporeda kapaciteta i konflikata oko termina.`);
 if(String(oldStart||"")!==String(nextStart||""))parts.push(`Planirani početak bi se pomaknuo s ${oldStart?new Date(oldStart).toISOString().slice(11,16):x.time} na ${x.planned_start||x.time}.`);
 if(Number(x.shift_minutes||0)>0)parts.push(`Očekivano čekanje prema novom planu je oko ${Number(x.shift_minutes)} min.`);
 if(!parts.length)parts.push("AI je pronašao sigurniji operativni raspored.");
 parts.push("Promjena se NE primjenjuje automatski; čeka potvrdu Zaliha/Admina.");
 return parts.join(" ");
}
async function persistPlan(plan:any[],p:any){
 const ids=uniq(plan.map(x=>x.supplier_delivery_id).filter(Boolean));if(!ids.length)return [];
 const {data:rows,error}=await db.from("yardivo_supplier_deliveries").select("id,status,planned_dock,planned_start,planned_end").in("id",ids);if(error)throw error;
 const map=new Map((rows||[]).map((x:any)=>[String(x.id),x])),now=new Date().toISOString(),changes:any[]=[];
 let log=await readState("yardivo_ai_operations_plan_log_v1",[]);if(!Array.isArray(log))log=[];
 for(const x of plan){
  const id=String(x.supplier_delivery_id||"");if(!id)continue;
  const old:any=map.get(id);if(!old||["rejected","completed","cancelled","canceled"].includes(String(old.status||"").toLowerCase()))continue;
  const nextDock=x.planned_dock?`R${x.planned_dock}`:null,nextStart=x.planned_dock&&x.planned_start?isoSlot(x.date,x.planned_start):null;
  const oldDock=String(old.planned_dock||"")||null,oldStart=old.planned_start?new Date(old.planned_start).toISOString():null;
  if(oldDock===nextDock&&oldStart===nextStart)continue;

  const alreadyPlanned=!!(oldDock||oldStart);
  if(alreadyPlanned){
   const req={
    id:`AI-CHANGE-${x.id}-${Date.now()}-${changes.length}`,at:now,supplier:x.supplier,announcementId:x.id,supplierDeliveryId:id,warehouse:x.warehouse,
    problemType:String(oldDock||"")!==String(nextDock||"")?"AI_RAMP_CHANGE_REQUEST":"AI_TIME_CHANGE_REQUEST",
    old:{date:x.date,time:oldStart?oldStart.slice(11,16):x.time,dock:dockNum(oldDock)},
    newSlot:{date:x.date,time:x.planned_start||x.time,end:x.planned_end||"",dock:x.planned_dock||null},
    reason:changeReason(x,oldDock,oldStart,nextDock,nextStart),status:"PENDING_INVENTORY",actor:"YARD ON SMART"
   };
   if(!log.some((z:any)=>sameDecision(z,req))){log.push(req);changes.push(req)}
   continue;
  }

  if(!x.planned_dock){
   const noSlot={id:`AI-PLAN-${x.id}-${Date.now()}-${changes.length}`,at:now,supplier:x.supplier,announcementId:x.id,supplierDeliveryId:id,warehouse:x.warehouse,problemType:"AI_PLAN_NO_CAPACITY",old:{date:x.date,time:x.time,dock:null},newSlot:{date:x.date,time:x.time,dock:null},reason:"AI Operations trenutno nema siguran kapacitet za početnu dodjelu rampe.",status:"NO_SAFE_SLOT",actor:"YardOn AI"};
   const duplicate=log.some((z:any)=>String(z?.supplierDeliveryId||"")===id&&String(z?.status||"")==="NO_SAFE_SLOT"&&String(z?.old?.date||"")===String(x.date));
   if(!duplicate){log.push(noSlot);changes.push(noSlot)}
   continue;
  }

  await updatePersistedPlan(id,x,p,"YARDON_SMART");
  const assigned={id:`AI-PLAN-${x.id}-${Date.now()}-${changes.length}`,at:now,supplier:x.supplier,announcementId:x.id,supplierDeliveryId:id,warehouse:x.warehouse,problemType:"AI_PLAN_ASSIGNMENT",old:{date:x.date,time:x.time,dock:null},newSlot:{date:x.date,time:x.planned_start||x.time,end:x.planned_end||"",dock:x.planned_dock||null},reason:`YardOn AI je početno planirao R${x.planned_dock} za ${x.planned_start} prema terminu, trajanju i raspoloživom kapacitetu rampi.`,status:"AI_PLANNED",actor:"YardOn AI"};
  log.push(assigned);changes.push(assigned);
 }
 if(log.length>500)log=log.slice(-500);
 if(changes.length)await writeState("yardivo_ai_operations_plan_log_v1",log,String(p.username||"yardivo-ai-operations"));
 return changes;
}
async function effectivePlan(plan:any[]){
 const ids=uniq(plan.map((x:any)=>x?.supplier_delivery_id).filter(Boolean));if(!ids.length)return plan;
 const {data,error}=await db.from("yardivo_supplier_deliveries").select("id,planned_dock,planned_start,planned_end,planning_source,planned_at").in("id",ids);if(error)throw error;
 const map=new Map((data||[]).map((x:any)=>[String(x.id),x]));
 return plan.map((x:any)=>{
  const d:any=map.get(String(x?.supplier_delivery_id||""));if(!d?.planned_dock)return x;
  const rn=dockNum(d.planned_dock),start=d.planned_start?new Date(d.planned_start).toISOString().slice(11,16):x.planned_start,end=d.planned_end?new Date(d.planned_end).toISOString().slice(11,16):x.planned_end;
  const requested=mins(x.time),effective=mins(start),shift=Number.isFinite(requested)&&Number.isFinite(effective)?Math.max(0,effective-requested):Number(x.shift_minutes||0);
  return {...x,planned_dock:rn,planned_start:start,planned_end:end,shift_minutes:shift,parking_risk:shift>0,predicted_parking:shift>0?(x.predicted_parking||"QUEUE"):null,effective_plan_source:String(d.planning_source||"AI_OPERATIONS"),effective_plan_at:d.planned_at||null};
 });
}

async function resolveChange(decisionId:string,approve:boolean,p:any){
 if(String(p.role||"")!=="inventory")throw new Error("Samo Zalihe mogu odobriti ili odbiti promjenu koju predlaže YARD ON SMART.");
 let log=await readState("yardivo_ai_operations_plan_log_v1",[]);if(!Array.isArray(log))log=[];
 const i=log.findIndex((x:any)=>String(x?.id||"")===String(decisionId||""));if(i<0)throw new Error("AI zahtjev nije pronađen.");
 const d=log[i];if(String(d?.status||"")!=="PENDING_INVENTORY")throw new Error("SMART zahtjev je već riješen.");
 const wh=String(d?.warehouse||""),accessible=allowedWarehouses(p,await master());
 if(!wh||!accessible.some((w:any)=>String(w.id)===wh))throw new Error("Nema ovlasti za skladište ovog SMART prijedloga.");

 if(approve){
  const id=String(d?.supplierDeliveryId||"");if(!id)throw new Error("Nedostaje delivery ID.");
  const {data:delivery,error}=await db.from("yardivo_supplier_deliveries").select("id,status,warehouse,planned_dock,planned_start,planned_end").eq("id",id).maybeSingle();if(error)throw error;
  if(!delivery||["rejected","completed","cancelled","canceled"].includes(String(delivery.status||"").toLowerCase()))throw new Error("Dostava više nije aktivna.");
  if(String(delivery.warehouse||"")!==wh)throw new Error("Dostava je premještena u drugo skladište.");
  const actualDock=dockNum(delivery.planned_dock),expectedDock=dockNum(d?.old?.dock);
  if(actualDock!==expectedDock)throw new Error("Rampa je promijenjena nakon izrade prijedloga. Zatraži novi SMART plan.");
  if(delivery.planned_start&&d?.old?.time&&new Date(delivery.planned_start).toISOString().slice(11,16)!==String(d.old.time).slice(0,5))
   throw new Error("Termin se promijenio nakon izrade prijedloga. Zatraži novi SMART plan.");
  const targetDock=dockNum(d?.newSlot?.dock);
  if(!targetDock||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(d?.newSlot?.date||""))||!/^[0-2][0-9]:[0-5][0-9]$/.test(String(d?.newSlot?.time||"")))
   throw new Error("Neispravan novi SMART termin.");
  const whConfig=accessible.find((w:any)=>String(w.id)===wh);
  if(!rampList(whConfig).some((r:any)=>Number(r.number)===targetDock))throw new Error("Predložena rampa više nije aktivna.");
  if(log.some((z:any)=>z!==d&&String(z?.supplierDeliveryId)===id&&String(z?.status)==="APPROVED"&&String(z?.resolvedAt||"")>String(d?.at||"")))
   throw new Error("Za ovu dostavu već postoji novija odobrena promjena.");

  const x={date:String(d?.newSlot?.date||""),planned_dock:d?.newSlot?.dock||null,planned_start:String(d?.newSlot?.time||""),planned_end:String(d?.newSlot?.end||"")};
  await updatePersistedPlan(id,x,p,"YARDON_SMART_APPROVED");
  d.status="APPROVED";d.resolvedAt=new Date().toISOString();d.resolvedBy=String(p.username||p.role||"");d.resolvedRole="inventory";d.actor="YARD ON SMART";
 }else{
  d.status="REJECTED";d.resolvedAt=new Date().toISOString();d.resolvedBy=String(p.username||p.role||"");d.resolvedRole="inventory";d.actor="YARD ON SMART";
 }
 log[i]=d;await writeState("yardivo_ai_operations_plan_log_v1",log,String(p.username||"yardivo-ai-operations"));
 return d;
}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});if(req.method!=="POST")return J({ok:false,error:"Method not allowed"},405);
 try{const p=await profile(req),b=await req.json().catch(()=>({})),action=String(b.action||"snapshot").toLowerCase();if(action==="health")return J({ok:true,provider:"gemini",geminiKeyPresent:Boolean(geminiKey()),model:geminiModel()});
  if(action==="smart_activity"){
    const m=await master(),allowed=new Set(allowedWarehouses(p,m).map((w:any)=>String(w.id)));
    const data=await readState("yardivo_ai_operations_plan_log_v1",[]);
    const events=(Array.isArray(data)?data:[]).filter((x:any)=>allowed.has(String(x?.warehouse||"")))
      .sort((a:any,b:any)=>String(b?.resolvedAt||b?.at||"").localeCompare(String(a?.resolvedAt||a?.at||""))).slice(0,500);
    return J({ok:true,data:{events}});
  }
  const aiCfg=await readState("yardivo_auto_replan_cfg_v1",{enabled:false,mode:"PAUSED"});
  if(aiCfg?.enabled!==true||String(aiCfg?.mode||"").toUpperCase()==="PAUSED")return J({ok:false,error:"AI upravljanje YardOnom je isključeno od strane Admina.",code:"AI_CONTROL_OFF"},403);
  if(["approve_change","reject_change"].includes(action)){const d=await resolveChange(String(b.decision_id||""),action==="approve_change",p);return J({ok:true,data:{decision:d}})}
  if(!["snapshot","plan_day"].includes(action))return J({ok:false,error:"Nepoznata akcija."},400);
  const date=safeDate(b.date||new Date().toISOString().slice(0,10)),m=await master(),supplierDir=supplierDirectory(m),allowed=allowedWarehouses(p,m),requested=String(b.warehouse||"").trim(),selected=requested?allowed.filter((w:any)=>String(w.id)===requested):allowed;if(requested&&!selected.length)throw new Error("Skladište nije dodijeljeno ovom accountu.");const whIds=selected.map((w:any)=>String(w.id));if(!whIds.length)return J({ok:true,data:{date,warehouses:[],plan:[],passes:[],decisions:[],summary:{total:0,assigned:0,waiting:0,no_capacity:0,utilization_pct:0},generated_at:new Date().toISOString()}});
  const aq=await db.from("yardivo_announcements").select("announcement_id,appointment_date,appointment_time,supplier,warehouse,status,payload,updated_at").eq("appointment_date",date).eq("deleted",false).in("warehouse",whIds).order("appointment_time",{ascending:true});if(aq.error)throw aq.error;
  const normalized=dedupeNormalized((aq.data||[]).map((x:any)=>normalizeAnnouncement(x,supplierDir)).filter((x:any)=>!!x.supplier)),fullPlan:any[]=[],warehouseOut:any[]=[];
  for(const w of selected){
   const group=normalized.filter((x:any)=>x.warehouse===String(w.id));let aiOrder:string[]=[];
   if(group.length){try{aiOrder=await geminiPlanOrder(group,w)}catch(e){console.warn("GEMINI_FALLBACK",e);aiOrder=fallbackPlanOrder(group)}}
   const pp=planWarehouse(group,w,aiOrder);fullPlan.push(...pp.planned);warehouseOut.push({id:String(w.id),name:String(w.name||w.id),location_id:String(w.location_id||""),reception_from:String(w.reception_from||""),reception_to:String(w.reception_to||""),ramps:pp.ramps});
  }
  const changes=await persistPlan(fullPlan,p);
  const visiblePlan=await effectivePlan(fullPlan);
  const from=date+"T00:00:00.000Z",to=new Date(new Date(from).getTime()+86400000).toISOString(),pq=await db.from("yardivo_delivery_passes").select("id,announcement_id,supplier_delivery_id,warehouse,supplier_name,appointment_at,dock,parking_slot,driver_name,driver_phone,vehicle_plate,state,gate_decision,last_instruction,checked_in_at,completed_at,updated_at").in("warehouse",whIds).gte("appointment_at",from).lt("appointment_at",to).order("appointment_at",{ascending:true});if(pq.error)throw pq.error;const passes=(pq.data||[]).map((x:any)=>({...x,supplier_name:canonicalSupplier(x.supplier_name,supplierDir)}));
  let decisions:any[]=[];for(const key of ["yardivo_auto_replan_log_v1","yardivo_ai_operations_plan_log_v1"]){try{const z=await readState(key,[]);if(Array.isArray(z))decisions.push(...z)}catch{}}decisions=decisions.map((x:any)=>({...x,supplier:canonicalSupplier(x?.supplier,supplierDir)})).filter((x:any)=>!!x.supplier&&String(x?.old?.date||x?.newSlot?.date||x?.at||"").slice(0,10)===date).sort((a:any,b:any)=>String(a.at||"").localeCompare(String(b.at||""))).slice(-200);
  const occupied=new Set(passes.filter((x:any)=>x.parking_slot&&!x.completed_at&&!["COMPLETED","REJECTED","CANCELLED"].includes(String(x.state||"").toUpperCase())).map((x:any)=>String(x.parking_slot))),parking={capacity:42,occupied:[...occupied].sort(),free:Math.max(0,42-occupied.size)};
  return J({ok:true,data:{date,warehouses:warehouseOut,plan:visiblePlan,passes,decisions,parking,summary:planSummary(visiblePlan,selected),persisted_changes:changes,generated_at:new Date().toISOString()}});
 }catch(e){return J({ok:false,error:e instanceof Error?e.message:String(e)},400)}
});