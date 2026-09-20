(() => {
  const CONFIG={supabaseUrl:'https://pnomsapqqkgcvkzknujc.supabase.co',supabaseKey:'sb_publishable_EokwTiLlK_qy2Upc_0j3hw_noRX84_q',facebook:'https://www.facebook.com/kylepaulo13',startHour:8,endHour:22,baseRate:500,additionalPlayerRate:200,maxPlayers:12};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const pad=n=>String(n).padStart(2,'0');
  const keyDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const hourName=h=>`${h%12||12}:00 ${h<12?'AM':'PM'}`;
  const shortHour=h=>`${h%12||12}${h<12?'am':'pm'}`;

  let selectedStart=null,selectedEnd=null,scheduleMap=new Map(),submittedSignature=null,pendingRequestRef=null,requestVersion=0,hasSubmitted=false,availabilityLoading=false,lastAvailabilityRefresh=0;

  const dateInput=$('#date'),slots=$('#hourSlots'),players=$('#players'),status=$('#availabilityStatus'),summary=$('#requestSummary');
  const noStoreFetch=(input,init={})=>fetch(input,{...init,cache:'no-store'});
  const db=window.supabase?.createClient(CONFIG.supabaseUrl,CONFIG.supabaseKey,{global:{fetch:noStoreFetch}});

  function nav(){
    const btn=$('#menuBtn'),nav=$('#nav');
    if(!btn||!nav)return;
    btn.onclick=()=>nav.classList.toggle('open');
    $$('#nav a').forEach(a=>a.onclick=()=>nav.classList.remove('open'));
  }

  function minDate(){
    const today=new Date();
    dateInput.min=keyDate(today);
    if(!dateInput.value)dateInput.value=keyDate(today);
  }

  function rateFor(count){
    const n=Math.max(1,Math.min(CONFIG.maxPlayers,Number(count)||1));
    return CONFIG.baseRate+((n-1)*CONFIG.additionalPlayerRate);
  }
  function hourlyRate(){return rateFor(Number(players.value))}
  function durationHours(){return selectedStart!==null&&selectedEnd!==null?selectedEnd-selectedStart:0}
  function totalFee(){return hourlyRate()*durationHours()}

  function buildPlayerOptions(){
    if(!players)return;
    const current=Math.min(Number(players.value)||1,CONFIG.maxPlayers);
    players.innerHTML='';
    for(let i=1;i<=CONFIG.maxPlayers;i++){
      const opt=document.createElement('option');
      opt.value=String(i);
      opt.textContent=i===1?'1 player (1-on-1)':`${i} players`;
      players.appendChild(opt);
    }
    players.value=String(current);
  }

  function slotInfo(h){return scheduleMap.get(`${dateInput.value}|${h}`)||{status:'available',notes:'',publicReason:''}}
  function slotStatus(h){return slotInfo(h).status||'available'}
  function slotPublicReason(h){
    const info=slotInfo(h);
    const publicReason=String(info.publicReason||'').trim();
    if(publicReason){
      if(publicReason.startsWith('PRIVATE:'))return '';
      return publicReason.startsWith('PUBLIC:')?publicReason.slice(7).trim():publicReason;
    }
    const note=String(info.notes||'').trim();
    return note.startsWith('PUBLIC:')?note.slice(7).trim():'';
  }
  function isSlotOpen(h){return h>=CONFIG.startHour&&h<CONFIG.endHour&&slotStatus(h)==='available'}
  function isSelected(h){return selectedStart!==null&&selectedEnd!==null&&h>=selectedStart&&h<selectedEnd}

  function makeRequestRef(){
    return 'CKR-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
  }
  function ensureRequestRef(){
    if(!pendingRequestRef)pendingRequestRef=makeRequestRef();
    return pendingRequestRef;
  }
  function setRequestButtonState(kind){
    const btn=$('#sendRequest'),startNew=$('#startNewRequest');
    if(!btn)return;
    btn.classList.remove('request-sent');
    btn.disabled=false;
    if(kind==='sent'){
      btn.disabled=true;btn.classList.add('request-sent');btn.textContent='✓ Request Sent';
      startNew?.classList.remove('hidden-request-action');
    }else if(kind==='updated'){
      btn.disabled=true;btn.classList.add('request-sent');btn.textContent='✓ Request Updated';
      startNew?.classList.remove('hidden-request-action');
    }else if(kind==='update'){
      btn.textContent='Update Request';btn.onclick=sendRequest;
      startNew?.classList.remove('hidden-request-action');
    }else{
      btn.textContent='Send Request';btn.onclick=sendRequest;
      startNew?.classList.add('hidden-request-action');
    }
  }
  function resetSubmittedRequest(){
    if(!hasSubmitted)return;
    submittedSignature=null;
    setRequestButtonState('update');
  }

  function requestSignature(){
    const f=getForm();
    return JSON.stringify([f.name,f.contact,f.date,f.start,f.end,f.players,f.goal]);
  }

  function chooseHour(h){
    if(!isSlotOpen(h))return;
    resetSubmittedRequest();

    if(selectedStart===null||selectedEnd===null){
      selectedStart=h;
      selectedEnd=h+1;
    }else if(isSelected(h)){
      const dur=durationHours();
      if(dur===1){
        selectedStart=null;
        selectedEnd=null;
      }else if(h===selectedStart){
        selectedStart++;
      }else if(h===selectedEnd-1){
        selectedEnd--;
      }else{
        selectedStart=h;
        selectedEnd=h+1;
      }
    }else{
      const candidateStart=Math.min(selectedStart,h);
      const candidateEnd=Math.max(selectedEnd,h+1);
      let continuous=true;
      for(let x=candidateStart;x<candidateEnd;x++){
        if(!isSlotOpen(x)){continuous=false;break}
      }
      if(continuous){
        selectedStart=candidateStart;
        selectedEnd=candidateEnd;
      }else{
        selectedStart=h;
        selectedEnd=h+1;
      }
    }

    renderSlots();
    updateSummary();
    const dur=durationHours();
    if(dur){
      status.className='status ok';
      status.textContent=`${dur} hour${dur>1?'s':''} selected • ${hourName(selectedStart)} to ${hourName(selectedEnd)}.`;
    }else{
      status.className='status ok';
      status.textContent='No hours selected. Tap an available hour to begin.';
    }
  }

  function renderSlots(){
    slots.innerHTML='';
    for(let h=CONFIG.startHour;h<CONFIG.endHour;h++){
      const st=slotStatus(h),reason=slotPublicReason(h),b=document.createElement('button');
      b.type='button';
      b.className='slot hour-select-slot';
      b.innerHTML=`<span class="slot-time">${shortHour(h)} to ${shortHour(h+1)}</span>${st==='booked'?'<small>Booked</small>':st==='unavailable'?`<small>${reason||'Coach Unavailable'}</small>`:'<small>Available</small>'}`;

      if(st==='booked'||st==='unavailable'){
        b.disabled=true;
        b.classList.add(st==='booked'?'booked':'blocked');
      }else{
        if(isSelected(h))b.classList.add('selected','range-selected');
        b.onclick=()=>chooseHour(h);
      }
      slots.appendChild(b);
    }
  }

  async function loadAvailability({preserveSelection=false,quiet=false}={}){
    if(availabilityLoading)return false;
    availabilityLoading=true;
    const previousStart=selectedStart,previousEnd=selectedEnd;
    let selectionChanged=false;

    if(!preserveSelection){
      selectedStart=null;
      selectedEnd=null;
      scheduleMap=new Map();
      renderSlots();
    }

    if(!quiet){
      status.className='status';
      status.textContent='Checking live availability…';
    }

    if(!db){
      availabilityLoading=false;
      status.className='status warn';
      status.textContent='Live schedule could not load. Please refresh the schedule before sending a request.';
      return false;
    }

    try{
      const {data,error}=await db
        .from('public_schedule')
        .select('slot_date,start_hour,status,public_reason')
        .eq('slot_date',dateInput.value)
        .order('start_hour');
      if(error)throw error;

      const freshMap=new Map();
      (data||[]).forEach(r=>freshMap.set(`${r.slot_date}|${Number(r.start_hour)}`,{
        status:r.status,
        notes:'',
        publicReason:r.public_reason||''
      }));
      scheduleMap=freshMap;

      if(preserveSelection&&previousStart!==null&&previousEnd!==null){
        selectedStart=previousStart;
        selectedEnd=previousEnd;
        if(!selectedRangeAvailable()){
          selectedStart=null;
          selectedEnd=null;
          selectionChanged=true;
        }
      }

      renderSlots();
      lastAvailabilityRefresh=Date.now();
      const updated=$('#availabilityUpdated');
      if(updated)updated.textContent='Live • updated just now';

      const open=[...Array(CONFIG.endHour-CONFIG.startHour)].filter((_,i)=>isSlotOpen(CONFIG.startHour+i)).length;
      if(selectionChanged){
        status.className='status warn';
        status.textContent='The schedule changed and your selected hours are no longer available. Please choose another time.';
      }else if(selectedStart!==null&&selectedEnd!==null){
        status.className='status ok';
        status.textContent=`${durationHours()} hour${durationHours()===1?'':'s'} selected • ${hourName(selectedStart)} to ${hourName(selectedEnd)}. Live schedule refreshed.`;
      }else{
        status.className=open?'status ok':'status warn';
        status.textContent=open
          ? `${open} coaching hour${open===1?'':'s'} currently open. Tap one or more consecutive available hours.`
          : 'No open coaching hours on this date. Choose another date.';
      }
      updateSummary();
      return true;
    }catch(e){
      if(!quiet){
        status.className='status warn';
        status.textContent='Live schedule could not refresh. Please try again before sending a request.';
      }
      return false;
    }finally{
      availabilityLoading=false;
    }
  }

  function splitName(v){
    const parts=String(v||'').trim().replace(/\s+/g,' ').split(' ').filter(Boolean);
    if(parts.length<2)return null;
    return {first_name:parts.shift(),last_name:parts.join(' ')};
  }

  function participantList(){
    const primary=splitName($('#name').value);
    return primary?[{...primary,contact:$('#contact').value.trim()||null}]:[null];
  }

  function getForm(){
    return {
      name:$('#name').value.trim(),
      contact:$('#contact').value.trim(),
      date:dateInput.value,
      start:selectedStart,
      end:selectedEnd,
      duration:durationHours(),
      players:Number(players.value),
      goal:$('#goal').value
    };
  }

  function message(versionOverride=null){
    const f=getForm();
    if(!f.name||!f.date||f.start===null||f.end===null)return '';
    const d=new Date(`${f.date}T00:00:00`);
    const nice=d.toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    const ref=ensureRequestRef(),version=versionOverride??Math.max(1,requestVersion||1);
    return `Hi Coach Kyle! I would like to request a pickleball coaching session.

Booking Name: ${f.name}
Contact: ${f.contact||'Not provided'}
Date: ${nice}
Time: ${hourName(f.start)} - ${hourName(f.end)}
Duration: ${f.duration} hour${f.duration>1?'s':''}
Pax: ${f.players}
Hourly Coaching Rate: ₱${hourlyRate().toLocaleString('en-PH')}
Estimated Coaching Fee: ₱${totalFee().toLocaleString('en-PH')}
Goal: ${f.goal||'General coaching'}
Court Fee: Not included
Request Ref: ${ref}
Request Version: ${version}
Request Code: CKREQ|${f.date}|${f.start}|${f.end}|${f.players}

Please confirm if this schedule is available. Thank you!`;
  }

  function updateSummary(){
    const f=getForm(),parts=[];
    if(f.date)parts.push(f.date);
    if(f.duration>0){
      parts.push(`${hourName(f.start)}–${hourName(f.end)}`);
      parts.push(`${f.duration} hr${f.duration>1?'s':''}`);
    }else{
      parts.push('No hours selected');
    }
    parts.push(`${f.players} player${f.players>1?'s':''}`);
    parts.push(`₱${hourlyRate().toLocaleString('en-PH')}/hr`);
    if(f.duration>0)parts.push(`₱${totalFee().toLocaleString('en-PH')} total`);
    summary.innerHTML=`<strong>Current request</strong><br>${parts.join(' • ')}`;
  }

  async function copyText(text){
    try{await navigator.clipboard.writeText(text);return true}
    catch{
      const ta=document.createElement('textarea');
      ta.value=text;document.body.appendChild(ta);ta.select();
      const ok=document.execCommand('copy');ta.remove();return ok;
    }
  }

  function selectedRangeAvailable(){
    if(selectedStart===null||selectedEnd===null||selectedEnd<=selectedStart)return false;
    for(let h=selectedStart;h<selectedEnd;h++){
      if(!isSlotOpen(h))return false;
    }
    return true;
  }

  function validate(){
    const f=getForm();
    if(f.players<1||f.players>CONFIG.maxPlayers){alert(`Maximum ${CONFIG.maxPlayers} players per session.`);return false}
    if(!splitName(f.name)){alert('Please enter the booking name (first name and last name).');$('#name').focus();return false}
    if(f.duration<1){alert('Please select at least one available hour.');return false}
    if(!selectedRangeAvailable()){alert('One or more selected hours are no longer available. Please choose another time range.');return false}
    return true;
  }

  async function copyAndOpen(){
    if(!validate())return;
    const refreshed=await loadAvailability({preserveSelection:true,quiet:true});
    if(!refreshed){
      status.className='status warn';
      status.textContent='Could not verify the latest schedule. Tap Refresh schedule and try again.';
      return;
    }
    if(!validate())return;
    ensureRequestRef();
    const text=message(Math.max(1,requestVersion||1));
    await copyText(text);
    status.className='status ok';
    status.textContent='Booking details copied. Paste them in Messenger to Coach Kyle.';
    window.open(CONFIG.facebook,'_blank','noopener');
  }

  async function sendRequest(){
    if(!validate())return;
    const refreshed=await loadAvailability({preserveSelection:true,quiet:true});
    if(!refreshed){
      status.className='status warn';
      status.textContent='Could not verify the latest schedule. Tap Refresh schedule and try again.';
      return;
    }
    if(!validate())return;
    const updating=hasSubmitted;
    ensureRequestRef();
    const nextVersion=updating?requestVersion+1:1;
    const f=getForm(),text=message(nextVersion),btn=$('#sendRequest');
    btn.disabled=true;btn.textContent=updating?'Updating…':'Sending…';
    let sent=false;

    if(db){
      try{
        const type=f.players===1?'1-on-1':`${f.players} Players`;
        const payload={
          p_preferred_date:f.date,
          p_start_hour:f.start,
          p_end_hour:f.end,
          p_participant_count:f.players,
          p_coaching_type:`${type} • ${f.duration} Hour${f.duration>1?'s':''}`,
          p_quoted_rate:totalFee(),
          p_source_text:text,
          p_goal_focus:f.goal||null,
          p_program_interest:null,
          p_participants:participantList()
        };
        const {error}=await db.rpc('submit_public_inquiry_v17d',payload);
        if(!error)sent=true;else console.warn(error);
      }catch(e){console.warn(e)}
    }

    if(sent){
      requestVersion=nextVersion;
      hasSubmitted=true;
      submittedSignature=requestSignature();
      status.className='status ok';
      status.textContent=updating
        ? 'Request updated and sent to Coach Kyle Admin. The latest version will be used for review.'
        : 'Request sent to Coach Kyle Admin. Your schedule is subject to confirmation.';
      setRequestButtonState(updating?'updated':'sent');
    }else{
      status.className='status warn';
      status.textContent=`Could not ${updating?'update':'send'} this request. Please try again, or use Copy & Open Messenger.`;
      setRequestButtonState(updating?'update':'new');
    }
  }

  function startNewRequest(){
    pendingRequestRef=null;requestVersion=0;hasSubmitted=false;submittedSignature=null;
    selectedStart=null;selectedEnd=null;
    $('#name').value='';$('#contact').value='';$('#players').value='1';$('#goal').selectedIndex=0;
    renderSlots();updateSummary();
    status.className='status ok';
    status.textContent='New request started. Choose your preferred date and available hours.';
    setRequestButtonState('new');
  }

  function wire(){
    nav();buildPlayerOptions();minDate();renderSlots();
    dateInput.addEventListener('change',()=>{resetSubmittedRequest();loadAvailability()});
    players.addEventListener('change',()=>{resetSubmittedRequest();updateSummary()});
    ['name','contact','goal'].forEach(id=>$('#'+id).addEventListener('input',()=>{resetSubmittedRequest();updateSummary()}));
    $('#copyMessenger').onclick=copyAndOpen;
    $('#sendRequest').onclick=sendRequest;
    $('#startNewRequest')?.addEventListener('click',startNewRequest);
    $('#refreshAvailability')?.addEventListener('click',()=>loadAvailability({preserveSelection:true}));
    $('#scrollBooking').onclick=()=>$('#booking').scrollIntoView({behavior:'smooth'});
    $('#scrollRates').onclick=()=>$('#rates').scrollIntoView({behavior:'smooth'});

    const refreshWhenVisible=()=>{
      if(document.hidden)return;
      if(Date.now()-lastAvailabilityRefresh<5000)return;
      loadAvailability({preserveSelection:true,quiet:true});
    };
    window.addEventListener('pageshow',refreshWhenVisible);
    window.addEventListener('focus',refreshWhenVisible);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshWhenVisible()});
    setInterval(()=>{if(!document.hidden&&Date.now()-lastAvailabilityRefresh>=30000)loadAvailability({preserveSelection:true,quiet:true})},30000);

    loadAvailability();updateSummary();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();