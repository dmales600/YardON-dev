(function(){
'use strict';
if(window.YardivoSupabaseClient)return;

const BASE='https://rskticdbiovvgyocpzoc.supabase.co';
const KEY='sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz';
const BUDGET_KEY='yardivo_supabase_402_block_until_v1';
const BUDGET_BLOCK_MS=30*60*1000;
const REALTIME_RECONNECT_MS=[2000,15000,60000,300000,900000];
const budgetGuard={
  until(){
    try{return Number(localStorage.getItem(BUDGET_KEY)||0)||0}catch(_){return 0}
  },
  blocked(){return Date.now()<this.until()},
  block(ms=BUDGET_BLOCK_MS){
    const until=Date.now()+Math.max(60000,Number(ms)||BUDGET_BLOCK_MS);
    try{localStorage.setItem(BUDGET_KEY,String(until))}catch(_){}
    return until;
  },
  clear(){
    try{localStorage.removeItem(BUDGET_KEY)}catch(_){}
  }
};

function options(){
  return {
    auth:{
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:false,
      storage:window.sessionStorage,
      storageKey:(window.YardivoTabAuthV583?.storageKey||('yardivo-auth-'+Math.random().toString(36).slice(2))),
      lock:async(_name,_timeout,fn)=>await fn()
    },
    realtime:{
      reconnectAfterMs:(tries)=>{
        if(budgetGuard.blocked())return Math.max(60000,budgetGuard.until()-Date.now());
        const n=Math.max(1,Number(tries)||1);
        return REALTIME_RECONNECT_MS[Math.min(n-1,REALTIME_RECONNECT_MS.length-1)];
      }
    }
  };
}

async function client(){
  if(window.__yardivoAuthClient)return window.__yardivoAuthClient;
  if(!window.supabase?.createClient)throw new Error('Supabase biblioteka nije učitana.');
  const c=window.supabase.createClient(BASE,KEY,options());
  try{
    const originalInvoke=c.functions?.invoke?.bind(c.functions);
    if(originalInvoke&&!c.functions.__yardivoBudgetWrapped){
      c.functions.invoke=async function(){
        if(budgetGuard.blocked()){
          const error=new Error('SUPABASE PRIVREMENO BLOKIRAN (HTTP 402) — lokalni backoff aktivan.');
          error.status=402;
          return {data:null,error};
        }
        const result=await originalInvoke(...arguments);
        const status=Number(result?.error?.context?.status||result?.error?.status||0);
        if(status===402)budgetGuard.block();
        return result;
      };
      c.functions.__yardivoBudgetWrapped=true;
    }
  }catch(_){}
  window.__yardivoAuthClient=c;
  return c;
}

window.YardivoSupabaseClient={
  base:BASE,
  publishableKey:KEY,
  options,
  client,
  budgetGuard
};
window.YardivoSupabaseBudgetGuard=budgetGuard;
})();
