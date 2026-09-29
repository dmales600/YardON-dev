
(function(){
'use strict';
if(window.__YARDIVO_DELAY_SETTINGS_V1__)return;
window.__YARDIVO_DELAY_SETTINGS_V1__=true;

const KEY='yardivo_delay_settings_v1';
const URL='https://ldzwgdwzolbvjxyznlry.supabase.co/functions/v1/yardivo-sync';
const APIKEY='sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz';
const DEF={graceMinutes:15,orangeFrom:30,redFrom:60,criticalFrom:90,noShowAt:'14:00'};

function role(){
 let r='';try{r=String(currentSession?.role||currentSession?.app_role||'').trim().toLowerCase()}catch(_){}
 if(r==='voditelj'||r==='management')r='manager';
 return r;
}
function sanitize(x){
 x={...DEF,...(x&&typeof x==='object'?x:{})};
 x.graceMinutes=Math.max(0,Math.floor(Number(x.graceMinutes)||0));
 x.orangeFrom=Math.max(x.graceMinutes+1,Math.floor(Number(x.orangeFrom)||30));
 x.redFrom=Math.max(x.orangeFrom+1,Math.floor(Number(x.redFrom)||60));
 x.criticalFrom=Math.max(x.redFrom+1,Math.floor(Number(x.criticalFrom)||90));
 x.noShowAt=/^([01]\d|2[0-3]):[0-5]\d$/.test(String(x.noShowAt||''))?String(x.noShowAt):'14:00';
 return x;
}
function get(){
 try{return sanitize(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(_){return {...DEF}}
}
function apply(x){
 x=sanitize(x);localStorage.setItem(KEY,JSON.stringify(x));
 try{TOLERANCE_MIN=x.graceMinutes}catch(_){}
 try{LATE_GRACE_MINUTES=x.graceMinutes}catch(_){}
 /* ONE GLOBAL RULESET: never keyed by warehouse/location. */
 window.YARDIVO_GLOBAL_DELAY_RULES={...x};
 try{window.dispatchEvent(new CustomEvent('yardivo:delay-rules-changed',{detail:{...x,scope:'ALL_WAREHOUSES'}}))}catch(_){}
 try{window.renderDailyMap?.()}catch(_){}
 try{window.renderWeeklyMap?.()}catch(_){}
 try{window.renderOverview?.()}catch(_){}
 try{window.renderDashboard?.()}catch(_){}
 try{window.renderControlTower?.()}catch(_){}
 try{window.YardivoAnalyticsV1?.render?.()}catch(_){}
 try{window.YardivoControlTower?.render?.()}catch(_){}
 render();
 return x;
}
async function token(){
 const raw=String(window.__yardivoSupplierAccessToken||'').trim();if(raw)return raw;
 try{
   const c=await window.YardivoAuth?.client?.();
   let s=(await c?.auth?.getSession?.())?.data?.session||null;
   if(!s?.access_token)s=(await c?.auth?.refreshSession?.())?.data?.session||null;
   return String(s?.access_token||'');
 }catch(_){return''}
}
async function bootstrap(){
 const t=await token();if(!t)return;
 try{
   const r=await fetch(URL,{method:'POST',headers:{apikey:APIKEY,Authorization:'Bearer '+t,'Content-Type':'application/json'},
     body:JSON.stringify({action:'bootstrap',clientId:'yardivo-delay-settings-read-v1'})});
   const d=await r.json().catch(()=>({}));if(!r.ok||d?.ok===false)return;
   const row=(Array.isArray(d?.state)?d.state:[]).find(x=>String(x?.key||'')===KEY&&!x?.deleted);
   if(row){
     let x={};try{x=JSON.parse(String(row.value_json||'{}'))||{}}catch(_){}
     apply(x);
   }else apply(get());
 }catch(_){apply(get())}
}
async function persist(x){
 if(role()!=='admin')throw new Error('Samo Admin može mijenjati postavke kašnjenja.');
 const t=await token();if(!t)throw new Error('ONLINE PRIJAVA NIJE AKTIVNA.');
 const clean=sanitize(x);
 const r=await fetch(URL,{method:'POST',headers:{apikey:APIKEY,Authorization:'Bearer '+t,'Content-Type':'application/json'},
   body:JSON.stringify({action:'set_state',key:KEY,value:JSON.stringify(clean),clientId:'yardivo-delay-settings-v1'})});
 const d=await r.json().catch(()=>({}));if(!r.ok||d?.ok===false)throw new Error(d?.error||('HTTP '+r.status));
 apply(clean);return clean;
}
function ensure(){
 const settings=document.getElementById('settings');if(!settings)return null;
 const grid=settings.querySelector('.settings-grid')||settings;
 let p=document.getElementById('yardivoDelaySettingsV1');
 if(!p){
   p=document.createElement('section');p.id='yardivoDelaySettingsV1';p.className='panel';p.dataset.yardivoSettings='admin';
   p.innerHTML=`<div class="panel-head"><div><h2>POSTAVKE KAŠNJENJA</h2><small>GLOBALNO PRAVILO · vrijedi za SVA skladišta u YARDIVO · Dnevna/Tjedna mapa, Analytics, Overview i NO-SHOW</small></div></div>
   <div class="yds-body">
    <div class="yds-grid">
     <div class="yds-field"><label>KAŠNJENJE POČINJE NAKON · MIN</label><input id="ydsGrace" type="number" min="0" step="1"><small>Do ovog praga najava ostaje normalno plava.</small></div>
     <div class="yds-field"><label>NARANČASTO OD · MIN</label><input id="ydsOrange" type="number" min="1" step="1"><small>Prije ovog praga kasna najava ima žuti glow.</small></div>
     <div class="yds-field"><label>CRVENO OD · MIN</label><input id="ydsRed" type="number" min="2" step="1"><small>Od ovog praga kašnjenje postaje jasno crveno.</small></div>
     <div class="yds-field"><label>KRITIČNO CRVENO OD · MIN</label><input id="ydsCritical" type="number" min="3" step="1"><small>Najjača razina upozorenja prije NO-SHOW statusa.</small></div>
     <div class="yds-field"><label>AUTOMATSKI NO-SHOW POSLIJE</label><input id="ydsNoShow" type="time"><small>Za današnju najavu koja do tog vremena nije fizički stigla.</small></div>
    </div>
    <div style="margin-top:10px;padding:9px 10px;border:1px solid #2b4d65;border-radius:8px;font-size:9px;font-weight:900">PRIMJENA: <strong>SVA SKLADIŠTA / SVE LOKACIJE</strong> · pravilo nije vezano uz pojedino skladište.</div><div class="yds-preview">
      <span class="yds-chip blue">U DOLASKU</span>
      <span class="yds-chip yellow">POČETNO KAŠNJENJE</span>
      <span class="yds-chip orange">NARANČASTO</span>
      <span class="yds-chip red">CRVENO</span>
      <span class="yds-chip critical">NO-SHOW / KRITIČNO</span>
    </div>
    <div class="yds-actions"><button type="button" class="primary" id="ydsSave">SPREMI POSTAVKE KAŠNJENJA</button><span class="yds-status" id="ydsStatus">—</span></div>
   </div>`;
   grid.insertBefore(p,grid.querySelector('.danger-zone')||null);
   p.querySelector('#ydsSave').addEventListener('click',saveFromUi);
 }
 return p;
}
function render(){
 const p=ensure();if(!p)return;
 p.style.display=role()==='admin'?'block':'none';
 if(role()!=='admin')return;
 const x=get();
 p.querySelector('#ydsGrace').value=x.graceMinutes;
 p.querySelector('#ydsOrange').value=x.orangeFrom;
 p.querySelector('#ydsRed').value=x.redFrom;
 p.querySelector('#ydsCritical').value=x.criticalFrom;
 p.querySelector('#ydsNoShow').value=x.noShowAt;
 const s=p.querySelector('#ydsStatus');
 if(s)s.textContent=`Aktivno: ${x.graceMinutes} / ${x.orangeFrom} / ${x.redFrom} / ${x.criticalFrom} min · NO-SHOW ${x.noShowAt}`;
}
async function saveFromUi(){
 const p=ensure();if(!p)return;
 const x=sanitize({
   graceMinutes:p.querySelector('#ydsGrace').value,
   orangeFrom:p.querySelector('#ydsOrange').value,
   redFrom:p.querySelector('#ydsRed').value,
   criticalFrom:p.querySelector('#ydsCritical').value,
   noShowAt:p.querySelector('#ydsNoShow').value
 });
 const st=p.querySelector('#ydsStatus');
 try{
   if(st)st.textContent='Spremam…';
   await persist(x);
   if(st)st.textContent=`Spremljeno · ${new Date().toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'})}`;
   try{window.showYmsToast?.('success','POSTAVKE KAŠNJENJA SPREMLJENE',`Kašnjenje ${x.graceMinutes} min · NO-SHOW ${x.noShowAt}`)}catch(_){}
 }catch(e){
   if(st)st.textContent='Greška pri spremanju';
   alert(String(e?.message||e));
 }
}

function boot(){
 ensure();apply(get());bootstrap();
}
document.addEventListener('click',e=>{
 if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"],#navSettings'))setTimeout(render,20);
},true);
['yardivo:login','yardivo:data-synced'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(bootstrap,80)));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

window.YardivoDelayRulesV1={get,apply,bootstrap,persist,noShowAt:()=>get().noShowAt};
})();
