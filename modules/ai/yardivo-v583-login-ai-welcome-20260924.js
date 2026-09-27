(()=>{'use strict';
if(window.__YARDIVO_LOGIN_AI_WELCOME_20260924__)return;
window.__YARDIVO_LOGIN_AI_WELCOME_20260924__=true;

let seq=0,spokenSeq=0,fallbackTimer=0;

function role(){
  let r=String(window.currentSession?.app_role||window.currentSession?.role||'').trim().toLowerCase();
  if(r==='voditelj'||r==='management')r='manager';
  if(r==='zalihe'||r.includes('zalih'))r='inventory';
  if(r==='prijam')r='reception';
  if(r==='porta'||r==='portir')r='gate';
  return r;
}
function today(){
  const d=new Date(),p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
function visibleLocalToday(){
  try{
    const d=today();
    const arr=Array.isArray(window.announcements)
      ?window.announcements
      :(typeof announcements!=='undefined'&&Array.isArray(announcements)?announcements:[]);
    const s=window.currentSession||{};
    const allowed=new Set(Array.isArray(s.warehouses)?s.warehouses.map(String):[]);
    return arr.filter(a=>{
      const date=String(a?.date||a?.appointment_date||a?.payload?.date||'').slice(0,10);
      const wh=String(a?.warehouse||a?.payload?.warehouse||'');
      const scoped=s.all_warehouses===true||!allowed.size||allowed.has(wh);
      const st=String(a?.status||a?.payload?.status||'').toLowerCase();
      return date===d&&scoped&&!['obrisano','deleted','cancelled','canceled'].includes(st);
    }).length;
  }catch(_){return 0}
}

async function greet(mySeq){
  if(mySeq!==seq||spokenSeq===mySeq||!window.currentSession)return;
  if(role()!=='reception')return;
  try{
    if(localStorage.getItem('yardivo_notification_sound_mode_v2')==='off')return;
    spokenSeq=mySeq;
    const n=visibleLocalToday();
    if(mySeq!==seq||role()!=='reception'||!window.currentSession)return;
    const word=n===1?'najavu':'najava';
    const body='Dobrodošli u YardOn. Danas imate '+n+' '+word+'.';
    const api=window.YardivoAIVoiceNotifications;
    if(api?.readNow)api.readNow({id:'YARDIVO-LOGIN-'+Date.now(),title:'',body});
    else if(api?.test)await api.test(body);
  }catch(e){
    console.warn('[YardOn login AI welcome]',e);
  }
}

function scheduleReceptionGreeting(){
  const my=seq;
  if(role()!=='reception')return;
  clearTimeout(fallbackTimer);
  fallbackTimer=setTimeout(()=>greet(my),1200);
}
function greetOnReady(){
  if(role()!=='reception')return;
  clearTimeout(fallbackTimer);
  greet(seq);
}

window.addEventListener('yardivo:login',()=>{
  seq++;
  spokenSeq=0;
  clearTimeout(fallbackTimer);
  scheduleReceptionGreeting();
});
window.addEventListener('yardivo:data-synced',greetOnReady);
window.addEventListener('yardivo:online-ready',greetOnReady);
window.addEventListener('yardivo:logout',()=>{
  seq++;
  spokenSeq=0;
  clearTimeout(fallbackTimer);
});
})();