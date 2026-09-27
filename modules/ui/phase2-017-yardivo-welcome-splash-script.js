
(function(){
'use strict';

let started=false;
let finished=false;
let timer=null;
let rafId=0;
const WELCOME_MS=4200;
const FINAL_ZOOM_MS=2000;

function revealLogin(){
  if(finished)return;
  finished=true;
  if(timer){clearInterval(timer);timer=null;}
  if(rafId){cancelAnimationFrame(rafId);rafId=0;}

  const bar=document.getElementById('yardivoWelcomeBar');
  const pct=document.getElementById('yardivoWelcomePercent');
  const status=document.getElementById('yardivoWelcomeStatus');
  if(bar){bar.style.width='100%';bar.style.transform='scaleX(1)';}
  if(pct)pct.textContent='100%';
  if(status)status.textContent='Ready';

  const splash=document.getElementById('yardivoWelcomeSplash');
  const login=document.getElementById('loginScreen')
    || document.getElementById('loginOverlay')
    || document.getElementById('login')
    || document.querySelector('.login-screen,.login-overlay,[data-login-screen]');

  /* Mount Login first while Welcome is still fully covering the screen. */
  document.body.classList.add('yardivo-prelogin');
  if(login){
    login.classList.remove('hidden');
    login.style.display='flex';
    login.style.visibility='visible';
    login.style.opacity='1';
    login.setAttribute('aria-hidden','false');
  }
  document.documentElement.classList.add('yardivo-login-ready');

  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(splash&&!splash.classList.contains('yardon-final-zoom'))splash.classList.add('hide');

    setTimeout(()=>{
      if(splash)splash.style.display='none';
      document.documentElement.classList.remove('yardivo-booting');
      document.documentElement.classList.add('yardivo-welcome-complete');
      try{window.dispatchEvent(new CustomEvent('yardivo:welcome-complete'))}catch(_){}
      document.body.classList.remove('yardivo-welcome-active');
      document.body.classList.add('yardivo-prelogin');
      try{YardivoLoginNotificationFix?.clearLoginOnce?.()}catch(e){}
    },80);
  }));
}

function start(){
  if(started)return;
  started=true;

  document.documentElement.classList.add('yardivo-booting');
  document.body.classList.add('yardivo-welcome-active','yardivo-prelogin');

  const splash=document.getElementById('yardivoWelcomeSplash');
  const login=document.getElementById('loginOverlay');
  const bar=document.getElementById('yardivoWelcomeBar');
  const pct=document.getElementById('yardivoWelcomePercent');
  const status=document.getElementById('yardivoWelcomeStatus');

  if(splash){
    splash.style.removeProperty('display');
    splash.classList.remove('hide');
  }
  if(login){
    login.style.display='none';
    login.style.visibility='hidden';
    login.style.opacity='0';
  }
  if(!bar||!pct){revealLogin();return;}

  bar.style.width='100%';
  bar.style.transform='scaleX(0)';
  pct.textContent='0%';
  if(status)status.textContent='Initializing system';

  const stages=[
    [18,'Loading interface'],
    [42,'Preparing modules'],
    [67,'Checking local settings'],
    [86,'Preparing login'],
    [100,'Ready']
  ];

  const startedAt=performance.now();
  let stage=0;

  let lastValue=-1;
  function tick(now){
    if(finished)return;
    const elapsed=now-startedAt;
    const value=Math.min(100,Math.round((elapsed/WELCOME_MS)*100));

    if(value!==lastValue){
      lastValue=value;
      bar.style.transform='scaleX('+(value/100)+')';
      pct.textContent=value+'%';
      while(stage<stages.length&&value>=stages[stage][0]){
        if(status)status.textContent=stages[stage][1];
        stage++;
      }
    }

    if(value>=100){
      rafId=0;
      if(status)status.textContent='Ready';
      const splash=document.getElementById('yardivoWelcomeSplash');
      if(splash&&!splash.classList.contains('yardon-final-zoom')){
        requestAnimationFrame(()=>splash.classList.add('yardon-final-zoom'));
      }
      setTimeout(revealLogin,FINAL_ZOOM_MS);
      return;
    }
    rafId=requestAnimationFrame(tick);
  }
  rafId=requestAnimationFrame(tick);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',start,{once:true});
}else{
  start();
}

/* Real fail-safe only. It does not restart or visually alter Welcome. */
setTimeout(()=>{if(!finished)revealLogin()},9000);

window.YardivoWelcomeSplash={start,hide:revealLogin};
})();
