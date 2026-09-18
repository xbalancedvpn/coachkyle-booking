(() => {
  const CONFIG={supabaseUrl:'https://pnomsapqqkgcvkzknujc.supabase.co',supabaseKey:'sb_publishable_EokwTiLlK_qy2Upc_0j3hw_noRX84_q',facebook:'https://www.facebook.com/kylepaulo13',startHour:8,endHour:22,baseRate:500,additionalPlayerRate:200,maxPlayers:12};
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const pad=n=>String(n).padStart(2,'0');
  const keyDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const hourName=h=>`${h%12||12}:00 ${h<12?'AM':'PM'}`;
  const shortHour=h=>`${h%12||12}${h<12?'am':'pm'}`;

  let selectedStart=null,selectedEnd=null,scheduleMap=new Map();

  const dateInput=$('#date'),startSlots=$('#startSlots'),endSlots=$('#endSlots'),players=$('#players'),status=$('#availabilityStatus'),summary=$('#requestSummary');
  const db=window.supabase?.createClient(CONFIG.supabaseUrl,CONFIG.supabaseKey);

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

  function slotStatus(h){return scheduleMap.get(`${dateInput.value}|${h}`)||'available'}
  function isSlotOpen(h){return h>=CONFIG.startHour&&h<CONFIG.endHour&&slotStatus(h)==='available'}

  function maxEndFrom(start){
    let end=start;
    for(let h=start;h<CONFIG.endHour;h++){
      if(!isSlotOpen(h))break;
      end=h+1;
    }
    return end;
  }

  function renderStartSlots(){
    startSlots.innerHTML='';
    for(let h=CONFIG.startHour;h<CONFIG.endHour;h++){
      const st=slotStatus(h),b=document.createElement('button');
      b.type='button';
      b.className='slot time-point';
      b.innerHTML=`<span class="slot-time">${shortHour(h)}</span>${st==='booked'?'<small>Booked</small>':st==='unavailable'?'<small>Blocked</small>':'<small>Available</small>'}`;
      if(st==='booked'||st==='unavailable'){
        b.disabled=true;
        b.classList.add(st==='booked'?'booked':'blocked');
      }else{
        if(selectedStart===h)b.classList.add('selected','start-selected');
        if(selectedStart!==null&&selectedEnd!==null&&h>=selectedStart&&h<selectedEnd)b.classList.add('range-selected');
        b.onclick=()=>{
          selectedStart=h;
          selectedEnd=null;
          renderStartSlots();
          renderEndSlots();
          updateSummary();
          status.className='status ok';
          status.textContent=`Start selected: ${hourName(h)}. Now choose your end time.`;
        };
      }
      startSlots.appendChild(b);
    }
  }

  function renderEndSlots(){
    endSlots.innerHTML='';
    if(selectedStart===null){
      endSlots.innerHTML='<div class="end-time-hint">Select a start time first.</div>';
      return;
    }
    const maxEnd=maxEndFrom(selectedStart);
    if(maxEnd<=selectedStart){
      endSlots.innerHTML='<div class="end-time-hint">No valid end time is available from this start.</div>';
      return;
    }
    for(let h=selectedStart+1;h<=maxEnd;h++){
      const b=document.createElement('button');
      b.type='button';
      b.className='slot end-time-slot';
      b.innerHTML=`<span class="slot-time">${shortHour(h)}</span><small>${h-selectedStart} hr${h-selectedStart>1?'s':''}</small>`;
      if(selectedEnd===h)b.classList.add('selected');
      b.onclick=()=>{
        selectedEnd=h;
        renderStartSlots();
        renderEndSlots();
        updateSummary();
        status.className='status ok';
        status.textContent=`${hourName(selectedStart)} to ${hourName(selectedEnd)} selected • ${durationHours()} hour${durationHours()>1?'s':''}.`;
      };
      endSlots.appendChild(b);
    }
  }

  async function loadAvailability(){
    selectedStart=null;
    selectedEnd=null;
    status.className='status';
    status.textContent='Checking live availability…';
    scheduleMap=new Map();
    renderStartSlots();
    renderEndSlots();

    if(!db){
      status.className='status warn';
      status.textContent='Live schedule could not load. You can still send Coach Kyle a request through Messenger.';
      return;
    }
    try{
      const {data,error}=await db.from('public_schedule').select('slot_date,start_hour,status').eq('slot_date',dateInput.value);
      if(error)throw error;
      (data||[]).forEach(r=>scheduleMap.set(`${r.slot_date}|${Number(r.start_hour)}`,r.status));
      renderStartSlots();
      renderEndSlots();
      const open=[...Array(CONFIG.endHour-CONFIG.startHour)].filter((_,i)=>isSlotOpen(CONFIG.startHour+i)).length;
      status.className=open?'status ok':'status warn';
      status.textContent=open?`${open} coaching hour${open===1?'':'s'} currently open. Choose your start time, then choose your end time.`:'No open coaching hours on this date. Choose another date.';
    }catch(e){
      renderStartSlots();
      renderEndSlots();
      status.className='status warn';
      status.textContent='Live schedule is temporarily unavailable. You can still send Coach Kyle a request and he will confirm it.';
    }
    updateSummary();
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

  function message(){
    const f=getForm();
    if(!f.name||!f.date||f.start===null||f.end===null)return '';
    const d=new Date(`${f.date}T00:00:00`);
    const nice=d.toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
    return `Hi Coach Kyle! I would like to request a pickleball coaching session.\n\nBooking Name: ${f.name}\nContact: ${f.contact||'Not provided'}\nDate: ${nice}\nTime: ${hourName(f.start)} - ${hourName(f.end)}\nDuration: ${f.duration} hour${f.duration>1?'s':''}\nPax: ${f.players}\nHourly Coaching Rate: ₱${hourlyRate().toLocaleString('en-PH')}\nEstimated Coaching Fee: ₱${totalFee().toLocaleString('en-PH')}\nGoal: ${f.goal||'General coaching'}\nCourt Fee: Not included\n\nPlease confirm if this schedule is available. Thank you!`;
  }

  function updateSummary(){
    const f=getForm(),parts=[];
    if(f.date)parts.push(f.date);
    if(f.start!==null&&f.end!==null)parts.push(`${hourName(f.start)}–${hourName(f.end)}`);
    else if(f.start!==null)parts.push(`Start: ${hourName(f.start)}`);
    parts.push(`${f.players} player${f.players>1?'s':''}`);
    parts.push(`₱${hourlyRate().toLocaleString('en-PH')}/hr`);
    if(f.duration>0)parts.push(`${f.duration} hr${f.duration>1?'s':''} • ₱${totalFee().toLocaleString('en-PH')} total`);
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
    if(f.start===null){alert('Please choose a start time.');return false}
    if(f.end===null){alert('Please choose an end time.');return false}
    if(!selectedRangeAvailable()){alert('One or more hours in this session are no longer available. Please choose another time range.');return false}
    return true;
  }

  async function copyAndOpen(){
    if(!validate())return;
    const text=message();
    await copyText(text);
    status.className='status ok';
    status.textContent='Booking details copied. Paste them in Messenger to Coach Kyle.';
    window.open(CONFIG.facebook,'_blank','noopener');
  }

  async function sendRequest(){
    if(!validate())return;
    const f=getForm(),text=message(),btn=$('#sendRequest'),old=btn.textContent;
    btn.disabled=true;btn.textContent='Sending…';
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
        if(!error)sent=true; else console.warn(error);
      }catch(e){console.warn(e)}
    }
    if(sent){
      status.className='status ok';
      status.textContent='Request sent to Coach Kyle Admin. Your schedule is subject to confirmation.';
      btn.textContent='Request Sent';
      setTimeout(()=>{btn.disabled=false;btn.textContent=old},2500);
    }else{
      await copyText(text);
      status.className='status warn';
      status.textContent='Direct request could not be saved, so the booking details were copied. Opening Messenger now.';
      window.open(CONFIG.facebook,'_blank','noopener');
      btn.disabled=false;btn.textContent=old;
    }
  }

  function wire(){
    nav();buildPlayerOptions();minDate();renderStartSlots();renderEndSlots();
    dateInput.addEventListener('change',loadAvailability);
    players.addEventListener('change',updateSummary);
    ['name','contact','goal'].forEach(id=>$('#'+id).addEventListener('input',updateSummary));
    $('#copyMessenger').onclick=copyAndOpen;
    $('#sendRequest').onclick=sendRequest;
    $('#scrollBooking').onclick=()=>$('#booking').scrollIntoView({behavior:'smooth'});
    $('#scrollRates').onclick=()=>$('#rates').scrollIntoView({behavior:'smooth'});
    loadAvailability();updateSummary();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();