
(()=>{'use strict';
if(window.__YARDIVO_AI_VOICE_NOTIFICATIONS_V583_FINAL__)return;
window.__YARDIVO_AI_VOICE_NOTIFICATIONS_V583_FINAL__=true;
const MODE_KEY='yardivo_notification_sound_mode_v2';
const LEGACY_KEY='yardivo_notification_sound_v1';
const VOLUME_KEY='yardivo_notification_voice_volume_v583';
const EDGE='https://rskticdbiovvgyocpzoc.supabase.co/functions/v1/yardivo-voice';
const APIKEY='sb_publishable_NWRcS2n-8GxF8qL7wXbZ-Q_-jIyfGoy';
const SEEN='yardivo_ai_voice_seen_v583';
const TEST='YardOn test glas.';
let activeAudio=null,processing=false,tokenCache='',tokenCachedAt=0,stopSeq=0;
const queue=[];
const recent=new Map();
const audioCache=new Map();
const inflight=new Map();

function normRole(v){v=String(v||'').toLowerCase().trim();if(v==='prijam')return'reception';if(v==='zalihe'||v.includes('zalih'))return'inventory';if(v==='voditelj'||v==='management')return'manager';if(v==='porta'||v==='portir')return'gate';return v}
function role(){return normRole(window.currentSession?.app_role||window.currentSession?.role||document.body.dataset.yardivoRole||'')}
function allowed(){return !!role()}
function mode(){try{const v=localStorage.getItem(MODE_KEY);if(v==='ai'||v==='off')return v;if(v==='classic')return'ai';return localStorage.getItem(LEGACY_KEY)==='off'?'off':'ai'}catch(_){return'ai'}}
function volume(){let v=85;try{v=Number(localStorage.getItem(VOLUME_KEY)||85)}catch(_){};return Math.max(0,Math.min(100,Number.isFinite(v)?v:85))}
function setVolume(v){v=Math.max(0,Math.min(100,Number(v)||0));try{localStorage.setItem(VOLUME_KEY,String(v))}catch(_){};if(activeAudio)activeAudio.volume=v/100}
function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
function speechText(n){const brand=v=>clean(v).replace(/YARDIVO/g,'YardOn').replace(/Yardivo/g,'YardOn');const title=brand(n?.title||'Nova YardOn notifikacija');const body=brand(n?.body||'');return (title+(body?'. '+body:'')).slice(0,850)}
function sig(n){return clean((n?.title||'')+'|'+(n?.body||'')).toLowerCase().slice(0,900)}
function seen(){try{return new Set(JSON.parse(sessionStorage.getItem(SEEN)||'[]'))}catch(_){return new Set()}}
function markSeen(id){const s=seen();s.add(String(id));try{sessionStorage.setItem(SEEN,JSON.stringify([...s].slice(-500)))}catch(_){}}
function recentlyQueued(n){
  const k=sig(n);if(!k)return false;
  const now=Date.now(),last=recent.get(k)||0;recent.set(k,now);
  if(recent.size>250){for(const [x,t] of recent)if(now-t>12000)recent.delete(x)}
  return now-last<1500;
}
function cachePut(text,url){
  const old=audioCache.get(text);
  if(old&&old!==url){try{URL.revokeObjectURL(old)}catch(_){}}
  audioCache.delete(text);audioCache.set(text,url);
  while(audioCache.size>40){
    const [k,u]=audioCache.entries().next().value;
    audioCache.delete(k);try{URL.revokeObjectURL(u)}catch(_){}
  }
}
function stopCurrent(){stopSeq++;try{activeAudio?.pause?.()}catch(_){};activeAudio=null}
function clearQueue(){queue.length=0}

async function token(force=false){
  if(!force&&tokenCache&&(Date.now()-tokenCachedAt)<45*60*1000)return tokenCache;
  const direct=String(window.__yardivoSupplierAccessToken||'').trim();
  if(direct){tokenCache=direct;tokenCachedAt=Date.now();return direct}
  const c=await window.YardivoAuth?.client?.();if(!c)throw new Error('AUTH_CLIENT');
  let s=null;try{s=(await c.auth.getSession())?.data?.session||null}catch(_){}
  if(!s?.access_token){try{s=(await c.auth.refreshSession())?.data?.session||null}catch(_){}}
  if(!s?.access_token)throw new Error('AUTH_SESSION');
  tokenCache=s.access_token;tokenCachedAt=Date.now();return tokenCache;
}

async function fetchVoiceUrl(text,forceAuth=false){
  text=clean(text);if(!text)throw new Error('EMPTY_TEXT');
  if(audioCache.has(text))return audioCache.get(text);
  if(inflight.has(text))return inflight.get(text);
  const p=(async()=>{
    let t=await token(forceAuth);
    let r=await fetch(EDGE,{method:'POST',headers:{apikey:APIKEY,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({text})});
    if(r.status===401&&!forceAuth){
      tokenCache='';tokenCachedAt=0;t=await token(true);
      r=await fetch(EDGE,{method:'POST',headers:{apikey:APIKEY,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({text})});
    }
    if(!r.ok){
      let d=null;try{d=await r.json()}catch(_){}
      const detail=String(d?.providerDetail||d?.detail||d?.error||'').trim();
      throw new Error('VOICE_API_'+r.status+(detail?': '+detail:''));
    }
    const blob=await r.blob();if(!blob.size)throw new Error('EMPTY_AUDIO');
    const url=URL.createObjectURL(blob);cachePut(text,url);return url;
  })();
  inflight.set(text,p);
  try{return await p}finally{inflight.delete(text)}
}
async function playUrl(url,seq){
  if(seq!==stopSeq)return;
  const a=new Audio(url);activeAudio=a;a.preload='auto';a.volume=volume()/100;
  await a.play();
  await new Promise(res=>{a.onended=a.onerror=()=>res()});
  if(activeAudio===a)activeAudio=null;
}
async function playText(text,seq=stopSeq){
  const url=await fetchVoiceUrl(text);
  if(seq!==stopSeq)return;
  await playUrl(url,seq);
}
function prepareText(text){fetchVoiceUrl(text).catch(e=>console.warn('YardOn Gemini voice prefetch',e))}

async function processQueue(){
  if(processing||mode()!=='ai'||!allowed())return;
  processing=true;
  try{
    while(queue.length&&mode()==='ai'&&allowed()){
      const item=queue.shift(),seq=stopSeq;
      try{
        const url=await item.ready;
        if(seq!==stopSeq)continue;
        await playUrl(url,seq);
      }catch(e){if(seq===stopSeq)console.warn('YardOn Gemini AI voice unavailable',e)}
    }
  }finally{processing=false}
}

function enqueueNotification(n,{force=false,priority=false}={}){
  if(!n||mode()!=='ai'||!allowed())return;
  const text=speechText(n);if(!text)return;
  const id=String(n?.id||'');
  if(!force){
    if(id&&seen().has(id))return;
    if(recentlyQueued(n))return;
    if(id)markSeen(id);
  }
  const item={n,text,ready:fetchVoiceUrl(text)};
  if(priority){
    clearQueue();stopCurrent();
    queue.unshift(item);
  }else queue.push(item);
  try{
    window.dispatchEvent(new CustomEvent('yardivo:voice-enqueued',{detail:{
      id:String(n?.id||''),event:String(n?.event||''),role:role(),priority:!!priority
    }}));
  }catch(_){}
  processQueue();
}
function forceRead(n){enqueueNotification(n,{force:true,priority:true})}

function notificationFromToast(el){
  if(!(el instanceof Element))return null;
  if(el.matches('.y-live-toast'))return {id:'dom-live-'+Date.now(),title:clean(el.querySelector('.y-live-toast-head span')?.textContent||'Nova YardOn notifikacija'),body:clean(el.querySelector('.y-live-toast-body')?.textContent||'')};
  if(el.matches('.y5-toast'))return {id:'dom-y5-'+Date.now(),title:clean(el.querySelector('strong')?.textContent||'Nova YardOn notifikacija'),body:clean(el.querySelector('span')?.textContent||'')};
  if(el.matches('.yms-toast'))return {id:'dom-yms-'+Date.now(),title:clean(el.querySelector('strong')?.textContent||'Nova YardOn notifikacija'),body:clean(el.querySelector('span')?.textContent||'')};
  return null;
}
function findNotificationById(id){
  try{
    const rows=JSON.parse(localStorage.getItem('yardivo_live_notifications_v1')||'[]');
    return Array.isArray(rows)?rows.find(x=>String(x?.id)===String(id))||null:null;
  }catch(_){return null}
}
function clickedNotification(el){
  const bell=el.closest?.('[data-y5-bell]');if(bell)return findNotificationById(bell.dataset.y5Bell);
  const hist=el.closest?.('[data-y5-history]');if(hist)return findNotificationById(hist.dataset.y5History);
  const toast=el.closest?.('.y5-toast,.y-live-toast,.yms-toast');if(toast)return notificationFromToast(toast);
  return null;
}

function observeVisibleToasts(){
  if(document.documentElement.dataset.yvVoiceToastObserverFinal==='1')return;
  document.documentElement.dataset.yvVoiceToastObserverFinal='1';
  const obs=new MutationObserver(muts=>{
    for(const m of muts)for(const node of m.addedNodes){
      if(!(node instanceof Element))continue;
      const candidates=[];
      if(node.matches?.('.y-live-toast,.y5-toast,.yms-toast'))candidates.push(node);
      node.querySelectorAll?.('.y-live-toast,.y5-toast,.yms-toast').forEach(x=>candidates.push(x));
      for(const el of candidates)requestAnimationFrame(()=>{
        if(!el.isConnected)return;
        const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return;
        const n=notificationFromToast(el);if(n)enqueueNotification(n);
      });
    }
  });
  obs.observe(document.body||document.documentElement,{childList:true,subtree:true});
}

/* New toast = begin Gemini generation immediately. */
window.addEventListener('yardivo:visible-toast',e=>{
  const n=e?.detail?.notification;
  if(!n)return;
  const ev=String(n?.event||'').toUpperCase();
  if(role()==='inventory'&&ev==='SUPPLIER_REQUEST'){
    forceRead(n);
    return;
  }
  enqueueNotification(n);
});

/* Clicking any notification intentionally reads it again, even if already seen/read. */
document.addEventListener('click',e=>{
  const t=e.target;if(!(t instanceof Element))return;
  if(t.closest('.y-live-toast-close,.y5-reader-close'))return;
  const n=clickedNotification(t);
  if(n)forceRead(n);
},true);

function prewarmTest(){
  if(mode()!=='ai'||!allowed())return;
  prepareText(TEST);
}
function setMode(v){
  v=v==='ai'?'ai':'off';
  try{localStorage.setItem(MODE_KEY,v);localStorage.setItem(LEGACY_KEY,'off')}catch(_){}
  if(v!=='ai'){clearQueue();stopCurrent()}
  else prewarmTest();
}
window.addEventListener('load',()=>{
  try{
    const m=localStorage.getItem(MODE_KEY);if(!m||m==='classic')localStorage.setItem(MODE_KEY,'ai');
    localStorage.setItem(LEGACY_KEY,'off');localStorage.removeItem('yardivo_voice_notifications_v583');
  }catch(_){}
  observeVisibleToasts();
  setTimeout(prewarmTest,700);
},{once:true});
window.addEventListener('yardivo:login',()=>{
  clearQueue();
  stopCurrent();
  tokenCache='';
  tokenCachedAt=0;
  setTimeout(prewarmTest,120);
});
window.addEventListener('yardivo:data-synced',()=>setTimeout(prewarmTest,250));
document.addEventListener('DOMContentLoaded',observeVisibleToasts,{once:true});
setTimeout(observeVisibleToasts,200);

window.YardivoAIVoiceNotifications={
  mode,setMode,volume,setVolume,
  speak:enqueueNotification,
  readNow:forceRead,
  pending:()=>queue.length,
  prewarmTest,
  test:async(text=TEST)=>{
    clearQueue();stopCurrent();
    const seq=stopSeq;
    try{await playText(String(text),seq);return'ai'}
    catch(e){console.warn('YardOn Gemini AI voice test unavailable',e);throw e}
  }
};
})();
