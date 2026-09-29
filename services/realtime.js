(function(){
'use strict';
if(window.YardivoRealtime?.owner==='services/realtime.js')return;

const channels=new Map();

async function client(){
  if(!window.YardivoSupabaseClient?.client)throw new Error('Canonical Supabase client service nije učitan.');
  return await window.YardivoSupabaseClient.client();
}

async function setAuth(token){
  const c=await client();
  await c.realtime?.setAuth?.(token||undefined);
  return true;
}

async function connect(options={}){
  if(window.YardivoSupabaseBudgetGuard?.blocked?.()){
    const error=new Error('SUPABASE REALTIME PRIVREMENO U BACKOFFU NAKON PONOVLJENIH GREŠAKA.');
    error.status=402;
    throw error;
  }
  const key=String(options.key||options.topic||'').trim();
  const topic=String(options.topic||'').trim();
  if(!key||!topic)throw new Error('Realtime key/topic nedostaje.');

  const existing=channels.get(key);
  if(existing?.channel)return existing.channel;

  const c=await client();
  const channel=c.channel(topic,options.channelOptions||{});
  const record={key,topic,channel,status:'CONNECTING',connectedAt:0,failures:0,lastFailureAt:0};

  if(typeof options.setup==='function')options.setup(channel);

  channels.set(key,record);
  channel.subscribe(status=>{
    const st=String(status||'').toUpperCase();
    record.status=st;
    if(st==='SUBSCRIBED'){
      record.connectedAt=Date.now();
      record.failures=0;
      record.lastFailureAt=0;
      window.YardivoSupabaseBudgetGuard?.clear?.();
    }else if(st==='CHANNEL_ERROR'||st==='TIMED_OUT'||st==='CLOSED'){
      const now=Date.now();
      record.failures=(record.lastFailureAt&&now-record.lastFailureAt<120000)?record.failures+1:1;
      record.lastFailureAt=now;
      if(record.failures>=3){
        window.YardivoSupabaseBudgetGuard?.block?.(30*60*1000);
        record.status='BUDGET_BACKOFF';
        channels.delete(key);
        try{options.onStatus?.('BUDGET_BACKOFF',channel)}catch(e){console.warn('[YARDIVO REALTIME] status handler',key,e)}
        Promise.resolve(c.removeChannel?.(channel)).catch(()=>{});
        try{c.realtime?.disconnect?.()}catch(_){}
        return;
      }
    }
    try{options.onStatus?.(st,channel)}catch(e){console.warn('[YARDIVO REALTIME] status handler',key,e)}
  });

  return channel;
}

async function remove(key){
  key=String(key||'').trim();
  const record=channels.get(key);
  channels.delete(key);
  if(!record?.channel)return false;
  const c=await client();
  try{await c.removeChannel(record.channel)}catch(_){}
  return true;
}

async function removeAll(){
  const keys=[...channels.keys()];
  for(const key of keys){
    try{await remove(key)}catch(_){}
  }
  return true;
}

function status(key){
  const record=channels.get(String(key||''));
  return record?.status||'OFF';
}

function get(key){
  return channels.get(String(key||''))?.channel||null;
}

function stats(){
  return [...channels.values()].map(r=>({
    key:r.key,
    topic:r.topic,
    status:r.status,
    connectedAt:r.connectedAt||0
  }));
}

window.YardivoRealtime={
  owner:'services/realtime.js',
  client,
  setAuth,
  connect,
  remove,
  removeAll,
  status,
  get,
  stats
};

window.addEventListener('pagehide',()=>{void removeAll()},{once:true});
})();