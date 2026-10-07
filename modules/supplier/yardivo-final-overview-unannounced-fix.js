
(function(){
'use strict';

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function arr(){try{return Array.isArray(announcements)?announcements:[]}catch(e){return []}}
function inc(){try{return Array.isArray(incidents)?incidents:[]}catch(e){return []}}
function supplierNames(){
  try{
    const d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');
    if(Array.isArray(d.suppliers)){
      return d.suppliers
        .filter(x=>x&&x.active!==false&&String(x.name||'').trim())
        .map(x=>String(x.name).trim())
        .sort((a,b)=>a.localeCompare(b,'hr'));
    }
  }catch(_){}
  return [];
}
function visibleByWarehouse(x){
  try{return typeof whMatch==='function'?whMatch(x):true}catch(e){return true}
}
function localToday(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function eventDate(a){return String(a?.date||'')}
function due(a){const d=eventDate(a);return !!d && d<=localToday()}
function actual(a){
  /* Any operational evidence that the vehicle really arrived counts as arrival.
     This covers Porta, Yard, Ramp, Receiving and legacy fields. */
  try{if(typeof actualDateTime==='function'&&actualDateTime(a))return true}catch(e){}
  return !!(
    a?.actualDate || a?.actualTime || a?.actualArrival ||
    a?.gateCheckedAt || a?.gateInAt || a?.gateEnteredAt || a?.enteredAt ||
    a?.yardArrivalAt || a?.yardInAt ||
    a?.dockArrivalAt || a?.dockAt || a?.atDockAt ||
    a?.unloadStartedAt || a?.receivedAt || a?.completedAt ||
    a?.rejectedAt || a?.gateOutAt
  );
}
function delay(a){
  try{
    if(typeof delayMinutes==='function'){
      const d=delayMinutes(a);
      if(d!=null&&Number.isFinite(Number(d)))return Number(d);
    }
  }catch(e){}
  for(const k of ['lateMinutes','delayMinutes','arrivalDelayMinutes','delay']){
    const v=Number(a?.[k]);if(Number.isFinite(v))return v;
  }
  return null;
}
function fmtDelay(n){
  if(n==null||!Number.isFinite(n))return '—';
  try{return formatDelay(Math.round(n))}catch(e){return `${Math.round(n)} min`}
}
function stat(a){
  try{return operationalPlanStatus(a)||normalizedPlanStatus(a)||a.status||'Najavljeno'}catch(e){return a.status||'Najavljeno'}
}
function statusNorm(a){return String(stat(a)||'').toLocaleUpperCase('hr-HR')}
function isNoShow(a){return /NO.?SHOW|NIJE DOŠAO|NIJE DOSAO/.test(statusNorm(a)) || !!a?.noShow}
function isRejected(a){return /ODBIJ/.test(statusNorm(a)) || !!a?.rejectedAt}
function isReceived(a){return /ZAPRIM|ZAVRŠ|ZAVRS/.test(statusNorm(a)) || !!(a?.receivedAt||a?.completedAt)}
function isUnannounced(a){return a?.arrivalType==='UNANNOUNCED'||a?.unannounced===true}
function changeCount(a){
  let n=Array.isArray(a?.changeHistory)?a.changeHistory.length:0;
  if(a?.rescheduledAt&&!n)n=1;
  if(a?.autoReplannedAt&&!n)n=1;
  return n;
}
function unloadMinutes(a){
  const start=a?.unloadStartedAt||a?.dockArrivalAt||a?.dockAt||a?.atDockAt;
  const end=a?.receivedAt||a?.completedAt||a?.rejectedAt;
  if(!start||!end)return null;
  const x=new Date(start),y=new Date(end);
  if(isNaN(x)||isNaN(y))return null;
  const m=Math.round((y-x)/60000);return m>=0&&m<1440?m:null;
}
function scoreColor(p){
  /* 0 = red, 50 = amber, 100 = green */
  const n=Math.max(0,Math.min(100,Number(p)||0));
  const hue=Math.round(n*1.2);
  return `hsl(${hue} 72% ${n>70?40:45}%)`;
}
function scoreClass(p){return p>=80?'good':p>=55?'mid':'bad'}

function supplierStat(name, allA, allI){
  const data=allA.filter(a=>a.supplier===name);
  /* Future appointments are visible in history but never penalize reliability. */
  const evaluated=data.filter(due);
  const arrived=evaluated.filter(actual);
  const late=arrived.filter(a=>(delay(a)||0)>yardivoDelayGraceMinutes());
  const on=Math.max(0,arrived.length-late.length);
  const lateVals=late.map(delay).filter(v=>v!=null&&Number.isFinite(v));
  const avgLate=lateVals.length?Math.round(lateVals.reduce((x,y)=>x+y,0)/lateVals.length):0;
  const noShow=evaluated.filter(isNoShow).length;
  const rejected=evaluated.filter(isRejected).length;
  const received=evaluated.filter(isReceived).length;
  const unannounced=evaluated.filter(isUnannounced).length;
  const incidents=allI.filter(i=>i.supplier===name && (!i.date||String(i.date)<=localToday())).length;
  const pallets=evaluated.reduce((s,a)=>s+Number(a.pallets||0),0);
  const changes=evaluated.reduce((s,a)=>s+changeCount(a),0);
  const unloadVals=evaluated.map(unloadMinutes).filter(v=>v!=null);
  const avgUnload=unloadVals.length?Math.round(unloadVals.reduce((a,b)=>a+b,0)/unloadVals.length):null;
  const punctuality=arrived.length?Math.round(on/arrived.length*100):null;

  /* Reliability model, 0–100.
     45% punctuality
     25% delivery success (no rejected/no-show)
     15% incident-free
      5% announced-arrival compliance
      5% schedule stability
      5% completed receipt evidence
     Additional severe-delay penalty keeps chronic long delays visible. */
  let reliability=null;
  if(evaluated.length){
    const denom=Math.max(1,evaluated.length);
    const arrivalDen=Math.max(1,arrived.length);

    const punctualComponent=arrived.length?(on/arrivalDen)*45:0;
    const failed=Math.min(denom,noShow+rejected);
    const successComponent=(1-failed/denom)*25;
    const incidentComponent=(1-Math.min(1,incidents/denom))*15;
    const announcedComponent=(1-Math.min(1,unannounced/denom))*5;
    const changeRate=Math.min(1,changes/denom);
    const stabilityComponent=(1-changeRate)*5;
    const completedEvidence=Math.min(denom,received+rejected);
    const completionComponent=(completedEvidence/denom)*5;
    const severeDelayPenalty=avgLate>30?Math.min(12,(avgLate-30)/5):0;

    reliability=Math.round(
      punctualComponent+successComponent+incidentComponent+
      announcedComponent+stabilityComponent+completionComponent-severeDelayPenalty
    );
    reliability=Math.max(0,Math.min(100,reliability));
  }

  const score10=reliability==null?null:Math.max(0,Math.min(10,Math.round(reliability/10)));
  return {
    name,data,evaluated:evaluated.length,arrived:arrived.length,on,late:late.length,avgLate,
    noShow,rejected,received,unannounced,incidents,pallets,changes,avgUnload,
    punctuality,reliability,score10
  };
}
function setText(id,v){const e=document.getElementById(id);if(e)e.textContent=v}

function render(){
  const root=document.getElementById('overview');if(!root)return;
  const select=document.getElementById('overviewSupplierSelect');
  if(!select)return;

  const allA=arr().filter(visibleByWarehouse);
  const allI=inc().filter(visibleByWarehouse);
  const names=[...new Set([
    ...allA.map(a=>a?.supplier),
    ...allI.map(i=>i?.supplier)
  ].filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b,'hr'));
  const prev=select.value||'';
  select.innerHTML='<option value="">Svi dobavljači</option>'+names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
  if(names.includes(prev))select.value=prev;
  const selected=select.value||'';

  const stats=names.map(n=>supplierStat(n,allA,allI));
  const chosen=selected?stats.find(s=>s.name===selected):null;
  const scopedA=selected?allA.filter(a=>a.supplier===selected):allA;
  const scopedI=selected?allI.filter(i=>i.supplier===selected):allI;

  const arrived=scopedA.filter(actual);
  const late=arrived.filter(a=>(delay(a)||0)>yardivoDelayGraceMinutes());
  const on=arrived.length-late.length;
  const lateVals=late.map(delay).filter(v=>v!=null);
  const avgLate=lateVals.length?Math.round(lateVals.reduce((x,y)=>x+y,0)/lateVals.length):0;

  setText('ovTotal',arrived.length);
  setText('ovOnTime',arrived.length?`${Math.round(on/arrived.length*100)}%`:'0%');
  setText('ovAvgDelay',fmtDelay(avgLate));
  setText('ovIncidents',scopedI.length);
  const scopedDue=scopedA.filter(due);
  const totalChanges=scopedDue.reduce((s,a)=>s+changeCount(a),0);
  const unloads=scopedDue.map(unloadMinutes).filter(v=>v!=null);
  const avgUnloadAll=unloads.length?Math.round(unloads.reduce((a,b)=>a+b,0)/unloads.length):0;
  setText('ovChanges',totalChanges);
  setText('ovAvgUnload',unloads.length?`${avgUnloadAll} min`:'—');

  const table=document.getElementById('supplierPerformance');
  const q=(document.getElementById('overviewSearch')?.value||'').trim().toLocaleLowerCase('hr-HR');
  const tableRows=(selected?stats.filter(s=>s.name===selected):stats).filter(s=>!q||s.name.toLocaleLowerCase('hr-HR').includes(q));
  if(table){
    table.innerHTML=tableRows.length?tableRows.map(s=>`<tr data-master-supplier="${esc(s.name)}" style="cursor:pointer">
      <td><strong>${esc(s.name)}</strong></td>
      <td>${s.arrived}</td><td>${s.on}</td><td>${s.late}</td><td>${s.avgLate?fmtDelay(s.avgLate):'—'}</td>
      <td>${s.avgUnload==null?'—':s.avgUnload+' min'}</td><td>${s.incidents}</td>
      <td><span class="score ${s.reliability==null?'mid':scoreClass(s.reliability)}" style="${s.reliability==null?'':`border-color:${scoreColor(s.reliability)};color:${scoreColor(s.reliability)}`}">${s.score10==null?'—':s.score10+'/10'} · ${s.reliability==null?'—':s.reliability+'%'}</span></td>
    </tr>`).join(''):'<tr><td colspan="8"><div class="overview-empty">Nema dobavljača.</div></td></tr>';
    table.querySelectorAll('[data-master-supplier]').forEach(tr=>tr.onclick=()=>{select.value=tr.dataset.masterSupplier;render()});
  }
  setText('overviewSupplierCount',`${tableRows.length} dobavljača`);

  /* TOP 10 uses the exact same reliability model as the table and 2D/3D chart. */
  function rankMarkup(rows){
    if(!rows.length)return '<div class="overview-empty">Nema evaluiranih dobavljača.</div>';
    return rows.map((x,i)=>{
      const r=Math.max(0,Math.min(100,Number(x.reliability)||0));
      const c=scoreColor(r);
      return `<div class="ranking-row" data-master-rank="${esc(x.name)}" style="cursor:pointer">
        <div class="ranking-pos">${i+1}</div>
        <div class="ranking-name"><strong>${esc(x.name)}</strong><small>${x.evaluated} obrađeno · ${x.on}/${x.arrived} na vrijeme</small></div>
        <div class="ranking-track"><div class="ranking-fill" style="width:${Math.max(2,r)}%;background:${c}"></div></div>
        <div class="ranking-score" style="color:${c}">${r}% · ${x.score10}/10</div>
      </div>`;
    }).join('');
  }
  const ratedStats=stats.filter(x=>x.reliability!=null&&x.evaluated>0);
  const bestRows=[...ratedStats].sort((a,b)=>b.reliability-a.reliability||b.evaluated-a.evaluated||a.name.localeCompare(b.name,'hr')).slice(0,10);
  const worstRows=[...ratedStats].sort((a,b)=>a.reliability-b.reliability||b.evaluated-a.evaluated||a.name.localeCompare(b.name,'hr')).slice(0,10);
  const best=document.getElementById('overviewBest10');
  const worst=document.getElementById('overviewWorst10');
  if(best)best.innerHTML=rankMarkup(bestRows);
  if(worst)worst.innerHTML=rankMarkup(worstRows);
  [best,worst].filter(Boolean).forEach(box=>box.querySelectorAll('[data-master-rank]').forEach(el=>{
    el.onclick=()=>{select.value=el.dataset.masterRank;render()};
  }));

  const chart=document.getElementById('overviewSupplierChart');
  if(chart){
    const chartRows=(selected?stats.filter(s=>s.name===selected):stats.slice())
      .sort((a,b)=>{
        const ar=a.reliability==null?101:a.reliability;
        const br=b.reliability==null?101:b.reliability;
        return ar-br || a.name.localeCompare(b.name,'hr');
      });
    chart.innerHTML=chartRows.length?chartRows.map(s=>{
      const r=s.reliability==null?0:s.reliability;
      const color=scoreColor(r);
      return `<div class="overview-chart-col ${selected===s.name?'selected':''}" data-master-chart="${esc(s.name)}" title="${esc(s.name)} · ${s.reliability==null?'bez ocjene':s.reliability+'%'}">
        <div class="overview-chart-value" style="color:${s.reliability==null?'#80909a':color}">${s.reliability==null?'—':s.reliability+'%'}</div>
        <div class="overview-chart-bar-wrap">
          <div class="overview-chart-bar" style="height:${s.reliability==null?3:Math.max(3,r)}%;background:${s.reliability==null?'#465159':color};box-shadow:0 0 12px color-mix(in srgb, ${s.reliability==null?'#465159':color} 35%, transparent)"></div>
        </div>
        <div class="overview-chart-name">${esc(s.name)}<br><span>${s.evaluated} obrađeno · ${s.score10==null?'—':s.score10+'/10'}</span></div>
      </div>`;
    }).join(''):'<div class="overview-empty">Nema dobavljača.</div>';
    chart.querySelectorAll('[data-master-chart]').forEach(el=>el.onclick=()=>{select.value=el.dataset.masterChart;render()});
  }

  const detail=document.getElementById('overviewSupplierDetail');
  if(detail){
    if(!selected){
      detail.innerHTML='<div class="overview-empty">Odaberi dobavljača iz dropdowna za njegov kompletan profil.</div>';
    }else if(!chosen){
      detail.innerHTML='<div class="overview-empty">Dobavljač nije pronađen.</div>';
    }else{
      const recent=chosen.data.slice().sort((a,b)=>(String(b.date||'')+String(b.time||'')).localeCompare(String(a.date||'')+String(a.time||''))).slice(0,10);
      detail.innerHTML=`<div class="supplier-detail-head">
        <div><h2>${esc(chosen.name)}</h2><p>${chosen.data.length} ukupnih najava u odabranom skladištu/lokaciji</p></div>
        <div class="ov-master-scoreline">
          <div><small>SCORE</small><div class="ov-master-score10">${chosen.score10==null?'—':chosen.score10+'/10'}</div></div>
          <div><small>POUZDANOST</small><div class="ov-master-reliability">${chosen.reliability==null?'—':chosen.reliability+'%'}</div></div>
        </div>
      </div>
      ${chosen.reliability==null?'<div class="ov-master-empty">Dobavljač je u master listi, ali još nema završene/dospjele operativne evidencije za izračun Scorea i Pouzdanosti.</div>':''}
      <div class="ov-master-summary">
        <div class="ov-master-kpi"><small>OBRAĐENE ISPORUKE</small><strong>${chosen.evaluated}</strong></div>
        <div class="ov-master-kpi"><small>STVARNI DOLASCI</small><strong>${chosen.arrived}</strong></div>
        <div class="ov-master-kpi"><small>NA VRIJEME</small><strong>${chosen.on}</strong></div>
        <div class="ov-master-kpi"><small>TOČNOST</small><strong>${chosen.punctuality==null?'—':chosen.punctuality+'%'}</strong></div>
        <div class="ov-master-kpi"><small>KAŠNJENJA</small><strong>${chosen.late}</strong></div>
        <div class="ov-master-kpi"><small>AVG KAŠNJENJE</small><strong>${chosen.avgLate?fmtDelay(chosen.avgLate):'—'}</strong></div>
        <div class="ov-master-kpi"><small>INCIDENTI</small><strong>${chosen.incidents}</strong></div>
        <div class="ov-master-kpi"><small>NO-SHOW</small><strong>${chosen.noShow}</strong></div>
        <div class="ov-master-kpi"><small>ODBIJENO</small><strong>${chosen.rejected}</strong></div>
        <div class="ov-master-kpi"><small>ZAPRIMLJENO</small><strong>${chosen.received}</strong></div>
        <div class="ov-master-kpi"><small>NENAJAVLJENI</small><strong>${chosen.unannounced}</strong></div>
        <div class="ov-master-kpi"><small>PROMJENE TERMINA</small><strong>${chosen.changes}</strong></div>
        <div class="ov-master-kpi"><small>PROSJEČNO VRIJEME ISKRCAJA</small><strong>${chosen.avgUnload==null?'—':chosen.avgUnload+' min'}</strong></div>
        <div class="ov-master-kpi"><small>PALETE</small><strong>${chosen.pallets}</strong></div>
      </div>
      <div class="supplier-detail-box"><h3>ZADNJIH 10 NAJAVA</h3>
        ${recent.length?recent.map(a=>`<div class="supplier-history-row"><span>${esc(a.date||'—')} ${esc(a.time||'')}</span><strong>${esc(a.warehouse||'—')} · R${esc(a.dock||'—')}</strong><span>${Number(a.pallets||0)} pal.</span><span>${esc(stat(a))}</span></div>`).join(''):'<div class="overview-empty">Nema povijesti za ovog dobavljača.</div>'}
      </div>`;
    }
  }
}

const select=document.getElementById('overviewSupplierSelect');
if(select)select.addEventListener('change',render);
document.getElementById('overviewSearch')?.addEventListener('input',render);
document.addEventListener('click',e=>{
  if(e.target.closest('[data-view="overview"],[data-home-target="overview"]'))setTimeout(render,50);
},true);
window.addEventListener('load',()=>setTimeout(render,700));
function currentStats(){
  const A=arr().filter(visibleByWarehouse);
  const I=inc().filter(visibleByWarehouse);
  const N=[...new Set([
    ...A.map(a=>a?.supplier),
    ...I.map(i=>i?.supplier)
  ].filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b,'hr'));
  return N.map(n=>supplierStat(n,A,I));
}
window.YardivoOverviewMaster={
  render,
  allSupplierNames:supplierNames,
  supplierStat,
  currentStats,
  scoreColor
};
})();
