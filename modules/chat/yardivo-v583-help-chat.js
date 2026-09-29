
(()=>{
'use strict';
const ADMIN='dujemales';
let me=null,threads=[],messages=[],selectedThread='',opened=false,badgeTimer=null,chatTimer=null,busy=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const role=()=>{let r=String(window.currentSession?.app_role||window.currentSession?.role||document.body?.dataset?.yardivoRole||'').toLowerCase().trim();if(r==='management'||r==='voditelj')r='manager';return r};
const admin=()=>role()==='admin';
async function invoke(action,payload={}){const c=await window.YardivoAuth?.client?.();if(!c)throw new Error('YARDIVO Auth nije spreman.');const {data,error}=await c.functions.invoke('yardivo-help-chat',{body:{action,...payload}});if(error)throw error;if(data?.ok===false||data?.error)throw new Error(data?.error||'Help Chat greška.');return data?.data??data}
function fmtTime(v){try{return new Intl.DateTimeFormat('hr-HR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch(_){return''}}
function ensure(){
 if(!document.getElementById('yardivoHelpChatOverlay')){
  const o=document.createElement('div');o.id='yardivoHelpChatOverlay';o.innerHTML=`<section id="yardivoHelpChatPanel" aria-label="YARDIVO Help Chat"><header class="yhc-head"><div class="avatar">Y</div><div class="yhc-head-copy"><strong id="yhcTitle">HELP CHAT</strong><small id="yhcSub">dujemales · Yard Manager</small></div><button type="button" class="yhc-close" data-yhc-close>×</button></header><div class="yhc-main"><aside class="yhc-threads"><div class="yhc-threads-title">RAZGOVORI</div><div id="yhcThreadList"></div></aside><section class="yhc-chat"><div class="yhc-messages" id="yhcMessages"><div class="yhc-empty">Učitavam razgovor…</div></div><div class="yhc-compose"><textarea id="yhcInput" maxlength="2000" placeholder="Napiši poruku adminu…"></textarea><button type="button" id="yhcSend">POŠALJI</button></div></section></div></section>`;document.body.appendChild(o);
  o.addEventListener('click',e=>{if(e.target===o||e.target.closest?.('[data-yhc-close]'))close()});
  o.querySelector('#yhcSend').addEventListener('click',send);
  o.querySelector('#yhcInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
  o.querySelector('#yhcThreadList').addEventListener('click',e=>{const b=e.target.closest?.('[data-yhc-thread]');if(!b)return;selectedThread=b.dataset.yhcThread;renderThreads();loadMessages(true)});
 }
 let a=document.getElementById('yardivoHelpChatAdminTrigger');
 if(!a){a=document.createElement('button');a.type='button';a.id='yardivoHelpChatAdminTrigger';a.innerHTML='💬 <span>HELP CHAT</span><span class="hc-badge" hidden>0</span>';a.addEventListener('click',open);document.body.appendChild(a)}
 a.style.display=admin()?'flex':'none';
 const p=document.getElementById('yardivoHelpChatPanel');if(p)p.classList.toggle('nonadmin',!admin());
}
function renderThreads(){const host=document.getElementById('yhcThreadList');if(!host)return;if(!threads.length){host.innerHTML='<div class="yhc-empty">Još nema Help Chat razgovora.</div>';return}host.innerHTML=threads.map(t=>`<button type="button" class="yhc-thread ${String(t.thread_user_id)===String(selectedThread)?'active':''}" data-yhc-thread="${esc(t.thread_user_id)}"><b>${esc(t.thread_username||'korisnik')}</b>${Number(t.unread||0)?`<em>${Number(t.unread)}</em>`:''}<small>${esc(t.last_message||'')}</small></button>`).join('')}
function renderMessages(){const host=document.getElementById('yhcMessages');if(!host)return;if(admin()&&!selectedThread){host.innerHTML='<div class="yhc-admin-no-thread">Odaberi korisnika s lijeve strane.</div>';return}if(!messages.length){host.innerHTML='<div class="yhc-empty">Nema poruka. Napiši poruku i Admin dujemales će je vidjeti ovdje.</div>';return}const myName=String(me?.username||window.currentSession?.username||'').toLowerCase();host.innerHTML=messages.map(m=>{const mine=String(m.sender_username||'').toLowerCase()===myName;return `<div class="yhc-msg ${mine?'mine':''}"><div class="who">${esc(mine?'TI':m.sender_username||'')}</div><div class="body">${esc(m.body||'')}</div><div class="time">${esc(fmtTime(m.created_at))}</div></div>`}).join('');host.scrollTop=host.scrollHeight}
async function loadThreads(){if(!admin())return;try{threads=await invoke('list_threads')||[];if(!selectedThread&&threads[0])selectedThread=String(threads[0].thread_user_id);renderThreads()}catch(e){console.error('[YARDIVO Help Chat] threads',e)}}
async function loadMessages(silent=false){if(busy)return;if(admin()&&!selectedThread){messages=[];renderMessages();return}busy=true;try{messages=await invoke('list_messages',admin()?{thread_user_id:selectedThread}:{});if(!Array.isArray(messages))messages=[];renderMessages();if(admin())await loadThreads();updateBadge(0,true)}catch(e){if(!silent){const h=document.getElementById('yhcMessages');if(h)h.innerHTML='<div class="yhc-empty">Help Chat nije dostupan: '+esc(e?.message||e)+'</div>'}}finally{busy=false}}
async function send(){const input=document.getElementById('yhcInput'),btn=document.getElementById('yhcSend');if(!input||!btn)return;const body=input.value.trim();if(!body)return;if(admin()&&!selectedThread)return alert('Odaberi korisnika.');btn.disabled=true;try{await invoke('send',admin()?{thread_user_id:selectedThread,body}:{body});input.value='';await loadMessages()}catch(e){alert('Poruka nije poslana:\n'+(e?.message||e))}finally{btn.disabled=false;input.focus()}}
async function who(){try{me=await invoke('whoami');return me}catch(e){console.error('[YARDIVO Help Chat] whoami',e);return null}}
async function open(){ensure();opened=true;document.getElementById('yardivoHelpChatOverlay')?.classList.add('open');await who();const t=document.getElementById('yhcTitle'),s=document.getElementById('yhcSub'),inp=document.getElementById('yhcInput');if(admin()){if(t)t.textContent='HELP CHAT · ADMIN';if(s)s.textContent='Korisnici ↔ dujemales · Yard Manager';if(inp)inp.placeholder='Odgovori korisniku…';await loadThreads()}else{if(t)t.textContent='HELP CHAT';if(s)s.textContent='dujemales · Yard Manager';if(inp)inp.placeholder='Napiši poruku adminu…'}await loadMessages();clearInterval(chatTimer);chatTimer=setInterval(()=>{if(opened)loadMessages(true)},900000)}
function close(){opened=false;document.getElementById('yardivoHelpChatOverlay')?.classList.remove('open');clearInterval(chatTimer);chatTimer=null}
function updateBadge(n,forceZero=false){const count=forceZero?0:Number(n||0);document.querySelectorAll('[data-yv-help-badge],#yardivoHelpChatAdminTrigger .hc-badge').forEach(b=>{b.textContent=String(count);b.hidden=!count})}
async function pollBadge(){try{if(!window.currentSession&&!document.body?.dataset?.yardivoRole)return;const x=await invoke('unread_count');updateBadge(x?.count||0)}catch(_){}}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-yv-help-chat-open]');if(!b)return;e.preventDefault();e.stopPropagation();open()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened)close()});
window.addEventListener('yardivo:logout',()=>{close();updateBadge(0,true)});
window.addEventListener('yardivo:online-ready',()=>{ensure();pollBadge()});
setTimeout(()=>{ensure();pollBadge()},1800);badgeTimer=setInterval(pollBadge,900000);
async function openThread(threadId){selectedThread=String(threadId||'');await open()}
window.YardivoHelpChatV583={open,openThread,close,refresh:loadMessages};
})();
