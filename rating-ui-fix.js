(() => {
  const $ = s => document.querySelector(s);
  const labels = {
    '1':'Needs work',
    '2':'Emerging',
    '3':'Developing',
    '4':'Proficient',
    '5':'Strong'
  };

  function enhanceRatings(){
    const box=$('#skillFields');
    if(!box) return;
    if(!box.querySelector('.rating-scale-legend')){
      const legend=document.createElement('div');
      legend.className='rating-scale-legend';
      legend.innerHTML='<span><b>1</b>Needs work</span><span><b>2</b>Emerging</span><span><b>3</b>Developing</span><span><b>4</b>Proficient</span><span><b>5</b>Strong</span>';
      box.prepend(legend);
    }
    [...box.querySelectorAll('label')].forEach(label=>{
      const select=label.querySelector('select[id^="skill_"]');
      if(!select || label.dataset.ratingEnhanced==='1') return;
      label.dataset.ratingEnhanced='1';
      label.classList.add('rating-field');
      select.querySelector('option[value="1"]')?.replaceChildren('1 - Needs work');
      select.querySelector('option[value="2"]')?.replaceChildren('2 - Emerging');
      select.querySelector('option[value="3"]')?.replaceChildren('3 - Developing');
      select.querySelector('option[value="4"]')?.replaceChildren('4 - Proficient');
      select.querySelector('option[value="5"]')?.replaceChildren('5 - Strong');

      const controls=document.createElement('div');
      controls.className='rating-control';
      for(let i=1;i<=5;i++){
        const b=document.createElement('button');
        b.type='button';
        b.className='rating-chip';
        b.textContent=String(i);
        b.dataset.value=String(i);
        b.addEventListener('click',()=>{
          select.value=String(i);
          select.dispatchEvent(new Event('change',{bubbles:true}));
          [...controls.children].forEach(x=>x.classList.toggle('active',x===b));
          caption.textContent=`${i} - ${labels[String(i)]}`;
          caption.classList.add('selected');
        });
        controls.appendChild(b);
      }
      const caption=document.createElement('span');
      caption.className='rating-choice-label';
      caption.textContent='Not rated — tap 1 to 5';
      label.appendChild(controls);
      label.appendChild(caption);
    });
  }

  const progressDialog=$('#progressDialog');
  if(progressDialog){
    new MutationObserver(enhanceRatings).observe(progressDialog,{childList:true,subtree:true});
    progressDialog.addEventListener('click',enhanceRatings);
  }
  setTimeout(enhanceRatings,300);

  function toast(msg){
    const t=$('#toast');
    if(!t){ alert(msg); return; }
    t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);
  }

  async function canvasBlob(){
    const canvas=$('#progressCardCanvas');
    if(!canvas) return null;
    return await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
  }
  function safeName(){
    const n=($('#clientName')?.textContent||'player').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return `coach-kyle-${n||'player'}-progress.png`;
  }
  async function reliableSave(e){
    e.preventDefault();e.stopImmediatePropagation();
    const blob=await canvasBlob();
    if(!blob){toast('Could not create the PNG.');return;}
    const filename=safeName();
    try{
      if(window.showSaveFilePicker){
        const handle=await window.showSaveFilePicker({suggestedName:filename,types:[{description:'PNG image',accept:{'image/png':['.png']}}]});
        const writable=await handle.createWritable();await writable.write(blob);await writable.close();
        toast('Progress card saved.');return;
      }
    }catch(err){if(err?.name==='AbortError')return;}

    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=filename;a.rel='noopener';a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    toast('Saving PNG… Check Downloads.');

    if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)){
      setTimeout(()=>{
        const w=window.open(url,'_blank','noopener');
        if(w) toast('If it did not download automatically, long-press the opened image and choose Save/Download image.');
      },500);
    }
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }

  const saveBtn=$('#downloadProgressCard');
  if(saveBtn){
    saveBtn.textContent='Save PNG';
    saveBtn.addEventListener('click',reliableSave,true);
  }
})();