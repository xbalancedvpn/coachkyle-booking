(() => {
  const cfg = window.COACH_APP_CONFIG || {};
  const money = n => `₱${Number(n || 0).toLocaleString('en-PH')}`;

  const css = `
  :root{--ck-black:#070707;--ck-graphite:#171717;--ck-yellow:#ffd600;--ck-yellow2:#fff200;--ck-white:#f7f7f7;--ck-muted:#aaa}
  body{background:#080808;color:#f3f3f3}
  .topbar{background:rgba(7,7,7,.94)!important;border-bottom:1px solid rgba(255,214,0,.25)!important;backdrop-filter:blur(16px)}
  .brand-logo{width:48px!important;height:48px!important;object-fit:contain}.main-nav a,.nav-week-link,.admin-login-btn{color:#efefef!important}.main-nav a:hover,.nav-week-link:hover{color:var(--ck-yellow)!important}
  .small-book,.btn.primary{background:var(--ck-yellow)!important;color:#080808!important;border-color:var(--ck-yellow)!important;font-weight:900!important;text-transform:uppercase;letter-spacing:.04em}
  .hero{min-height:760px;background:radial-gradient(circle at 82% 30%,rgba(255,214,0,.14),transparent 28%),linear-gradient(135deg,#050505 0%,#111 62%,#050505 100%);position:relative;overflow:hidden}
  .hero:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,transparent 0 90px,rgba(255,214,0,.035) 91px 94px);pointer-events:none}
  .hero-photo{background:linear-gradient(160deg,#050505,#191919)!important}.hero-photo img{object-fit:contain!important;padding:9%!important;filter:drop-shadow(0 24px 60px rgba(0,0,0,.6))}.photo-shade{background:linear-gradient(90deg,rgba(7,7,7,.15),rgba(7,7,7,.75))!important}
  .hero-copy{position:relative;z-index:2}.hero-logo{max-width:330px!important;filter:drop-shadow(0 10px 28px rgba(0,0,0,.45))}.hero h1{font-family:Impact,'Arial Black',sans-serif!important;text-transform:uppercase!important;font-style:italic!important;line-height:.93!important;letter-spacing:-.035em!important;font-size:clamp(4rem,8vw,8.7rem)!important}.hero h1 em{color:var(--ck-yellow)!important;font-style:italic!important}.hero-lead{max-width:650px!important;color:#ddd!important;font-weight:600}.eyebrow{color:var(--ck-yellow)!important;font-weight:900!important;letter-spacing:.16em!important}.quote-card{border-left:5px solid var(--ck-yellow)!important;background:rgba(255,255,255,.055)!important}
  .live-availability-badge{background:#111!important;color:#fff!important;border:1px solid rgba(255,214,0,.35)!important}.pulse-dot{background:var(--ck-yellow)!important}
  .section{background:#0d0d0d!important;color:#eee!important}.section:nth-of-type(even){background:#f2f2f0!important;color:#111!important}.section-heading h2,.intro h2{font-family:Impact,'Arial Black',sans-serif!important;text-transform:uppercase!important;font-style:italic!important;letter-spacing:-.025em!important}.section-heading p,.intro p{color:inherit!important;opacity:.78}.eyebrow.dark{color:#a17f00!important}
  .quick-info>div,.goal-options button,.rate-card,.booking-panel,.contact-card,.public-program-card,.testimonial-card{border-radius:18px!important;border:1px solid rgba(255,214,0,.22)!important;box-shadow:none!important}.goal-options button:hover,.package-options button:hover{transform:translateY(-2px);border-color:var(--ck-yellow)!important}
  .rates{background:linear-gradient(150deg,#070707,#151515)!important;color:#fff!important}.rates .eyebrow.dark{color:var(--ck-yellow)!important}.rate-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.rate-card{background:#121212!important;color:#fff!important;position:relative;overflow:hidden}.rate-card:before{content:"";position:absolute;left:0;top:0;width:100%;height:5px;background:var(--ck-yellow)}.rate-card.featured{transform:none!important}.rate-card .pill{background:var(--ck-yellow)!important;color:#050505!important}.rate-card .price{color:var(--ck-yellow)!important;font-family:Impact,'Arial Black',sans-serif!important;font-style:italic}.ck-rate-breakdown{display:grid;gap:7px;margin-top:14px;padding-top:14px;border-top:1px solid #333;font-weight:800}.ck-rate-breakdown span{display:flex;justify-content:space-between;gap:14px;color:#ddd}.ck-rate-breakdown b{color:var(--ck-yellow)}
  .booking{background:#ececea!important;color:#111!important}.booking-panel{background:#fff!important;border:1px solid #d6d6d0!important}.step{background:#111!important;color:var(--ck-yellow)!important}.day.selected,.slot.in-range,.package-options button.active{background:#111!important;color:var(--ck-yellow)!important;border-color:#111!important}.package-options button{font-weight:850!important}.package-options button small{display:block;margin-top:4px}
  .btn.ghost{border-color:#666!important;color:#fff!important}.contact{background:#070707!important;color:#fff!important}.contact-actions a{background:var(--ck-yellow)!important;color:#070707!important}
  footer{background:#030303!important;color:#bdbdbd!important;border-top:1px solid #222!important}.footer-logo{max-height:70px!important}
  .v17g-focusbar{background:rgba(10,10,10,.96)!important;border-color:rgba(255,214,0,.24)!important;color:#fff!important}.v17g-focusbar-copy strong{color:#fff!important}.v17g-viewall{background:var(--ck-yellow)!important;color:#070707!important}.v17g-next{background:#242424!important;color:#fff!important}
  @media(max-width:900px){.rate-grid{grid-template-columns:1fr!important}.hero{min-height:unset}.hero-photo img{padding:14%!important}.hero h1{font-size:clamp(3.4rem,14vw,6.2rem)!important}}
  @media(max-width:720px){.hero-logo{max-width:250px!important}.hero-photo{min-height:330px!important}.topbar{border-bottom-color:#222!important}.main-nav{background:#090909!important}.main-nav a{border-color:#222!important}}
  `;

  function injectStyles(){
    if(document.getElementById('coachKyleTheme')) return;
    const style=document.createElement('style');style.id='coachKyleTheme';style.textContent=css;document.head.appendChild(style);
  }

  function setFavicon(){
    let icon=document.querySelector('link[rel="icon"]');
    if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.appendChild(icon)}
    icon.type='image/svg+xml';icon.href=cfg.assets?.favicon || 'coach-kyle-favicon.svg';
    const theme=document.querySelector('meta[name="theme-color"]');if(theme) theme.content='#070707';
  }

  function polishCopy(){
    const heroTitle=document.querySelector('.hero h1');
    if(heroTitle) heroTitle.innerHTML='Elevate your game.<br><em>Train with purpose.</em>';
    const improve=document.querySelector('#improve .section-heading p');
    if(improve) improve.textContent='Choose the area you want to sharpen. Coach Kyle will help turn that goal into focused court work.';
    const ratesLead=document.querySelector('#rates .section-heading p');
    if(ratesLead) ratesLead.textContent='Straightforward hourly coaching rates for solo and small-group training.';
    const bookingLead=document.querySelector('#booking .section-heading p');
    if(bookingLead) bookingLead.textContent='Choose an open date, select your time, pick the number of players, and send your request.';
    const firstTime=document.querySelector('#v17fSelfAssessment summary strong');
    if(firstTime) firstTime.textContent='First time with Coach Kyle?';
  }

  function patchRates(){
    const byPlayers=cfg.rates?.byPlayers || {1:500,2:700,3:900,4:1100,5:1500};
    const cards=[...document.querySelectorAll('.rate-card')];
    if(cards[0]){cards[0].querySelector('h3').textContent='1-on-1';cards[0].querySelector('.price').innerHTML='<span>₱</span>500';cards[0].querySelector('p').textContent='total / hour'}
    if(cards[1]){cards[1].querySelector('h3').textContent='2 Players';cards[1].querySelector('.price').innerHTML='<span>₱</span>700';cards[1].querySelector('p').textContent='total / hour'}
    if(cards[2]){cards[2].querySelector('h3').textContent='3–5 Players';cards[2].querySelector('.price').innerHTML='<span>₱</span>900';cards[2].querySelector('p').textContent='starts at / hour';let d=cards[2].querySelector('.ck-rate-breakdown');if(!d){d=document.createElement('div');d.className='ck-rate-breakdown';cards[2].appendChild(d)}d.innerHTML=`<span>3 players <b>${money(byPlayers[3])}</b></span><span>4 players <b>${money(byPlayers[4])}</b></span><span>5 players <b>${money(byPlayers[5])}</b></span>`}

    const buttons=[...document.querySelectorAll('.package-options button')];
    if(buttons[0]){buttons[0].dataset.package='1-on-1';buttons[0].dataset.players='1';buttons[0].dataset.min='1';buttons[0].dataset.max='1';buttons[0].dataset.rate=`${money(byPlayers[1])} total/hour`;buttons[0].innerHTML=`1-on-1 <small>${money(byPlayers[1])}/hr</small>`}
    if(buttons[1]){buttons[1].dataset.package='2 Players';buttons[1].dataset.players='2';buttons[1].dataset.min='2';buttons[1].dataset.max='2';buttons[1].dataset.rate=`${money(byPlayers[2])} total/hour`;buttons[1].innerHTML=`2 Players <small>${money(byPlayers[2])} total/hr</small>`}
    if(buttons[2]){buttons[2].dataset.package='Group (3–5 Players)';buttons[2].dataset.players='3';buttons[2].dataset.min='3';buttons[2].dataset.max='5';buttons[2].dataset.rate=`${money(byPlayers[3])} total/hour`;buttons[2].innerHTML=`3–5 Players <small>${money(byPlayers[3])}–${money(byPlayers[5])} total/hr</small>`}

    function syncSelectedRate(){
      if(typeof selectedPlayers==='undefined') return;
      const amount=byPlayers[Number(selectedPlayers)];
      if(amount) selectedRate=`${money(amount)} total/hour`;
      if(Number(selectedPlayers)>=3) selectedPackage=`Group (${selectedPlayers} Players)`;
      if(Number(selectedPlayers)===2) selectedPackage='2 Players';
      if(Number(selectedPlayers)===1) selectedPackage='1-on-1';
      try{updateSummary?.()}catch{}
    }
    buttons.forEach(b=>b.addEventListener('click',()=>setTimeout(syncSelectedRate,0)));
    document.getElementById('groupSize')?.addEventListener('change',()=>setTimeout(syncSelectedRate,0));
  }

  function brandImages(){
    document.querySelectorAll('.brand-logo').forEach(img=>img.src=cfg.assets?.emblem || 'coach-kyle-favicon.svg');
    document.querySelectorAll('.hero-logo,.footer-logo').forEach(img=>img.src=cfg.assets?.wordmark || 'coach-kyle-wordmark.svg');
    const heroPhoto=document.querySelector('.hero-photo img');
    if(heroPhoto && heroPhoto.src.includes('coach-placeholder')){heroPhoto.src=cfg.assets?.logo || 'coach-kyle-main.svg';heroPhoto.alt='Coach Kyle Pickleball Coaching'}
  }

  function run(){injectStyles();setFavicon();brandImages();polishCopy();patchRates()}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('load',()=>setTimeout(run,40),{once:true});
})();
