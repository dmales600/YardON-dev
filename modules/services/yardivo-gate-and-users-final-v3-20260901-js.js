
(function(){
'use strict';

const GATE_ALLOWED=new Set(['homeMenu','checkin','unannounced','myYard','docks']);

function normRole(r){
  r=String(r||'').toLowerCase().trim();
  if(r==='porta'||r==='portir')return'gate';
  if(r==='prijam')return'reception';
  if(r==='zalihe'||r.includes('zalih'))return'inventory';
  return r;
}
function role(){
  try{return normRole(window.currentSession?.role||currentSession?.role)}catch(_){return''}
}
function gate(){return role()==='gate'}

function syncGate(){
  if(!gate())return;
  document.body.dataset.yardivoRole='gate';
  document.documentElement.dataset.yardivoRole='gate';

  /* Existing matrices are patched statically above. This function only normalizes
     the final DOM state; it does not run a competing hide/show loop. */
  document.querySelectorAll('[data-view]').forEach(el=>{
    const v=el.dataset.view||'';
    const ok=GATE_ALLOWED.has(v);
    el.classList.toggle('role-hidden',!ok);
    if(ok){
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.removeAttribute('hidden');
      el.removeAttribute('aria-disabled');
    }
  });
  document.querySelectorAll('[data-home-target]').forEach(el=>{
    const v=el.dataset.homeTarget||'';
    const ok=GATE_ALLOWED.has(v);
    if(ok){
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.removeAttribute('hidden');
      el.removeAttribute('aria-disabled');
    }
  });

  const panel=document.getElementById('uaGateCreatePanel');
  if(panel)panel.style.setProperty('display','block','important');
}

function enterGateView(view){
  if(!gate()||!GATE_ALLOWED.has(view))return false;
  syncGate();
  try{
    if(window.YardivoRoleStableFinal?.open){
      const ok=window.YardivoRoleStableFinal.open(view);
      if(ok===false)return false;
    }else{
      const ok=window.openAppView?.(view);
      if(ok===false)return false;
      /* Fallback must still publish the canonical view transition. */
      document.querySelectorAll('.view').forEach(v=>{
        const on=v.id===view;
        v.classList.toggle('active',on);
        v.style.setProperty('display',on?'block':'none','important');
        v.setAttribute('aria-hidden',on?'false':'true');
      });
      document.body.classList.toggle('home-menu-mode',view==='homeMenu');
      try{window.dispatchEvent(new CustomEvent('yardivo:view-opened',{detail:{view,role:'gate'}}))}catch(_){}
    }
  }catch(e){
    console.error('YARDIVO Gate navigation',e);
    return false;
  }
  if(view==='unannounced'){
    setTimeout(()=>{
      try{window.YardivoUnannouncedGateV2?.populateForm?.()}catch(_){}
      try{window.YardivoUnannouncedSection?.render?.()}catch(_){}
      try{window.renderUnannouncedComplete?.()}catch(_){}
    },0);
  }
  if(view==='myYard'){
    setTimeout(()=>{
      try{window.YardivoMyYardMode?.set?.(window.YardivoMyYardMode.current?.()||'3d')}catch(_){}
      try{window.YardivoMyYardWebGL?.boot?.()}catch(_){}
      try{window.YardivoMyYardWebGL?.refresh?.()}catch(_){}
      try{window.__YARDIVO_MYYARD_ENGINE__?.resize?.()}catch(_){}
    },20);
  }
  return true;
}

/* Gate-click owner is intentionally narrow: only these five destinations. */
document.addEventListener('click',e=>{
  if(!gate())return;
  const el=e.target.closest?.('[data-view],[data-home-target]');
  if(!el)return;
  const v=el.dataset.view||el.dataset.homeTarget||'';
  if(!GATE_ALLOWED.has(v))return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  enterGateView(v);
},true);

/* Dedicated Gate create button remains writable. */
document.addEventListener('click',e=>{
  if(!gate()||!e.target.closest?.('#uaGateSubmit'))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  try{window.YardivoUnannouncedGateV2?.create?.()}catch(err){
    console.error(err);alert('Nenajavljeni dolazak nije spremljen.');
  }
},true);

/* ===== SERVER-AUTHORITATIVE USER PROFILES ===== */
function admin(){return role()==='admin'}
async function invokeUsers(action,payload={}){
  const c=await window.YardivoAuth.client();
  const {data,error}=await c.functions.invoke('yardivo-admin-users',{body:{action,...payload}});
  if(error)throw error;
  if(data?.error)throw new Error(data.error);
  if(data && Object.prototype.hasOwnProperty.call(data,'data'))return data.data;
  return data||{};
}
window.YardivoAdminUsersServerV583=window.YardivoAdminUsersServerV583||{};
window.YardivoAdminUsersServerV583.invoke=invokeUsers;

function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function roleLabel(r){return ({admin:'Admin',manager:'Voditelj',inventory:'Upravljanje zalihama',reception:'Prijam',gate:'Porta',supplier:'Dobavljač',auth_orphan:'AUTH BEZ YARDIVO PROFILA'})[normRole(r)]||r||'—'}
function locLabel(l){if(l==='ALL')return 'Sve lokacije';try{const d=JSON.parse(localStorage.getItem('yardivo_master_data_registry_v583')||'{}');const row=(d.locations||[]).find(x=>String(x.id)===String(l));if(row)return row.name||row.id}catch(_){}return l||'—'}

async function renderProfiles(){
  const host=document.getElementById('masterUserList');
  if(!host||!admin())return;
  host.innerHTML='<div class="master-note">Učitavanje profila sa servera…</div>';
  try{
    const res=await invokeUsers('list');
    const users=Array.isArray(res)?res:(Array.isArray(res?.users)?res.users:[]);
    host.innerHTML=
      `<div class="yardivo-profile-list-title"><span>PROFILI NA SERVERU</span><span style="display:flex;align-items:center;gap:8px"><span class="yardivo-profile-count">${users.length}</span><button type="button" class="action danger" id="yardivoDeleteAllNonAdminUsers">BRIŠI SVE KORISNIKE (OSIM ADMINA)</button></span></div>`+
      '<div class="master-user-row"><strong>Korisnik</strong><strong>Rola</strong><strong>Lokacija</strong><strong>Status</strong><strong>Akcije</strong></div>'+
      users.map(u=>`<div class="master-user-row">
        <div><strong>${esc(u.username)}</strong></div>
        <div>${esc(roleLabel(u.app_role))}</div>
        <div>${esc(locLabel(u.location))}</div>
        <div>${u.active?'AKTIVAN':'DEAKTIVIRAN'}</div>
        <div>
          ${u.auth_orphan?`<button class="action danger" data-profile-delete="${esc(u.auth_user_id)}">OBRIŠI AUTH</button>`:`<button class="action" data-profile-toggle="${esc(u.auth_user_id)}" data-active="${u.active?'1':'0'}">${u.active?'DEAKT.':'AKTIV.'}</button> <button class="action" data-profile-password="${esc(u.auth_user_id)}" data-profile-user="${esc(u.username)}">PROMIJENI ŠIFRU</button>${normRole(u.app_role)==='admin'?'':` <button class="action danger" data-profile-delete="${esc(u.auth_user_id)}">OBRIŠI</button>`}`}
        </div>
      </div>`).join('');

    host.querySelectorAll('[data-profile-toggle]').forEach(btn=>{
      btn.onclick=async()=>{
        try{
          await invokeUsers('update',{auth_user_id:btn.dataset.profileToggle,active:btn.dataset.active!=='1'});
          await renderProfiles();
        }catch(e){alert(e.message)}
      };
    });
    host.querySelectorAll('[data-profile-password]').forEach(btn=>{
      btn.onclick=async()=>{
        const username=btn.dataset.profileUser||'korisnik';
        const next=window.prompt(`NOVA ŠIFRA · ${username}\nUpiši novu šifru (najmanje 8 znakova).`);
        if(next===null)return;
        if(String(next).length<8){alert('Šifra mora imati najmanje 8 znakova.');return}
        const again=window.prompt(`POTVRDA ŠIFRE · ${username}\nPonovno upiši novu šifru.`);
        if(again===null)return;
        if(next!==again){alert('Šifre se ne podudaraju.');return}
        if(!confirm(`Promijeniti šifru za korisnika "${username}"?`))return;
        btn.disabled=true;
        try{
          await invokeUsers('password',{auth_user_id:btn.dataset.profilePassword,password:next});
          try{showYmsToast?.('success','ŠIFRA PROMIJENJENA',`Nova šifra je spremljena za ${username}.`)}catch(_){}
          alert(`Šifra za korisnika "${username}" je uspješno promijenjena.`);
        }catch(e){
          alert('Promjena šifre nije uspjela: '+(e?.message||e));
        }finally{
          btn.disabled=false;
        }
      };
    });
    const bulkDelete=document.getElementById('yardivoDeleteAllNonAdminUsers');
    if(bulkDelete){
      bulkDelete.onclick=async()=>{
        const removable=users.filter(u=>normRole(u.app_role)!=='admin'&&u.auth_user_id);
        if(!removable.length){alert('Nema korisnika za brisanje. Admin računi se ne brišu.');return}
        if(!confirm(`TRAJNO OBRISATI ${removable.length} KORISNIKA?\n\nSvi Admin računi ostaju sačuvani.`))return;
        const typed=prompt('Za konačnu potvrdu upiši: BRISI SVE KORISNIKE');
        if(typed===null)return;
        const norm=typed.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        if(norm!=='BRISI SVE KORISNIKE'){alert('Brisanje nije izvršeno.');return}
        bulkDelete.disabled=true;bulkDelete.textContent='BRIŠEM KORISNIKE…';
        let deleted=0,failed=[];
        for(const u of removable){
          try{await invokeUsers('delete',{auth_user_id:u.auth_user_id});deleted++}
          catch(e){failed.push(`${u.username||u.auth_user_id}: ${e?.message||e}`)}
        }
        await renderProfiles();
        if(failed.length){
          alert(`Obrisano: ${deleted}. Neuspjelo: ${failed.length}.\n\n`+failed.join('\n'));
        }else{
          try{showYmsToast?.('success','KORISNICI OBRISANI',`Obrisano ${deleted} korisnika. Admin računi su sačuvani.`)}catch(_){}
          alert(`Obrisano ${deleted} korisnika. Admin računi su ostali sačuvani.`);
        }
      };
    }

    host.querySelectorAll('[data-profile-delete]').forEach(btn=>{
      btn.onclick=async()=>{
        if(!confirm('Trajno obrisati ovaj korisnički profil?'))return;
        try{await invokeUsers('delete',{auth_user_id:btn.dataset.profileDelete});await renderProfiles()}
        catch(e){alert(e.message)}
      };
    });
  }catch(e){
    host.innerHTML=`<div class="master-note warn">Ne mogu učitati profile: ${esc(e.message)}</div>`;
  }
}

let yardivoCreateProfileBusy=false;
async function createProfile(){
  if(yardivoCreateProfileBusy)return;
  if(!admin()){
    alert('Kreiranje korisničkog profila dostupno je samo Adminu. Ako si prijavljen kao Admin, odjavi se i ponovno prijavi.');
    return;
  }
  const username=(document.getElementById('muUser')?.value||'').trim().toLowerCase();
  const password=document.getElementById('muPass')?.value||'';
  const assignedRole=normRole(document.getElementById('muRole')?.value||'');
  const location=document.getElementById('muLocation')?.value||'VG';
  const warehouses=yardivoSelectedInternalUserWarehouses();

  if(!/^[a-z0-9._-]{3,40}$/.test(username)){alert('Username mora imati najmanje 3 znaka.');return}
  if(password.length<8){alert('Password mora imati najmanje 8 znakova.');return}
  if(!['admin','manager','inventory','reception','gate'].includes(assignedRole)){alert('Odaberi valjanu rolu.');return}
  if(assignedRole!=='admin'&&!warehouses.length){alert('Odaberi barem jedno skladište za korisnika.');return}

  try{
    yardivoCreateProfileBusy=true;
    const createBtn=document.getElementById('muSave');
    if(createBtn){createBtn.disabled=true;createBtn.textContent='KREIRAM PROFIL...'}
    await invokeUsers('create',{username,password,role:assignedRole,location,warehouses});
    const u=document.getElementById('muUser'),p=document.getElementById('muPass'),n=document.getElementById('muName');
    if(u)u.value='';if(p)p.value='';if(n)n.value='';
    await renderProfiles();
    try{showYmsToast?.('success','KORISNIK KREIRAN',`${username} · ${roleLabel(assignedRole)}`)}catch(_){}
  }catch(e){
    alert('Kreiranje korisnika nije uspjelo: '+e.message);
  }finally{
    yardivoCreateProfileBusy=false;
    const createBtn=document.getElementById('muSave');
    if(createBtn){createBtn.disabled=false;createBtn.removeAttribute('disabled');createBtn.textContent='KREIRAJ KORISNIČKI PROFIL'}
    try{window.YardivoCreateProfileV548?.sync?.()}catch(_){}
  }
}



function setupUsers(){
  if(!admin())return;
  const roleSelect=document.getElementById('muRole');
  roleSelect?.querySelector('option[value="management"]')?.remove();
  const btn=document.getElementById('muSave');
  if(btn){
    btn.textContent='KREIRAJ KORISNIČKI PROFIL';
    btn.type='button';
    btn.disabled=false;
    btn.removeAttribute('disabled');
  }
  renderProfiles();
}

/* Login role is informational; server profile chooses the real role. */
function setupLoginRole(){
  const s=document.getElementById('loginRole');
  if(!s)return;
  s.title='Rola se potvrđuje automatski prema korisničkom profilu na serveru.';
}

window.addEventListener('load',()=>setTimeout(()=>{syncGate();setupUsers();setupLoginRole()},900),{once:true});
window.addEventListener('yardivo:login',()=>setTimeout(()=>{syncGate();setupUsers()},80));
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-view="settings"],[data-home-target="settings"]'))setTimeout(setupUsers,120);
},true);

window.YardivoGateCanonical={apply:syncGate,open:enterGateView};
window.YardivoServerProfiles={render:renderProfiles,create:createProfile};
})();
