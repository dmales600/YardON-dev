(function(){
'use strict';
if(window.YardivoSupplierService?.owner==='modules/supplier/service.js')return;

async function token(){
  const direct=String(window.__yardivoSupplierAccessToken||'').trim();
  if(direct)return direct;
  const c=await window.YardivoAuth?.client?.();
  if(!c)throw new Error('Auth nije spreman.');
  let session=null;
  try{session=(await c.auth.getSession())?.data?.session||null}catch(_){}
  if(!session?.access_token){
    try{session=(await c.auth.refreshSession())?.data?.session||null}catch(_){}
  }
  if(!session?.access_token)throw new Error('Prijava nije aktivna. Ponovno se prijavi.');
  return session.access_token;
}

function useTimeOnlyOps(action,payload={}){
  const a=String(action||'').toLowerCase(),st=String(payload?.status||'').toLowerCase();
  if(['upsert','smart_propose','supplier_accept'].includes(a))return true;
  if(a==='internal_resolve_supplier_request')return String(payload?.request_type||'').toLowerCase()==='reschedule_requested';
  if(a==='internal_update'){
    if(['pending','revision_requested','proposal_sent','confirmed','reschedule_requested'].includes(st))return true;
    if(Object.prototype.hasOwnProperty.call(payload,'delivery_date')||Object.prototype.hasOwnProperty.call(payload,'requested_time'))return true;
  }
  return false;
}
function routedFunction(functionName,body={}){
  const name=String(functionName||'').trim();
  if(name==='yardivo-supplier-deliveries'&&useTimeOnlyOps(body?.action,body))return'yardivo-supplier-time-ops';
  return name;
}

async function call(functionName,body={}){
  const name=routedFunction(functionName,body);
  if(!name)throw new Error('Supplier Edge Function nije zadana.');
  const base=String(window.YardivoSupabaseClient?.base||'');
  const key=String(window.YardivoSupabaseClient?.publishableKey||'');
  if(!base||!key)throw new Error('Supabase konfiguracija nije učitana.');
  const accessToken=await token();
  const response=await fetch(base+'/functions/v1/'+name,{
    method:'POST',
    headers:{
      apikey:key,
      Authorization:'Bearer '+accessToken,
      'Content-Type':'application/json'
    },
    body:JSON.stringify(body||{})
  });
  const raw=await response.text();
  let data={};
  try{data=raw?JSON.parse(raw):{}}catch(_){data={error:raw||('HTTP '+response.status)}}
  if(!response.ok||data?.ok===false||data?.error){
    const err=data?.error??data?.message??('HTTP '+response.status);
    const message=typeof err==='string'?err:String(err?.message||err?.details||err?.code||JSON.stringify(err));
    const e=new Error(message);
    e.code=String(data?.code||err?.code||'');
    throw e;
  }
  return data?.data??data;
}

function deliveries(action,payload={}){
  return call('yardivo-supplier-deliveries',{action,...payload});
}
function availability(payload={}){
  return call('yardivo-supplier-availability',payload);
}
function scope(){
  return call('yardivo-user-scope',{});
}

window.YardivoSupplierService={
  owner:'modules/supplier/service.js',
  token,
  call,
  deliveries,
  availability,
  scope,
  bookingMode:'TIME_ONLY',
  routedFunction
};
})();