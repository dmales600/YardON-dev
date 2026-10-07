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


function normRole(v:any){let r=String(v??'').trim().toLowerCase();if(r==='porta'||r==='portir')r='gate';if(r==='prijam')r='reception';return r}
async function profile(req:Request){
  const h=req.headers.get('Authorization')??'';if(!h.startsWith('Bearer '))throw new Error('Nedostaje prijava.');
  const {data:u,error}=await db.auth.getUser(h.slice(7));if(error||!u.user?.id)throw new Error('Neispravna prijava.');
  const {data:p,error:pe}=await db.from('yardivo_user_access').select('auth_user_id,username,app_role,active,warehouses,all_warehouses').eq('auth_user_id',u.user.id).maybeSingle();
  if(pe)throw pe;if(!p?.active)throw new Error('Account nije aktivan.');
  const r=normRole(p.app_role);if(!['admin','gate','reception'].includes(r))throw new Error('Nema ovlasti za AI raspored rampi.');
  return {...p,app_role:r};
}
async function master(){
  const {data,error}=await db.from('yardivo_app_state').select('value_json').eq('key','yardivo_master_data_registry_v583').eq('deleted',false).maybeSingle();if(error)throw error;
  if(data?.value_json&&typeof data.value_json==='object')return data.value_json;
  try{return JSON.parse(String(data?.value_json||'{}'))}catch{return {warehouses:[]}}
}
async function aiControlEnabled(){
  const {data,error}=await db.from('yardivo_app_state').select('value_json').eq('key','yardivo_auto_replan_cfg_v1').eq('deleted',false).maybeSingle();
  if(error)throw error;
  let c:any={};try{c=typeof data?.value_json==='string'?JSON.parse(data.value_json):data?.value_json||{}}catch{}
  return c?.enabled===true&&String(c?.mode||'').toUpperCase()!=='PAUSED';
}
function dockNo(v:any){const m=String(v??'').match(/\d+/);return m?Number(m[0]):0}
function activeRampNumbers(w:any){
  const rs=(Array.isArray(w?.ramp_settings)?w.ramp_settings:[]).filter((r:any)=>r&&r.active!==false&&Number(r.number)>0).map((r:any)=>Number(r.number));
  if(rs.length)return [...new Set(rs)].sort((a,b)=>a-b);
  const n=Math.max(0,Number(w?.ramps)||0);return Array.from({length:n},(_,i)=>i+1);
}
function terminalAnnouncementStatus(v:any){return ['ZAPRIMLJENO','COMPLETED','RECEIVED','ODBIJEN','REJECTED','OTKAZAN','OTKAZANO','CANCELLED','CANCELED'].includes(String(v||'').trim().toUpperCase())}
async function releaseFinishedDockPasses(warehouse:string){
  const {data:active,error}=await db.from('yardivo_delivery_passes').select('id,announcement_id,state').eq('warehouse',warehouse).eq('state','PROCEED_DOCK');if(error)throw error;
  const ids=[...new Set((active||[]).map((x:any)=>String(x.announcement_id||'')).filter(Boolean))];if(!ids.length)return 0;
  const {data:anns,error:ae}=await db.from('yardivo_announcements').select('announcement_id,status,payload').in('announcement_id',ids).eq('deleted',false);if(ae)throw ae;
  const amap=new Map((anns||[]).map((a:any)=>[String(a.announcement_id),String(a.status||a.payload?.status||'')]));
  let released=0;const iso=new Date().toISOString();
  for(const p of active||[]){if(!terminalAnnouncementStatus(amap.get(String(p.announcement_id))))continue;const {error:ue}=await db.from('yardivo_delivery_passes').update({state:'COMPLETED',completed_at:iso,terminal_reason:'DELIVERY_COMPLETED',updated_at:iso}).eq('id',p.id).eq('state','PROCEED_DOCK');if(!ue)released++}
  return released;
}
function arrivedAtMs(p:any){for(const v of [p.checked_in_at,p.gate_decided_at,p.updated_at,p.created_at]){const t=new Date(v||0).getTime();if(Number.isFinite(t)&&t>0)return t}return Number.MAX_SAFE_INTEGER}
function priority(p:any,now:number){
  const appt=new Date(p.appointment_at||0).getTime();const arrived=arrivedAtMs(p);
  if(!Number.isFinite(appt)||appt<=0)return {tier:3,diff:Infinity,arrived,appt:Infinity};
  const diff=(now-appt)/60000;
  if(diff>=-15&&diff<=30)return {tier:0,diff:Math.abs(diff),arrived,appt};
  if(diff>30)return {tier:1,diff,arrived,appt};
  return {tier:2,diff:Math.abs(diff),arrived,appt};
}
function compareWaiting(a:any,b:any,now:number){
  const A=priority(a,now),B=priority(b,now);if(A.tier!==B.tier)return A.tier-B.tier;
  if(A.tier===0&&A.diff!==B.diff)return A.diff-B.diff;
  if(A.tier===2&&A.appt!==B.appt)return A.appt-B.appt;
  if(A.arrived!==B.arrived)return A.arrived-B.arrived;
  return A.appt-B.appt;
}
function timingText(p:any,now:number){const appt=new Date(p.appointment_at||0).getTime();if(!Number.isFinite(appt)||appt<=0)return 'prioritet prema vremenu dolaska';const m=Math.round((now-appt)/60000);if(m===0)return 'stiglo točno na termin';if(m<0)return `stiglo ${Math.abs(m)} min ranije`;return `kasni ${m} min`}
async function geminiDockAssignments(candidates:any[],free:number[],warehouse:string,now:number){
 const rows=candidates.map((p:any)=>({id:String(p.id),appointment_at:p.appointment_at,checked_in_at:p.checked_in_at,parking_slot:p.parking_slot,vehicle_plate:p.vehicle_plate||"",supplier_name:p.supplier_name||"",timing:timingText(p,now)}));
 const out=await geminiJson("Ti si YardOn AI dispatcher rampi. Poslovni prioritet već je izračunat i lista candidates sadrži samo kamione koji smiju dobiti sada slobodnu rampu. Vrati isključivo JSON {assignments:[{pass_id,ramp}]}. Svaki kandidat dodijeli najviše jednom, koristi samo ponuđene slobodne rampe, ne izmišljaj ID-eve ni rampe. Dodijeli koliko je moguće do broja slobodnih rampi.",{warehouse,free_ramps:free,candidates:rows});
 const a=Array.isArray(out?.assignments)?out.assignments:[];const ids=new Set(rows.map((x:any)=>x.id)),ramps=new Set(free.map(Number)),usedIds=new Set<string>(),usedRamps=new Set<number>(),clean:any[]=[];
 for(const x of a){const id=String(x?.pass_id||""),r=Number(x?.ramp);if(!ids.has(id)||!ramps.has(r)||usedIds.has(id)||usedRamps.has(r))throw new Error("GEMINI_INVALID_DOCK_ASSIGNMENT");usedIds.add(id);usedRamps.add(r);clean.push({pass_id:id,ramp:r})}
 if(clean.length!==Math.min(rows.length,free.length))throw new Error("GEMINI_INCOMPLETE_DOCK_ASSIGNMENT");
 return clean;
}
async function event(passId:string,message:string){const {error}=await db.from('yardivo_delivery_pass_events').insert({delivery_pass_id:passId,kind:'ai_dispatch',message,actor_role:'ai',actor_name:'YardOn AI'});if(error)throw error}
async function mirrorAssignedDock(p:any,ramp:number,actor:any){
  const now=new Date().toISOString(),dockNoValue=String(ramp),supplierDeliveryId=String(p?.supplier_delivery_id||'').trim();
  if(supplierDeliveryId){
    const {error:de}=await db.from('yardivo_supplier_deliveries').update({dock:dockNoValue,dock_number:ramp,status:'arrival',updated_at:now}).eq('id',supplierDeliveryId);
    if(de)throw de;
  }
  const ids=[String(p?.announcement_id||'').trim(),supplierDeliveryId?('SUPDEL-'+supplierDeliveryId):''].filter(Boolean);
  if(!ids.length)return;
  const {data:rows,error:ae}=await db.from('yardivo_announcements').select('announcement_id,payload,status').in('announcement_id',[...new Set(ids)]).eq('deleted',false);
  if(ae)throw ae;
  for(const row of rows||[]){
    const payload=(row?.payload&&typeof row.payload==='object')?{...row.payload}:{};
    payload.dock=dockNoValue;
    payload.status='U dvorištu';
    payload.updatedAt=now;
    if(supplierDeliveryId&&!payload.supplierDeliveryId)payload.supplierDeliveryId=supplierDeliveryId;
    const {error:ue}=await db.from('yardivo_announcements').update({status:'U dvorištu',payload,updated_by:String(actor?.username||'YardOn AI'),updated_at:now}).eq('announcement_id',row.announcement_id);
    if(ue)throw ue;
  }
}
async function dispatchWarehouse(warehouse:string,actor:any){
  const m=await master(),w=(m.warehouses||[]).find((x:any)=>x&&x.active!==false&&String(x.id)===warehouse);if(!w)throw new Error('Skladište nije aktivno u Master podacima.');
  const ramps=activeRampNumbers(w);if(!ramps.length)return {warehouse,assignments:[],queue:[],freeRamps:[],reason:'NO_ACTIVE_RAMPS'};
  await releaseFinishedDockPasses(warehouse);
  const {data:busy,error:be}=await db.from('yardivo_delivery_passes').select('id,announcement_id,supplier_delivery_id,dock,state').eq('warehouse',warehouse).eq('state','PROCEED_DOCK');if(be)throw be;
  for(const active of busy||[]){const ramp=dockNo(active.dock);if(ramp>0)await mirrorAssignedDock(active,ramp,actor)}
  const occupied=new Set((busy||[]).map((x:any)=>dockNo(x.dock)).filter((n:number)=>n>0));const free=ramps.filter((n:number)=>!occupied.has(n));
  const {data:waiting,error:we}=await db.from('yardivo_delivery_passes').select('*').eq('warehouse',warehouse).eq('gate_decision','APPROVED').in('state',['PARKING','WAITING_DOCK']).order('checked_in_at',{ascending:true,nullsFirst:false});if(we)throw we;
  const now=Date.now(),sorted=(waiting||[]).slice().sort((a:any,b:any)=>compareWaiting(a,b,now));
  const eligible=sorted.filter((p:any)=>priority(p,now).tier<=1),policyCandidates=eligible.slice(0,free.length);const aiAssignments=policyCandidates.length?await geminiDockAssignments(policyCandidates,free,warehouse,now):[],assignments:any[]=[];
  for(const choice of aiAssignments){const p=policyCandidates.find((x:any)=>String(x.id)===String(choice.pass_id));if(!p)continue;const ramp=Number(choice.ramp),dock='R'+ramp;const msg=`YardOn AI: ${dock} je slobodna. ${timingText(p,now)}. Krenite na ${dock}.`;
    const {data:updated,error:ue}=await db.from('yardivo_delivery_passes').update({dock,state:'PROCEED_DOCK',parking_slot:null,last_instruction:msg,updated_at:new Date().toISOString()}).eq('id',p.id).in('state',['PARKING','WAITING_DOCK']).select('id,announcement_id,supplier_delivery_id,warehouse,appointment_at,checked_in_at,dock,state,last_instruction').maybeSingle();if(ue)throw ue;if(!updated)continue;
    await mirrorAssignedDock(updated,ramp,actor);
    await event(String(p.id),msg);assignments.push(updated);
  }
  const assignedIds=new Set(assignments.map((x:any)=>String(x.id)));const queue=sorted.filter((x:any)=>!assignedIds.has(String(x.id))).map((x:any)=>({id:x.id,appointment_at:x.appointment_at,checked_in_at:x.checked_in_at,parking_slot:x.parking_slot,priority:priority(x,now)}));
  return {warehouse,assignments,queue,freeRamps:free.slice(assignments.length),actor:String(actor?.username||'YardOn')};
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});if(req.method!=='POST')return J({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  try{
    const p=await profile(req),b=await req.json().catch(()=>({})),action=String(b.action||'dispatch').toLowerCase();if(action==='health')return J({ok:true,provider:'gemini',geminiKeyPresent:Boolean(geminiKey()),model:geminiModel()});if(action!=='dispatch')return J({ok:false,error:'UNKNOWN_ACTION'},400);
    if(!(await aiControlEnabled()))return J({ok:true,disabled:true,reason:'AI_CONTROL_OFF',results:[]});
    const requested=String(b.warehouse||'').trim(),allowed=Array.isArray(p.warehouses)?p.warehouses.map(String):[];
    let warehouses:string[]=[];
    if(requested){if(p.app_role!=='admin'&&!p.all_warehouses&&!allowed.includes(requested))throw new Error('Nema ovlasti za ovo skladište.');warehouses=[requested]}
    else if(p.app_role==='admin'||p.all_warehouses){const m=await master();warehouses=(m.warehouses||[]).filter((w:any)=>w&&w.active!==false).map((w:any)=>String(w.id))}
    else warehouses=allowed;
    const results=[];for(const wh of [...new Set(warehouses)].filter(Boolean))results.push(await dispatchWarehouse(wh,p));
    return J({ok:true,results});
  }catch(e){console.error(e);return J({ok:false,error:String((e as any)?.message||e)},400)}
});
