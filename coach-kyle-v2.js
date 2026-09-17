(() => {
  const CONFIG={
    supabaseUrl:'https://pnomsapqqkgcvkzknujc.supabase.co',
    supabaseKey:'sb_publishable_EokwTiLlK_qy2Upc_0j3hw_noRX84_q',
    facebook:'https://www.facebook.com/kylepaulo13',
    phone:'09637600148',
    startHour:8,endHour:22,
    rates:{1:500,2:700,3:900,4:1100,5:1500}
  };
  const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
  const pad=n=>String(n).padStart(2,'0'); const keyDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const hourName=h=>`${h%12||12}:00 ${h<12?'AM':'PM'}`;
  let selectedHour=null, scheduleMap=new Map();
  const dateInput=$('#date'), slots=$('#slots'), players=$('#players'), status=$('#availabilityStatus'), summary=$('#requestSummary');
  const db=window.supabase?.createClient(CONFIG.supabaseUrl,CONFIG.supabaseKey);

  function nav(){const btn=$('#menuBtn'),nav=$('#nav'); if(!btn||!nav)return; btn.onclick=()=>nav.classList.toggle('open'); $$('#nav a').forEach(a=>a.onclick=()=>nav.classList.remove('open'));}
  function minDate(){const today=new Date(); dateInput.min=keyDate(today); if(!dateInput.value) dateInput.value=keyDate(today);}
  function renderSlots(){slots.innerHTML=''; const ds=dateInput.value; for(let h=CONFIG.startHour;h<CONFIG.endHour;h++){const st=scheduleMap.get(`${ds}|${h}`)||'available'; const b=document.createElement('button'); b.type='button'; b.className='slot'; b.textContent=hourName(h); if(st==='booked'||st==='unavailable'){b.disabled=true;b.classList.add(st==='booked'?'booked':'blocked');} else {b.onclick=()=>{selectedHour=h;renderSlots();updateSummary();}; if(selectedHour===h)b.classList.add('selected');} slots.appendChild(b);} }
  async function loadAvailability(){selectedHour=null; status.className='status'; status.textContent='Checking live availability…'; scheduleMap=new Map(); renderSlots(); if(!db){status.className='status warn';status.textContent='Live schedule could not load. You can still send Coach Kyle a request through Messenger.';return;} try{const {data,error}=await db.from('public_schedule').select('slot_date,start_hour,status').eq('slot_date',dateInput.value); if(error)throw error; (data||[]).forEach(r=>scheduleMap.set(`${r.slot_date}|${Number(r.start_hour)}`,r.status)); renderSlots(); const open=[...Array(CONFIG.endHour-CONFIG.startHour)].filter((_,i)=>(scheduleMap.get(`${dateInput.value}|${CONFIG.startHour+i}`)||'available')==='available').length; status.className=open?'status ok':'status warn'; status.textContent=open?`${open} coaching hour${open===1?'':'s'} currently open on this date.`:'No open coaching hours on this date. Choose another date.';}catch(e){renderSlots();status.className='status warn';status.textContent='Live schedule is temporarily unavailable. You can still send a schedule request and Coach Kyle will confirm it.';} updateSummary();}
  function getForm(){return {name:$('#name').value.trim(),contact:$('#contact').value.trim(),date:dateInput.value,hour:selectedHour,players:Number(players.value),goal:$('#goal').value};}
  function rate(){return CONFIG.rates[Number(players.value)]||0;}
  function message(){const f=getForm(); if(!f.name||!f.date||f.hour===null)return ''; const d=new Date(`${f.date}T00:00:00`); const nice=d.toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'}); return `Hi Coach Kyle! I would like to request a pickleball coaching session.\n\nName: ${f.name}\nContact: ${f.contact||'Not provided'}\nDate: ${nice}\nTime: ${hourName(f.hour)} - ${hourName(f.hour+1)}\nPlayers: ${f.players}\nCoaching Rate: ₱${rate().toLocaleString('en-PH')} total / hour\nGoal: ${f.goal||'General coaching'}\nCourt Fee: Not included\n\nPlease confirm if this schedule is available. Thank you!`;}
  function updateSummary(){const f=getForm(); const parts=[]; if(f.date)parts.push(f.date); if(f.hour!==null)parts.push(`${hourName(f.hour)}–${hourName(f.hour+1)}`); parts.push(`${f.players} player${f.players>1?'s':''}`); parts.push(`₱${rate().toLocaleString('en-PH')}/hr`); summary.innerHTML=`<strong>Current request</strong><br>${parts.join(' • ')}`;}
  async function copyText(text){try{await navigator.clipboard.writeText(text);return true}catch{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;}}
  function validate(){const f=getForm(); if(!f.name){alert('Please enter your name.');$('#name').focus();return false;} if(f.hour===null){alert('Please choose an available time.');return false;} return true;}
  async function copyAndOpen(){if(!validate())return; const text=message(); await copyText(text); status.className='status ok';status.textContent='Booking details copied. Paste them in Messenger to Coach Kyle.'; window.open(CONFIG.facebook,'_blank','noopener');}
  async function sendRequest(){if(!validate())return; const f=getForm(),text=message(),btn=$('#sendRequest'); const old=btn.textContent; btn.disabled=true;btn.textContent='Sending…'; let sent=false; if(db){try{const payload={p_preferred_date:f.date,p_start_hour:f.hour,p_end_hour:f.hour+1,p_participant_count:f.players,p_coaching_type:f.players===1?'1-on-1':`${f.players} Players`,p_quoted_rate:rate(),p_source_text:text,p_goal_focus:f.goal||null,p_program_interest:null,p_participants:[{first_name:f.name,last_name:'',contact:f.contact||null}]}; const {error}=await db.rpc('submit_public_inquiry_v17d',payload); if(!error)sent=true;}catch{}}
    if(sent){status.className='status ok';status.textContent='Request sent to Coach Kyle Admin. Your schedule is still subject to confirmation.';}else{await copyText(text);status.className='status warn';status.textContent='Direct request could not be saved, so the booking details were copied instead. Opening Messenger now.';window.open(CONFIG.facebook,'_blank','noopener');}
    btn.disabled=false;btn.textContent=old;
  }
  function wire(){nav();minDate();dateInput.addEventListener('change',loadAvailability);players.addEventListener('change',updateSummary);['name','contact','goal'].forEach(id=>$('#'+id).addEventListener('input',updateSummary));$('#copyMessenger').onclick=copyAndOpen;$('#sendRequest').onclick=sendRequest;$('#scrollBooking').onclick=()=>$('#booking').scrollIntoView({behavior:'smooth'});$('#scrollRates').onclick=()=>$('#rates').scrollIntoView({behavior:'smooth'}); loadAvailability();updateSummary();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
