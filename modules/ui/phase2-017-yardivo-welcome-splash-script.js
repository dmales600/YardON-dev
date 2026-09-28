(function(){
'use strict';

let started=false;
let finished=false;
let transitioning=false;
let rafId=0;
let progressAnimation=null;
const PROGRESS_MS=1900;
const FINAL_REVEAL_MS=1800;
const LOGO_REVEAL_POINTS=[22,36,48,60,72,86,100];
const LOGO_STEP_MS=150;
const TAGLINE='YARD MANAGEMENT SYSTEM';
const TAGLINE_CHAR_MS=48;

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function revealLogoLetters(splash,source){
  if(!splash||!source)return;
  try{if(typeof source.decode==='function')await source.decode()}catch(_){}
  source.style.setProperty('clip-path','inset(0 100% 0 0)','important');
  source.style.setProperty('-webkit-clip-path','inset(0 100% 0 0)','important');
  source.style.setProperty('visibility','visible','important');
  source.style.setProperty('opacity','1','important');
  await wait(180);
  for(const point of LOGO_REVEAL_POINTS){
    if(finished||transitioning)return;
    const right=Math.max(0,100-point);
    source.style.setProperty('clip-path',`inset(0 ${right}% 0 0)`,'important');
    source.style.setProperty('-webkit-clip-path',`inset(0 ${right}% 0 0)`,'important');
    await wait(LOGO_STEP_MS);
  }
  source.style.removeProperty('clip-path');
  source.style.removeProperty('-webkit-clip-path');
  splash.classList.add('yardon-logo-glow-active');
}

async function revealTagline(sub){
  if(!sub)return;
  sub.textContent='';
  sub.setAttribute('aria-label',TAGLINE);
  await wait(130);
  for(let i=1;i<=TAGLINE.length;i++){
    if(finished||transitioning)return;
    sub.textContent=TAGLINE.slice(0,i);
    await wait(TAGLINE_CHAR_MS);
  }
}

function runProgress(bar,pct,status){
  return new Promise(resolve=>{
    if(!bar||!pct){resolve();return}
    try{bar.getAnimations?.().forEach(a=>a.cancel())}catch(_){}
    bar.style.width='100%';
    bar.style.transform='translate3d(0,0,0) scaleX(0)';
    pct.textContent='0%';
    if(status)status.textContent='Loading system';

    try{
      progressAnimation=bar.animate(
        [
          {transform:'translate3d(0,0,0) scaleX(0)'},
          {transform:'translate3d(0,0,0) scaleX(1)'}
        ],
        {duration:PROGRESS_MS,easing:'cubic-bezier(.22,.61,.36,1)',fill:'forwards'}
      );
    }catch(_){progressAnimation=null}

    const startedAt=performance.now();
    let lastValue=-1;
    function tick(now){
      if(finished||transitioning){resolve();return}
      const ratio=Math.min(1,(now-startedAt)/PROGRESS_MS);
      const value=Math.min(100,Math.floor(ratio*100));
      if(!progressAnimation)bar.style.transform='translate3d(0,0,0) scaleX('+ratio+')';
      if(value===100||value>=lastValue+2){
        lastValue=value;
        pct.textContent=value+'%';
      }
      if(value>=100){
        if(status)status.textContent='Ready';
        rafId=0;
        resolve();
        return;
      }
      rafId=requestAnimationFrame(tick);
    }
    rafId=requestAnimationFrame(tick);
  });
}

async function runIntroSequence(splash,source,sub,bar,pct,status){
  await revealLogoLetters(splash,source);
  if(finished||transitioning)return;
  await wait(110);
  await revealTagline(sub);
  if(finished||transitioning)return;
  await wait(170);
  splash?.classList.add('yardon-progress-ready');
  await wait(360);
  await runProgress(bar,pct,status);
  if(finished||transitioning)return;
  await wait(120);
  startSplitReveal();
}

function loginNode(){
  return document.getElementById('loginScreen')
    || document.getElementById('loginOverlay')
    || document.getElementById('login')
    || document.querySelector('.login-screen,.login-overlay,[data-login-screen]');
}

function mountLoginBehind(){
  const login=loginNode();
  document.body.classList.add('yardivo-prelogin');
  if(login){
    login.classList.remove('hidden');
    login.classList.add('yardon-login-arrive');
    login.style.display='flex';
    login.style.visibility='visible';
    login.style.opacity='0';
    login.setAttribute('aria-hidden','false');
    requestAnimationFrame(()=>requestAnimationFrame(()=>login.classList.add('yardon-login-arrive-active')));
  }
  document.documentElement.classList.add('yardivo-login-ready');
  return login;
}

function finishReveal(){
  if(finished)return;
  finished=true;
  transitioning=false;
  if(rafId){cancelAnimationFrame(rafId);rafId=0;}
  try{progressAnimation?.finish?.()}catch(_){}
  progressAnimation=null;
  const splash=document.getElementById('yardivoWelcomeSplash');
  const login=loginNode();
  if(splash)splash.style.display='none';
  if(login){
    login.classList.remove('yardon-login-arrive','yardon-login-arrive-active');
    login.style.opacity='1';
    login.style.visibility='visible';
    const finalLogo=login.querySelector('.login-logo-combo');
    if(finalLogo){
      finalLogo.style.removeProperty('visibility');
      finalLogo.style.removeProperty('opacity');
      finalLogo.style.removeProperty('animation');
    }
  }
  document.documentElement.classList.remove('yardivo-booting');
  document.documentElement.classList.add('yardivo-welcome-complete');
  document.body.classList.remove('yardivo-welcome-active');
  document.body.classList.add('yardivo-prelogin');
  try{window.dispatchEvent(new CustomEvent('yardivo:welcome-complete'))}catch(_){}
  try{YardivoLoginNotificationFix?.clearLoginOnce?.()}catch(_){}
}

async function startSplitReveal(){
  if(transitioning||finished)return;
  transitioning=true;

  const bar=document.getElementById('yardivoWelcomeBar');
  const pct=document.getElementById('yardivoWelcomePercent');
  const status=document.getElementById('yardivoWelcomeStatus');
  try{progressAnimation?.finish?.()}catch(_){}
  progressAnimation=null;
  if(bar){bar.style.width='100%';bar.style.transform='translate3d(0,0,0) scaleX(1)';}
  if(pct)pct.textContent='100%';
  if(status)status.textContent='Ready';

  const splash=document.getElementById('yardivoWelcomeSplash');
  const source=splash?.querySelector('.yardon-welcome-logo');
  if(splash&&source){
    splash.querySelector('.yardon-split-stage')?.remove();

    const splashRect=splash.getBoundingClientRect();
    const sourceRect=source.getBoundingClientRect();
    const stage=document.createElement('div');
    stage.className='yardon-split-stage';
    stage.style.setProperty('--yardon-split-left',(sourceRect.left-splashRect.left)+'px');
    stage.style.setProperty('--yardon-split-top',(sourceRect.top-splashRect.top)+'px');
    stage.style.setProperty('--yardon-split-width',sourceRect.width+'px');
    stage.style.setProperty('--yardon-split-height',sourceRect.height+'px');
    stage.style.setProperty('--yardon-split-center-x',(sourceRect.left-splashRect.left+sourceRect.width/2)+'px');
    stage.style.setProperty('--yardon-split-center-y',(sourceRect.top-splashRect.top+sourceRect.height/2)+'px');

    const src=source.currentSrc||source.src;
    const left=document.createElement('img');
    const right=document.createElement('img');
    left.className='yardon-split-half left';
    right.className='yardon-split-half right';
    left.alt='';right.alt='';
    left.decoding='async';right.decoding='async';
    left.loading='eager';right.loading='eager';
    left.src=src;right.src=src;

    for(const half of [left,right]){
      half.style.setProperty('left',(sourceRect.left-splashRect.left)+'px','important');
      half.style.setProperty('top',(sourceRect.top-splashRect.top)+'px','important');
      half.style.setProperty('width',sourceRect.width+'px','important');
      half.style.setProperty('height',sourceRect.height+'px','important');
      half.style.setProperty('max-width','none','important');
      half.style.setProperty('max-height','none','important');
      half.style.setProperty('margin','0','important');
      half.style.setProperty('background','transparent','important');
      half.style.setProperty('border','0','important');
      half.style.setProperty('outline','0','important');
      half.style.setProperty('box-shadow','none','important');
      half.style.setProperty('filter','none','important');
      half.style.setProperty('mix-blend-mode','normal','important');
    }

    stage.append(left,right);
    splash.appendChild(stage);

    // Keep the source visible until both split clones have decoded. This prevents
    // a blank/black compositor frame between the static logo and the moving halves.
    try{
      await Promise.all([
        typeof left.decode==='function'?left.decode():Promise.resolve(),
        typeof right.decode==='function'?right.decode():Promise.resolve()
      ]);
    }catch(_){}

    source.classList.add('yardon-split-source-hidden');
    source.style.setProperty('visibility','hidden','important');
    source.style.setProperty('opacity','0','important');
  }

  mountLoginBehind();
  requestAnimationFrame(()=>requestAnimationFrame(()=>splash?.classList.add('yardon-split-reveal')));
  setTimeout(finishReveal,FINAL_REVEAL_MS+70);
}

function forceReveal(){
  if(finished)return;
  mountLoginBehind();
  finishReveal();
}

function start(){
  if(started)return;
  started=true;

  document.documentElement.classList.add('yardivo-booting');
  document.body.classList.add('yardivo-welcome-active','yardivo-prelogin');

  const splash=document.getElementById('yardivoWelcomeSplash');
  const login=loginNode();
  const bar=document.getElementById('yardivoWelcomeBar');
  const pct=document.getElementById('yardivoWelcomePercent');
  const status=document.getElementById('yardivoWelcomeStatus');

  if(splash){
    splash.style.removeProperty('display');
    splash.classList.remove('hide','yardon-final-zoom','yardon-split-reveal','yardon-logo-glow-active','yardon-progress-ready');
    splash.querySelector('.yardon-split-stage')?.remove();
    const oldSource=splash.querySelector('.yardon-welcome-logo');
    if(oldSource){
      oldSource.classList.remove('yardon-split-source-hidden');
      oldSource.style.removeProperty('visibility');
      oldSource.style.removeProperty('opacity');
      oldSource.style.removeProperty('clip-path');
      oldSource.style.removeProperty('-webkit-clip-path');
    }
  }
  if(login){
    login.classList.remove('yardon-login-arrive','yardon-login-arrive-active');
    login.style.display='none';
    login.style.visibility='hidden';
    login.style.opacity='0';
  }
  const source=splash?.querySelector('.yardon-welcome-logo');
  const sub=splash?.querySelector('.yardivo-welcome-sub');
  if(!bar||!pct||!source){forceReveal();return;}

  try{bar.getAnimations?.().forEach(a=>a.cancel())}catch(_){}
  bar.style.width='100%';
  bar.style.transform='translate3d(0,0,0) scaleX(0)';
  pct.textContent='0%';
  if(status)status.textContent='';

  runIntroSequence(splash,source,sub,bar,pct,status).catch(()=>forceReveal());
}

if(document.getElementById('yardivoWelcomeSplash')){
  start();
}else if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',start,{once:true});
}else{
  start();
}

setTimeout(()=>{if(!finished&&!transitioning)forceReveal()},9000);
window.YardivoWelcomeSplash={start,hide:forceReveal};
})();