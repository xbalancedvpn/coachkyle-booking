(() => {
  const cfg = window.COACH_APP_CONFIG || {};
  const brandName = cfg.brand?.name || 'Coach Kyle';

  function installRules(){
    if(document.getElementById('coachKyleClientHotfix')) return;
    const style=document.createElement('style');
    style.id='coachKyleClientHotfix';
    style.textContent='#programs{display:none!important}';
    document.head.appendChild(style);
  }

  function replaceTextNode(node){
    if(!node || node.nodeType!==Node.TEXT_NODE) return;
    const before=node.nodeValue || '';
    const after=before
      .replace(/Your Coaching Brand/g, brandName)
      .replace(/PICKYLA/g, String(brandName).toUpperCase())
      .replace(/Pickyla/g, brandName)
      .replace(/Kyla/g, 'Coach Kyle');
    if(after!==before) node.nodeValue=after;
  }

  function scrubVisibleText(root=document.body){
    if(!root) return;
    if(root.nodeType===Node.TEXT_NODE){replaceTextNode(root);return;}
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replaceTextNode);
  }

  function applyClientCleanup(){
    document.title='Coach Kyle | Pickleball Coaching';
    document.querySelectorAll('#mainNav a[data-public-tab="programs"]').forEach(el=>el.remove());
    document.querySelectorAll('a[href="#programs"]').forEach(el=>el.remove());
    const programs=document.getElementById('programs');
    if(programs){programs.classList.remove('v17f-active-section');programs.setAttribute('aria-hidden','true');}
    const footer=document.querySelector('footer span');
    if(footer) footer.textContent='Pickleball Coaching • Santiago City';
    const testimonialLead=document.querySelector('#testimonialsSection .section-heading p');
    if(testimonialLead) testimonialLead.textContent='Real feedback shared with permission by Coach Kyle clients. Want to share your experience? Send it for Coach Kyle to review before it appears here.';
    const contactLead=document.querySelector('#contact > p');
    if(contactLead) contactLead.textContent='Questions about your session? Message Coach Kyle on Facebook or save this site on your phone for quick access.';
    const consent=document.querySelector('.testimonial-consent');
    if(consent) consent.lastChild.nodeValue=' I allow Coach Kyle to review, make minor wording adjustments, and publish this testimonial on the public site.';
    const quoteLabel=document.getElementById('heroQuoteLabel');
    if(quoteLabel && /PICKYLA/i.test(quoteLabel.textContent||'')) quoteLabel.textContent='COACH KYLE SAYS';
    scrubVisibleText(document.body);
  }

  function run(){installRules();applyClientCleanup();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('load',()=>setTimeout(run,60),{once:true});

  const observer=new MutationObserver(records=>{
    records.forEach(record=>{
      if(record.type==='characterData') replaceTextNode(record.target);
      record.addedNodes?.forEach(node=>scrubVisibleText(node));
    });
    applyClientCleanup();
  });
  if(document.body) observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  else document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{subtree:true,childList:true,characterData:true}),{once:true});
})();
