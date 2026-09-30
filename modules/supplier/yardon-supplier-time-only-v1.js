(()=>{'use strict';
if(window.__YARDON_SUPPLIER_TIME_ONLY_V1__)return;
window.__YARDON_SUPPLIER_TIME_ONLY_V1__=true;

const $=id=>document.getElementById(id);
function role(){let r=String(window.currentSession?.app_role||window.currentSession?.role||document.body?.dataset?.yardivoRole||'').toLowerCase().trim();if(r==='zalihe'||r.includes('zalih'))r='inventory';if(r==='prijam')r='reception';if(r==='voditelj'||r==='management')r='manager';return r}
function supplierLang(){try{const s=window.currentSession||{},k='yardivo_supplier_language_v549_'+String(s.authUserId||s.username||s.user||'supplier');return localStorage.getItem(k)==='en'?'en':'hr'}catch(_){return'hr'}}
const text={
 hr:{note:'Dobavljač bira samo termin. YardOn interno planira rampu i konačno je dodjeljuje prema stvarnom stanju pri dolasku.',qty:'Broj paleta određuje procijenjeno trajanje prijama i zauzeće kapaciteta termina.',capacity:'KAPACITET',date:'Željeni datum (YYYY-MM-DD), ostavite prazno ako se ne mijenja:',time:'Željeni termin (HH:MM), ostavite prazno ako se ne mijenja:',notePrompt:'Napomena za Upravljanje zalihama:',sent:'Zahtjev za promjenu termina je poslan. Rampa se ne rezervira unaprijed.',failed:'Zahtjev nije poslan',confirmResolve:'Potvrditi zahtjev dobavljača za promjenu termina?',resolved:'PROMJENA TERMINA RIJEŠENA'},
 en:{note:'The supplier selects the appointment time only. YardOn plans the dock internally and makes the final assignment from live yard conditions on arrival.',qty:'Pallet quantity determines the estimated receiving duration and appointment-capacity usage.',capacity:'CAPACITY',date:'Requested date (YYYY-MM-DD), leave blank if unchanged:',time:'Requested time (HH:MM), leave blank if unchanged:',notePrompt:'Note for Inventory Management:',sent:'Appointment change request sent. A physical dock is not reserved in advance.',failed:'Request was not sent',confirmResolve:'Confirm the supplier appointment-change request?',resolved:'APPOINTMENT CHANGE RESOLVED'}
};
const tr=k=>text[supplierLang()]?.[k]||text.hr[k]||k;

function ensureStyle(){
 if($('yardonSupplierTimeOnlyStyle'))return;
 const s=document.createElement('style');s.id='yardonSupplierTimeOnlyStyle';s.textContent=`
 #yardivoSupplierPortal .yardon-time-only-note{margin:10px 0 4px;padding:10px 12px;border:1px solid rgba(59,130,246,.25);border-radius:10px;background:rgba(59,130,246,.07);font-size:10px;line-height:1.5;color:inherit}
 #yardivoSupplierPortal .sbn-grid th.ramp{min-width:90px}
 #ysrPlannerOverlay .yardon-time-only-planner-note{margin:8px 0 0;padding:9px 11px;border-radius:9px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.23);font-size:10px}
 #ysrPlannerOverlay .ysrp-field:has(#ysrpDock){display:none!important}
 `;document.head.appendChild(s);
}
function replaceExact(root,from,to){root?.querySelectorAll('p,small,span,strong,label,th').forEach(el=>{if(el.children.length)return;if(String(el.textContent||'').trim()===from)el.textContent=to})}
function decorateSupplier(){
 const p=$('yardivoSupplierPortal');if(!p||role()!=='supplier')return;
 ensureStyle();
 const mapStep=$('sbnMapStep');
 if(mapStep&&!$('yardonSupplierTimeOnlyNote')){
   const n=document.createElement('div');n.id='yardonSupplierTimeOnlyNote';n.className='yardon-time-only-note';n.textContent=tr('note');
   const map=$('sbnMap');(map||mapStep.firstElementChild)?.insertAdjacentElement('beforebegin',n);
 }
 const note=$('yardonSupplierTimeOnlyNote');if(note)note.textContent=tr('note');
 replaceExact(p,'Broj paleta određuje koliko dugo rampa mora biti rezervirana.',tr('qty'));
 replaceExact(p,'Pallet quantity determines the required dock reservation time.',tr('qty'));
 p.querySelectorAll('#sbnMap .sbn-grid thead th:first-child').forEach(x=>x.textContent=tr('capacity'));
 p.querySelectorAll('#sbnMap .sbn-grid tbody th.ramp').forEach(x=>{if(/TERMIN|RAMPA|DOCK|CAPACITY|KAPACITET/i.test(x.textContent||''))x.textContent=tr('capacity')});
 p.querySelectorAll('th').forEach(x=>{const v=String(x.textContent||'').trim().toUpperCase();if(v==='RAMPA'||v==='DOCK')x.textContent=supplierLang()==='en'?'DOCK · ASSIGNED ON ARRIVAL':'RAMPA · DODJELA PO DOLASKU'});
}
function decoratePlanner(){
 const o=$('ysrPlannerOverlay');if(!o)return;
 ensureStyle();
 const sub=o.querySelector('.ysrp-head p');if(sub)sub.textContent='Upravljanje zalihama · odabir datuma i termina prema ukupnom kapacitetu skladišta';
 const card=o.querySelector('.ysrp-card:nth-child(2)');
 if(card&&!o.querySelector('.yardon-time-only-planner-note')){const n=document.createElement('div');n.className='yardon-time-only-planner-note';n.textContent='Supplieru se predlaže samo termin. Prikaz rampe, ako se pojavi u preporuci, služi samo kao interni predplan YardOna.';card.querySelector('h3')?.insertAdjacentElement('afterend',n)}
}

async function supplierReschedule(id){
 const rows=window.YardivoSupplierHistoryStatusServerV583?.rows?.()||[],x=rows.find(r=>String(r.id)===String(id));if(!x)return;
 const d=prompt(tr('date'),x.date||'');if(d===null)return;
 const t=prompt(tr('time'),x.time||'');if(t===null)return;
 const note=prompt(tr('notePrompt'),'');if(note===null)return;
 try{
   await window.YardivoSupplierService?.deliveries?.('supplier_reschedule_request',{client_id:id,proposed_date:d.trim()||null,proposed_time:t.trim()||null,proposed_dock:null,note:note.trim()});
   alert(tr('sent'));await window.YardivoSupplierHistoryStatusServerV583?.pull?.(true);
 }catch(e){alert(tr('failed')+': '+String(e?.message||e))}
}
async function resolveTimeRequest(btn,row){
 const id=btn.dataset.v583ResolveSelfRequest,decision=btn.dataset.decision||'reject';
 if(!confirm(tr('confirmResolve')))return;
 btn.disabled=true;
 try{
   await window.YardivoSupplierService?.deliveries?.('internal_resolve_supplier_request',{id,decision,request_type:'reschedule_requested'});
   try{await window.YardivoSupplierLiveSync?.pullInternal?.(true)}catch(_){}
   window.dispatchEvent(new CustomEvent('yardivo:supplier-request-updated',{detail:{id,source:'time-only-reschedule-review'}}));
   try{window.showYmsToast?.('success',tr('resolved'),row?.supplier_name||row?.supplier_username||'Dobavljač')}catch(_){}
   window.YardivoSupplierContextActionsV583?.close?.();
 }catch(e){alert('Zahtjev nije moguće riješiti:\n'+String(e?.message||e))}finally{btn.disabled=false}
}

window.addEventListener('click',e=>{
 const rs=e.target?.closest?.('[data-ysp-self-reschedule]');
 if(rs&&role()==='supplier'){
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void supplierReschedule(rs.dataset.yspSelfReschedule);return;
 }
 const resolve=e.target?.closest?.('[data-v583-resolve-self-request]');
 if(resolve&&['admin','inventory'].includes(role())){
   const id=resolve.dataset.v583ResolveSelfRequest,row=window.YardivoSupplierContextActionsV583?.rowById?.(id);
   if(String(row?.status||'').toLowerCase()==='reschedule_requested'){
     e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void resolveTimeRequest(resolve,row);return;
   }
 }
},true);

const mo=new MutationObserver(()=>{decorateSupplier();decoratePlanner()});
function boot(){ensureStyle();decorateSupplier();decoratePlanner();try{mo.observe(document.body,{subtree:true,childList:true})}catch(_){}}
window.addEventListener('yardivo:login',()=>setTimeout(boot,120));
window.addEventListener('yardivo:supplier-mine-rows',()=>setTimeout(decorateSupplier,40));
window.addEventListener('load',()=>setTimeout(boot,250),{once:true});
setTimeout(boot,80);
window.YardOnSupplierTimeOnlyV1={decorate:decorateSupplier,bookingMode:'TIME_ONLY'};
})();