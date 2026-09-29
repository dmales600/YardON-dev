
(function(){
'use strict';

let lastListAt=0,listPromise=null;
const LIST_TTL_MS=60000;
const isAdmin=()=>String(window.currentSession?.role||'').toLowerCase()==='admin';

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

async function invoke(action,payload={}){
  const c=await window.YardivoAuth.client();
  const {data,error}=await c.functions.invoke('yardivo-admin-users',{body:{action,...payload}});
  if(error){
    let detail='';
    try{
      if(error.context){
        const cloned=error.context.clone?.()||error.context;
        const body=await cloned.json();
        detail=body?.error||body?.message||JSON.stringify(body);
      }
    }catch(_){}
    throw new Error(detail||error.message||'Edge Function error');
  }
  if(data?.error)throw new Error(data.error);
  if(data?.ok===false)throw new Error(data?.message||'Akcija nije uspjela.');
  return data?.data??data;
}

async function list(force=false){
  if(!isAdmin())return;
  const body=document.getElementById('ysaSupplierAccountsBody');
  if(!body)return;
  const now=Date.now();
  if(!force && lastListAt && now-lastListAt<LIST_TTL_MS)return;
  if(listPromise)return listPromise;
  body.innerHTML='<tr><td colspan="7"><div class="ysa-empty">Učitavanje...</div></td></tr>';
  listPromise=(async()=>{
  try{
    const rows=await invoke('list');
    lastListAt=Date.now();
    const suppliers=(Array.isArray(rows)?rows:[]).filter(x=>String(x.app_role||'').toLowerCase()==='supplier');
    if(!suppliers.length){
      body.innerHTML='<tr><td colspan="7"><div class="ysa-empty">Još nema kreiranih Supplier accounta.</div></td></tr>';
      return;
    }
    body.innerHTML=suppliers.map(x=>`
      <tr>
        <td><strong>${esc(x.username)}</strong></td>
        <td>${esc(x.supplier_name||'—')}</td>
        <td>${esc(x.contact_name||'—')}<br><small>${esc(x.contact_email||'')}</small></td>
        <td>${esc(x.location||'—')}</td>
        <td>${esc((Array.isArray(x.warehouses)?x.warehouses:[]).join(', ')||'—')}</td>
        <td><span class="pill ${x.active===false?'off':''}">${x.active===false?'NEAKTIVAN':'AKTIVAN'}</span></td>
        <td>
          <div class="actions">
            <button type="button" data-ysp-action="password" data-id="${esc(x.auth_user_id)}" data-user="${esc(x.username)}">PROMIJENI ŠIFRU</button>
            <button type="button" data-ysp-action="toggle" data-id="${esc(x.auth_user_id)}" data-active="${x.active===false?'0':'1'}">${x.active===false?'AKTIVIRAJ':'DEAKTIVIRAJ'}</button>
            <button type="button" class="danger" data-ysp-action="delete" data-id="${esc(x.auth_user_id)}" data-user="${esc(x.username)}">IZBRIŠI</button>
          </div>
        </td>
      </tr>`).join('');
  }catch(e){
    body.innerHTML=`<tr><td colspan="7"><div class="ysa-empty">Greška: ${esc(e.message||e)}</div></td></tr>`;
  }finally{
    listPromise=null;
  }
  })();
  return listPromise;
}

async function changePassword(id,username){
  const pass=prompt(`Nova šifra za Supplier account "${username}":`);
  if(pass===null)return;
  if(String(pass).length<6){alert('Šifra mora imati najmanje 8 znakova.');return}
  try{
    await invoke('password',{auth_user_id:id,password:pass});
    alert('Šifra je uspješno promijenjena.');
  }catch(e){
    alert('Promjena šifre nije uspjela:\n'+(e.message||e));
  }
}

async function toggle(id,active){
  const next=!active;
  try{
    await invoke('update',{auth_user_id:id,active:next});
    await list(true);
  }catch(e){
    alert('Promjena statusa accounta nije uspjela:\n'+(e.message||e));
  }
}

async function remove(id,username){
  if(!confirm(`Trajno izbrisati Supplier account "${username}"?\n\nOva radnja briše account iz YARDIVO pristupa i Supabase Autha.`))return;
  if(!confirm(`Potvrdi još jednom: izbrisati "${username}"?`))return;
  try{
    await invoke('delete',{auth_user_id:id});
    await list(true);
    alert('Supplier account je izbrisan.');
  }catch(e){
    alert('Brisanje Supplier accounta nije uspjelo:\n'+(e.message||e));
  }
}

document.getElementById('ysaRefreshSuppliers')?.addEventListener('click',list);
document.addEventListener('click',e=>{
  const b=e.target.closest?.('#yardivoSupplierAccountsAdmin [data-ysp-action]');
  if(!b)return;
  const id=b.dataset.id||'';
  const action=b.dataset.yspAction;
  if(action==='password')changePassword(id,b.dataset.user||'');
  else if(action==='toggle')toggle(id,b.dataset.active==='1');
  else if(action==='delete')remove(id,b.dataset.user||'');
},true);

window.addEventListener('yardivo:login',()=>{if(isAdmin())setTimeout(()=>list(false),900)});
window.addEventListener('load',()=>{if(isAdmin())setTimeout(()=>list(false),1800)});
window.YardivoSupplierAccountsAdmin={list};
})();
