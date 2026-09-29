
(()=>{
'use strict';
let timer=null,lastSig='';
const role=()=>{let r=String(window.currentSession?.app_role||window.currentSession?.role||document.body?.dataset?.yardivoRole||'').toLowerCase().trim();if(r==='management'||r==='voditelj')r='manager';return r};
const isAdmin=()=>role()==='admin';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function fmt(v){try{return new Intl.DateTimeFormat('hr-HR',{hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch(_){return''}}
function ensureHost(){let h=document.getElementById('yardivoHelpChatPopupStack');if(!h){h=document.createElement('div');h.id='yardivoHelpChatPopupStack';h.setAttribute('aria-live','polite');h.setAttribute('aria-label','Nove Help Chat poruke');document.body.appendChild(h)}return h}
async function invoke(action,payload={}){const c=await window.YardivoAuth?.client?.();if(!c)throw new Error('Auth nije spreman');const {data,error}=await c.functions.invoke('yardivo-help-chat',{body:{action,...payload}});if(error)throw error;if(data?.ok===false||data?.error)throw new Error(data?.error||'Help Chat greška');return data?.data??data}
function render(rows){const h=ensureHost();const unread=(Array.isArray(rows)?rows:[]).filter(x=>Number(x?.unread||0)>0);const sig=unread.map(x=>`${x.thread_user_id}:${x.unread}:${x.last_at||''}`).join('|');if(sig===lastSig)return;lastSig=sig;if(!isAdmin()){h.replaceChildren();return}h.innerHTML=unread.map(t=>{const name=String(t.thread_username||'korisnik');const initial=(name.trim()[0]||'?').toUpperCase();return `<button type="button" class="yhc-pop" data-yhc-pop-thread="${esc(t.thread_user_id)}" title="Otvori Help Chat s ${esc(name)}"><span class="yhc-pop-avatar">${esc(initial)}</span><span class="yhc-pop-copy"><strong>${esc(name)}</strong><small>HELP CHAT · NOVA PORUKA</small><p>${esc(t.last_message||'Nova poruka')}</p></span><span><span class="yhc-pop-badge">${Number(t.unread||0)}</span><span class="yhc-pop-time">${esc(fmt(t.last_at))}</span></span></button>`}).join('')}
async function poll(){if(!isAdmin()){render([]);return}try{const rows=await invoke('list_threads');render(rows)}catch(_){}}
function openThread(id){if(!id)return;window.YardivoHelpChatV583?.openThread?.(id);setTimeout(poll,700)}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-yhc-pop-thread]');if(!b)return;e.preventDefault();e.stopPropagation();openThread(b.dataset.yhcPopThread)},true);
window.addEventListener('yardivo:logout',()=>{lastSig='';render([])});
window.addEventListener('yardivo:online-ready',()=>{lastSig='';poll()});
setTimeout(()=>{poll();clearInterval(timer);timer=setInterval(poll,900000)},2200);
window.YardivoHelpChatAdminPopupsV583={refresh:poll};
})();
