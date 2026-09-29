(function(){
'use strict';
const BASE='https://ldzwgdwzolbvjxyznlry.supabase.co';
const KEY='sb_publishable_f3daeEDsH7zNSiFR5QluaQ_AP4Ptjzz';

function show(text,ok=false){
 const e=document.getElementById('loginError');if(!e)return;
 e.textContent=text;
 e.style.setProperty('display','block','important');
 e.style.setProperty('visibility','visible','important');
 e.style.setProperty('opacity','1','important');
 e.style.setProperty('background',ok?'#0f2419':'#351317','important');
 e.style.setProperty('border','1px solid '+(ok?'#2f6d48':'#d94a52'),'important');
 e.style.setProperty('color',ok?'#9ee0b6':'#ffb1b5','important');
}
async function fetchJSON(url,options={},ms=6500){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
 try{
   const r=await fetch(url,{...options,signal:c.signal});
   const d=await r.json().catch(()=>({}));
   return {r,d};
 }finally{clearTimeout(t)}
}
async function change(){
 const username=(document.getElementById('loginUser')?.value||'').trim().toLowerCase();
 const current=document.getElementById('loginPass')?.value||'';
 if(!/^[a-z0-9._-]{3,40}$/.test(username)||!current){
   show('Za promjenu passworda upiši korisničko ime i trenutni password.');
   return;
 }
 const next=window.prompt('NOVI PASSWORD\nUpiši novi password (najmanje 8 znakova).');
 if(next===null)return;
 if(String(next).length<6){show('Novi password mora imati najmanje 8 znakova.');return}
 const again=window.prompt('POTVRDI NOVI PASSWORD\nPonovno upiši novi password.');
 if(again===null)return;
 if(next!==again){show('Novi passwordi se ne podudaraju.');return}

 const b=document.getElementById('loginChangePasswordBtn');
 if(b)b.disabled=true;
 try{
   const headers={'apikey':KEY,'Content-Type':'application/json'};
   const {r:ar,d:auth}=await fetchJSON(BASE+'/auth/v1/token?grant_type=password',{
     method:'POST',headers,body:JSON.stringify({email:username+'@yardivo.local',password:current})
   });
   if(!ar.ok||!auth?.access_token)throw new Error('TRENUTNI USERNAME ILI PASSWORD NIJE ISPRAVAN.');
   const {r:ur,d:ud}=await fetchJSON(BASE+'/auth/v1/user',{
     method:'PUT',
     headers:{...headers,Authorization:'Bearer '+auth.access_token},
     body:JSON.stringify({password:next})
   });
   if(!ur.ok)throw new Error(String(ud?.message||'Promjena passworda nije uspjela.'));
   const p=document.getElementById('loginPass');if(p)p.value='';
   show('PASSWORD JE PROMIJENJEN — prijavi se novim passwordom.',true);
 }catch(e){
   show(e?.name==='AbortError'?'SERVER NIJE ODGOVORIO — pokušaj ponovno.':String(e?.message||'Promjena passworda nije uspjela.'));
 }finally{
   if(b){b.disabled=false;b.removeAttribute('disabled')}
 }
}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('#loginChangePasswordBtn');
 if(!b)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 change();
},true);
window.YardivoPasswordChange={change};
})();
