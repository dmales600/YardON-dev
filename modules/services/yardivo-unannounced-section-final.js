
(function(){
 let filter='PENDING';

 function role(){
   let r='';try{r=String(currentSession?.role||'').toLowerCase().trim()}catch(e){}
   if(r==='zalihe'||r==='upravljanje zalihama')r='inventory';
   if(r==='prijam')r='reception';
   if(r==='porta'||r==='portir')r='gate';
   return r;
 }
 function allowed(){
   const r=role();
   if(r==='manager')return window.yardivoManagerSectionAllowed?.('unannounced')===true;
   return ['admin','inventory','reception','gate'].includes(r);
 }
 function canApprove(){return ['admin','reception'].includes(role())}
 function records(){
   try{return (announcements||[]).filter(a=>a.arrivalType==='UNANNOUNCED').sort((a,b)=>String(b.requestCreatedAt||'').localeCompare(String(a.requestCreatedAt||'')))}catch(e){return []}
 }
 function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

 function updateBadge(){
   // Central badge authority is yardivo-unannounced-location-flicker-fix.
   window.YardivoUnannouncedBadgeV583?.refresh?.();
 }

 function statusLabel(a){
   if(a.approvalStatus==='APPROVED')return ['approved','ODOBRENO'];
   if(a.approvalStatus==='REJECTED')return ['rejected','ODBIJENO'];
   return ['pending','ČEKA ODOBRENJE'];
 }
 function render(){
   const view=document.getElementById('unannounced');
   if(!view)return;
   // A background sync must never change visibility of another page.
   if(!allowed()||(!view.classList.contains('active')&&!view.classList.contains('manager-force-active')))return;
   const all=records();
   const pending=all.filter(a=>a.approvalStatus==='PENDING').length;
   const approved=all.filter(a=>a.approvalStatus==='APPROVED').length;
   const rejected=all.filter(a=>a.approvalStatus==='REJECTED').length;
   document.getElementById('uaKpiPending').textContent=pending;
   document.getElementById('uaKpiApproved').textContent=approved;
   document.getElementById('uaKpiRejected').textContent=rejected;
   document.getElementById('uaKpiTotal').textContent=all.length;

   const q=(document.getElementById('uaSearch')?.value||'').trim().toLocaleLowerCase('hr-HR');
   let data=all.filter(a=>filter==='ALL'||a.approvalStatus===filter);
   if(q)data=data.filter(a=>[a.supplier,a.plannedPlate,a.plannedDriver,a.warehouse,a.unannouncedReason,a.unannouncedDocument,a.approvalRequestedBy].some(v=>String(v||'').toLocaleLowerCase('hr-HR').includes(q)));

   const host=document.getElementById('unannouncedSectionList');
   if(!host)return;
   host.innerHTML=data.length?data.map(a=>{
      const [cls,label]=statusLabel(a);
      const when=a.requestCreatedAt?new Date(a.requestCreatedAt).toLocaleString('hr-HR'):'—';
      const decision=a.approvalStatus==='APPROVED'
        ? `Odobrio: ${esc(a.approvedBy||'—')} · ${a.approvedAt?new Date(a.approvedAt).toLocaleString('hr-HR'):'—'}`
        : a.approvalStatus==='REJECTED'
          ? `Odbio: ${esc(a.approvalRejectedBy||'—')} · ${a.approvalRejectedAt?new Date(a.approvalRejectedAt).toLocaleString('hr-HR'):'—'}`
          : 'Čeka odluku';
      return `<div class="unannounced-request ${cls}">
        <div class="unannounced-request-head">
          <div>
            <strong>${esc(a.supplier||'—')} · ${esc(a.plannedPlate||'—')}</strong>
            <div class="meta">
              ${esc(a.warehouse||'—')} · Vozač: ${esc(a.plannedDriver||'—')}<br>
              Razlog: ${esc(a.unannouncedReason||'—')}${a.unannouncedDocument?` · Dokument: ${esc(a.unannouncedDocument)}`:''}<br>
              Zahtjev: ${when} · Porta: ${esc(a.approvalRequestedBy||'—')}<br>
              ${decision}
              ${a.approvalRejectionReason?`<br>Razlog odbijanja: ${esc(a.approvalRejectionReason)}`:''}
              ${a.unannouncedNote?`<br>Napomena: ${esc(a.unannouncedNote)}`:''}
            </div>
          </div>
          <span class="unannounced-badge ${cls}">${label}</span>
        </div>
        ${canApprove()&&a.approvalStatus==='PENDING'?`
          <div class="ua-request-actions">
            <button class="unannounced-approve" onclick="YardivoUnannounced.approve(${a.id});setTimeout(()=>YardivoUnannouncedSection.render(),50)">ODOBRI ULAZ</button>
            <button class="unannounced-reject" onclick="document.getElementById('uaSectionReject_${a.id}').classList.toggle('show')">ODBIJ</button>
          </div>
          <div class="unannounced-reject-box" id="uaSectionReject_${a.id}">
            <input id="uaRejectReason_${a.id}" placeholder="Razlog odbijanja...">
            <button class="unannounced-reject" onclick="YardivoUnannounced.reject(${a.id});setTimeout(()=>YardivoUnannouncedSection.render(),50)">POTVRDI ODBIJANJE</button>
          </div>`:''}
      </div>`;
   }).join(''):'<div class="ua-empty">Nema zapisa za odabrani filter.</div>';
   updateBadge();
 }

 document.addEventListener('click',e=>{
   const tab=e.target.closest('[data-ua-filter]');
   if(tab){
     filter=tab.dataset.uaFilter;
     document.querySelectorAll('[data-ua-filter]').forEach(b=>b.classList.toggle('active',b===tab));
     render();
   }
   if(e.target.closest('[data-view="unannounced"],[data-home-target="unannounced"]'))setTimeout(render,20);
 },true);
 document.getElementById('uaSearch')?.addEventListener('input',render);

 // Home menu card for allowed roles.
 function homeCard(){
   const grid=document.getElementById('homeMenuGrid');
   if(!grid||!allowed())return;
   let card=grid.querySelector('[data-home-target="unannounced"]');
   if(!card){
     card=document.createElement('button');
     card.type='button';
     card.className='home-menu-card';
     card.dataset.homeTarget='unannounced';
     card.innerHTML='<div class="home-menu-icon">⚠</div><h3>Nenajavljeni dolasci</h3><p>Pregled zahtjeva za kamione bez najave.</p><div class="home-menu-open">OTVORI →</div>';
     grid.appendChild(card);
   }
 }

 function refreshOwned(){
   homeCard();updateBadge();render();
 }
 ['yardivo:login','yardivo:data-synced','yardivo:master-data-changed','yardivo:context-changed','yardivo:zero-state-ready']
   .forEach(ev=>window.addEventListener(ev,()=>requestAnimationFrame(refreshOwned)));
 window.addEventListener('load',()=>setTimeout(refreshOwned,350),{once:true});

 window.YardivoUnannouncedSection={render,updateBadge};
})();
