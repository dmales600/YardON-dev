import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
};
const reply=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:cors});
const ids=(v:any)=>Array.isArray(v)?v.map((x:any)=>String(x||"").trim()).filter(Boolean):[];

function filteredContext(ctx:any, allowed:Set<string>|null){
  const out=ctx&&typeof ctx==="object"?structuredClone(ctx):{};
  if(!allowed)return out;
  if(Array.isArray(out.assignedWarehouses))out.assignedWarehouses=out.assignedWarehouses.filter((w:any)=>allowed.has(String(w?.id||"")));
  if(Array.isArray(out.deliveries))out.deliveries=out.deliveries.filter((d:any)=>allowed.has(String(d?.warehouseId||"")));
  if(Array.isArray(out.incidents))out.incidents=out.incidents.filter((d:any)=>allowed.has(String(d?.warehouseId||"")));
  return out;
}

function publishableKey(){
  const legacy=Deno.env.get("SUPABASE_ANON_KEY")||"";
  if(legacy)return legacy;
  try{
    const all=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
    return String(all?.default||Object.values(all||{})[0]||"");
  }catch{return""}
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return reply({ok:false,error:"METHOD_NOT_ALLOWED"},405);
  try{
    const base=Deno.env.get("SUPABASE_URL")||"";
    const pub=publishableKey();
    const auth=req.headers.get("Authorization")||"";
    if(!auth.startsWith("Bearer "))return reply({ok:false,error:"AUTH_REQUIRED"},401);
    if(!base||!pub)return reply({ok:false,error:"SERVER_CONFIG"},500);

    const pRes=await fetch(base+"/rest/v1/rpc/yardivo_my_profile",{
      method:"POST",
      headers:{apikey:pub,Authorization:auth,"Content-Type":"application/json"},
      body:"{}",
    });
    const pJson=await pRes.json().catch(()=>null);
    const profile=Array.isArray(pJson)?pJson[0]:pJson;
    if(!pRes.ok||!profile?.active)return reply({ok:false,error:"PROFILE_INACTIVE"},403);

    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    if(!service)return reply({ok:false,error:"SERVER_CONFIG"},500);
    const cfgRes=await fetch(base+"/rest/v1/yardivo_app_state?key=eq.yardivo_auto_replan_cfg_v1&deleted=eq.false&select=value_json&limit=1",{
      headers:{apikey:service,Authorization:"Bearer "+service}
    });
    const cfgRows=await cfgRes.json().catch(()=>[]);
    let aiCfg:any={};try{const raw=Array.isArray(cfgRows)?cfgRows[0]?.value_json:null;aiCfg=typeof raw==="string"?JSON.parse(raw):raw||{}}catch{}
    if(!cfgRes.ok||aiCfg?.assistantEnabled!==true)return reply({ok:false,error:"ASSISTANT_DISABLED_BY_ADMIN"},403);

    const geminiKey=Deno.env.get("GEMINI_API_KEY")||"";
    const model=Deno.env.get("YARDIVO_GEMINI_MODEL")||"gemini-3.5-flash-lite";

    const body=await req.json().catch(()=>({}));
    const action=String(body?.action||"chat");

    if(action==="health"){
      return reply({ok:true,configured:Boolean(geminiKey),provider:geminiKey?"gemini":"none",model,thinking:"minimal"});
    }
    if(!geminiKey)return reply({ok:false,error:"GEMINI_NOT_CONFIGURED"},503);

    const message=String(body?.message||"").trim().slice(0,4000);
    if(!message)return reply({ok:false,error:"EMPTY_MESSAGE"},400);

    const role=String(profile.app_role||"").toLowerCase();
    const fullScope=role==="admin"||profile.all_warehouses===true;
    const allowed=fullScope?null:new Set(ids(profile.warehouses));
    const context=filteredContext(body?.context||{},allowed);

    const history=Array.isArray(body?.history)
      ? body.history.slice(-8).map((x:any)=>({
          role:x?.role==="assistant"?"model":"user",
          parts:[{text:String(x?.text||"").slice(0,1800)}]
        }))
      : [];

    const instructions=[
      "Ti si YardOn Smart Assistant.",
      "Odgovaraj na hrvatskom, kratko, jasno i operativno.",
      "Za jednostavna pitanja odgovori odmah i bez nepotrebnog objašnjavanja.",
      "Za činjenice o YardOn sustavu koristi samo dobiveni YardOn kontekst.",
      "Ne izmišljaj rampe, palete, najave, incidente, skladišta ni statuse.",
      "Poštuj warehouse scope korisnika i ne otkrivaj podatke izvan dopuštenog scopea.",
      "Ako podatak nije u kontekstu, reci da ga trenutno ne vidiš.",
      "Ne tvrdi da si izvršio promjenu podataka; Assistant je read-only.",
      "Korisnik: "+String(profile.username||"")+"; uloga: "+String(profile.app_role||"")+".",
      "YardOn kontekst: "+JSON.stringify(context),
    ].join("\n");

    const contents=[...history,{role:"user",parts:[{text:message}]}];

    const aiRes=await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(geminiKey),
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          systemInstruction:{parts:[{text:instructions}]},
          contents,
          generationConfig:{
            maxOutputTokens:420,
            thinkingConfig:{thinkingLevel:"minimal"}
          },
        }),
      }
    );

    const out=await aiRes.json().catch(()=>({}));
    if(!aiRes.ok){
      const detail=String(out?.error?.message||out?.error?.status||"UNKNOWN").slice(0,700);
      console.error("yardivo-ai gemini",aiRes.status,detail);
      return reply({ok:false,error:"GEMINI_"+aiRes.status,detail},502);
    }

    const text=(Array.isArray(out?.candidates)?out.candidates:[])
      .flatMap((c:any)=>Array.isArray(c?.content?.parts)?c.content.parts:[])
      .map((p:any)=>typeof p?.text==="string"?p.text:"")
      .filter(Boolean).join("\n").trim();

    if(!text)return reply({ok:false,error:"GEMINI_EMPTY_RESPONSE"},502);
    return reply({ok:true,reply:text,provider:"gemini",model});
  }catch(e){
    console.error("yardivo-ai",e);
    return reply({ok:false,error:"AI_INTERNAL_ERROR"},500);
  }
});