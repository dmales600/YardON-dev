
(function(){
'use strict';
if(window.__YARDIVO_INVENTORY_SUPPLIER_ACTIONS_FIX_20260923__)return;
window.__YARDIVO_INVENTORY_SUPPLIER_ACTIONS_FIX_20260923__=true;

let activePlannerId='';

function role(){
  try{
    const s=window.currentSession||{};
    return String(s.app_role||s.role||'').toLowerCase().trim();
  }catch(_){return''}
}
function allowed(){return ['inventory','admin','manager'].includes(role())}
function rows(){
  try{return window.YardivoSupplierPlannerV580?.getRows?.()||[]}catch(_){return[]}
}
async function rowById(id){
  let x=rows().find(r=>String(r.id)===String(id))||null;
  if(x)return x;
  try{
    const all=await window.YardivoSupplierLiveSync?.call?.('list_internal');
    x=(Array.isArray(all)?all:[]).find(r=>String(r.id)===String(id))||null;
  }catch(_){}
  return x;
}
function err(e){
  if(!e)return'Nepoznata greška';
  if(typeof e==='string')return e;
  return e?.message||e?.error?.message||String(e);
}
function actor(){
  try{return window.YardivoRescheduleAudit?.actorLabel?.()||String(window.currentSession?.username||window.currentSession?.user||'Upravljanje zalihama')}catch(_){return'Upravljanje zalihama'}
}
function closeContext(){
  document.getElementById('yardivoSupplierContextMenuV583')?.classList.remove('open');
}
function closePlanner(){
  document.getElementById('ysrPlannerOverlay')?.classList.remove('open');
  activePlannerId='';
}
async function refresh(id,status){
  try{await window.YardivoSupplierLiveSync?.pullInternal?.()}catch(_){}
  try{await window.YardivoSupplierPlannerV580?.refresh?.(true)}catch(_){}
  try{await window.YardivoSupplierRequests?.load?.()}catch(_){}
  try{window.dispatchEvent(new CustomEvent('yardivo:supplier-request-updated',{detail:{id,status,source:'inventory-actions-fix'}}))}catch(_){}
  try{window.dispatchEvent(new CustomEvent('yardivo:supplier-canonical-updated',{detail:{id}}))}catch(_){}
}
async function approve(id,confirmFirst){
  if(!allowed())return;
  const x=await rowById(id);
  if(!x)return alert('Supplier najava nije pronađena.');
  const st=String(x.status||'').toLowerCase();
  if(!['pending','revision_requested','proposal_sent'].includes(st))return alert('Najava više ne čeka potvrdu.');
  const date=String(x.delivery_date||''),time=String(x.requested_time||'').slice(0,5);
  if(!date||!time)return alert('Najava nema potpun datum ili termin.');
  if(confirmFirst&&!confirm('Odobriti termin '+date+' · '+time+'?\n\nRampa će se dodijeliti interno u YardOnu.'))return;
  try{
    await window.YardivoSupplierLiveSync.call('internal_update',{
      id:x.id,status:'confirmed',
      review_note:'Najavu i termin potvrdio: '+actor()+'. Rampa se dodjeljuje interno u YardOnu prema operativnom planu.'
    });
    closePlanner();closeContext();
    await refresh(x.id,'confirmed');
    try{if(typeof showYmsToast==='function')showYmsToast('success','TERMIN POTVRĐEN','Najava je aktivna. YardOn će planirati rampu interno.',4200)}catch(_){}
  }catch(e){alert('Najavu nije moguće potvrditi:\n'+err(e))}
}
async function reject(id){
  if(!allowed())return;
  const x=await rowById(id);
  if(!x)return alert('Supplier najava nije pronađena.');
  const note=prompt('Razlog odbijanja zahtjeva:','');
  if(note===null)return;
  if(!String(note).trim())return alert('Upiši razlog odbijanja.');
  if(!confirm('Potvrditi odbijanje Supplier zahtjeva?'))return;
  try{
    await window.YardivoSupplierLiveSync.call('internal_update',{id:x.id,status:'rejected',review_note:String(note).trim()});
    closePlanner();closeContext();
    await refresh(x.id,'rejected');
  }catch(e){alert('Odbijanje nije uspjelo:\n'+err(e))}
}
async function openPlan(id){
  if(!allowed())return;
  const x=await rowById(id);
  if(!x)return alert('Supplier najava nije pronađena.');
  activePlannerId=String(x.id);
  closeContext();
  const api=window.YardivoSupplierPlannerV580;
  if(!api?.open)return alert('YARDIVO planer termina nije dostupan.');
  api.open(x);
}
function plannerValues(x){
  const selected=document.querySelector('#ysrPlannerOverlay .ysrp-day.sel');
  const date=String(selected?.dataset?.ysrpDay||x?.delivery_date||'');
  const time=String(document.getElementById('ysrpTime')?.value||'').slice(0,5);
  return {date,time};
}
async function sendProposal(){
  if(!allowed())return;
  const x=await rowById(activePlannerId);
  if(!x)return alert('Supplier najava nije pronađena.');
  const v=plannerValues(x);
  if(!v.date||!v.time)return alert('Odaberi datum i termin.');
  try{
    await window.YardivoSupplierLiveSync.call('internal_update',{
      id:x.id,delivery_date:v.date,requested_time:v.time,status:'proposal_sent',
      proposed_date:v.date,proposed_time:v.time,proposed_dock:null,
      review_note:'Promjenu termina inicirao: '+actor()+'. Dobavljač treba prihvatiti ili zatražiti drugi termin. Rampa se ne rezervira Supplieru.'
    });
    closePlanner();closeContext();
    await refresh(x.id,'proposal_sent');
    try{if(typeof showYmsToast==='function')showYmsToast('success','PRIJEDLOG POSLAN','Novi termin je poslan dobavljaču. Rampa se planira interno.',3600)}catch(_){}
  }catch(e){alert('Prijedlog nije poslan:\n'+err(e))}
}

window.addEventListener('click',function(e){
  const t=e.target;
  if(!t?.closest)return;

  const approveBtn=t.closest('[data-v583-approve-request]');
  const planBtn=t.closest('[data-v580-plan]');
  const rejectBtn=t.closest('[data-v580-reject]');
  const wantedBtn=t.closest('#ysrPlannerOverlay [data-ysrp-wanted]');
  const sendBtn=t.closest('#ysrPlannerOverlay [data-ysrp-send]');
  const modalReject=t.closest('#ysrPlannerOverlay [data-ysrp-reject]');

  if(!approveBtn&&!planBtn&&!rejectBtn&&!wantedBtn&&!sendBtn&&!modalReject)return;
  if(!allowed())return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  if(approveBtn){void approve(approveBtn.dataset.v583ApproveRequest,true);return}
  if(planBtn){void openPlan(planBtn.dataset.v580Plan);return}
  if(rejectBtn){void reject(rejectBtn.dataset.v580Reject);return}
  if(wantedBtn){
    if(!activePlannerId)return alert('Supplier najava nije odabrana.');
    void approve(activePlannerId,false);
    return;
  }
  if(sendBtn){void sendProposal();return}
  if(modalReject){
    if(!activePlannerId)return alert('Supplier najava nije odabrana.');
    void reject(activePlannerId);
  }
},true);

window.YARDIVO_DEV_BUILD='20260930-dev-v5.8.3-time-only-supplier-actions';
})();