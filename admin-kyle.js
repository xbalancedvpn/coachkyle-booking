(() => {
const URL='https://pnomsapqqkgcvkzknujc.supabase.co',KEY='sb_publishable_EokwTiLlK_qy2Upc_0j3hw_noRX84_q';
const db=window.supabase.createClient(URL,KEY),$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let activeInquiry=null,activePaymentBooking=null,activeClient=null,paymentTotals=new Map(),clientCache=[],listPreviewState={upcoming:false,past:false,payment:false,completed:false,clients:false};
const LIST_PREVIEW_LIMIT=3;
const pad=n=>String(n).padStart(2,'0'),ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,hour=h=>`${h%12||12}:00 ${h<12?'AM':'PM'}`,shortHour=h=>`${h%12||12}${h<12?'am':'pm'}`;
const skillDefs=[['serve','Serve'],['return_score','Return'],['forehand','Forehand'],['backhand','Backhand'],['dinking','Dinking'],['footwork','Footwork'],['positioning','Positioning'],['consistency','Consistency'],['strategy','Strategy'],['confidence','Confidence']];
function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),2800)}
function esc(s){return String(s??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]))}
function money(n){return `₱${Number(n||0).toLocaleString('en-PH')}`}
function applyListPreview(containerSelector,itemSelector,toggleSelector,key){
  const items=$(`${containerSelector} ${itemSelector}`),toggle=$(toggleSelector),expanded=Boolean(listPreviewState[key]);
  items.forEach((item,index)=>item.classList.toggle('list-preview-hidden',!expanded&&index>=LIST_PREVIEW_LIMIT));
  if(toggle){
    toggle.style.display=items.length>LIST_PREVIEW_LIMIT?'':'none';
    toggle.textContent=expanded?'Show Less':'Show All';
    toggle.setAttribute('aria-expanded',String(expanded));
  }
}
function toggleListPreview(containerSelector,itemSelector,toggleSelector,key){
  listPreviewState[key]=!listPreviewState[key];
  applyListPreview(containerSelector,itemSelector,toggleSelector,key);
}
function courtFromSource(row){
  if(row?.court_name)return String(row.court_name).trim();
  const m=String(row?.source_text||'').match(/^Court:\s*(.+)$/mi);
  return m?m[1].trim():'';
}
function manualCourtValue(){
  const choice=$('#manualBookingCourt')?.value||'';
  return choice==='OTHERS'?($('#manualBookingCourtOther')?.value.trim()||''):choice;
}
function splitFullName(name){const p=String(name||'').trim().replace(/\s+/g,' ').split(' ').filter(Boolean);return {first:p.shift()||'',last:p.join(' '),full:String(name||'').trim().replace(/\s+/g,' ')}}
function inquiryRequestMeta(i){
  const src=String(i?.source_text||'');
  const ref=(src.match(/^Request Ref:\s*(.+)$/mi)||[])[1]?.trim()||null;
  const version=Number((src.match(/^Request Version:\s*(\d+)$/mi)||[])[1]||0);
  return {ref,version};
}
function latestInquiryVersions(rows){
  const keep=new Map(),plain=[];
  for(const row of (rows||[])){
    const meta=inquiryRequestMeta(row);
    if(!meta.ref){plain.push(row);continue}
    const prev=keep.get(meta.ref);
    if(!prev||meta.version>inquiryRequestMeta(prev).version||(meta.version===inquiryRequestMeta(prev).version&&String(row.created_at||'')>String(prev.created_at||'')))keep.set(meta.ref,row);
  }
  return [...plain,...keep.values()].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
}
function completionDateKey(b){
  const raw=b?.session_closed_at;
  if(raw){const d=new Date(raw);if(!Number.isNaN(d.getTime()))return ymd(d)}
  return String(b?.session_date||'');
}
function wasCompletedEarly(b){
  if(b?.session_status!=='completed'||!b?.session_closed_at)return false;
  const closed=new Date(b.session_closed_at);
  if(Number.isNaN(closed.getTime()))return false;
  const closedDay=ymd(closed),sessionDay=String(b.session_date||'');
  if(closedDay<sessionDay)return true;
  if(closedDay>sessionDay)return false;
  const closedHour=closed.getHours()+(closed.getMinutes()/60);
  return closedHour<Number(b.end_hour||0);
}
function showAdmin(session){$('#loginView').classList.add('hidden');$('#adminView').classList.remove('hidden');$('#adminEmail').textContent=session.user.email||'';$('#scheduleDate').value=ymd(new Date());buildSkillFields();loadAll()}
function showLogin(){$('#adminView').classList.add('hidden');$('#loginView').classList.remove('hidden')}
async function init(){const {data:{session}}=await db.auth.getSession();session?showAdmin(session):showLogin()}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();$('#loginError').textContent='';const {data,error}=await db.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});if(error)return $('#loginError').textContent=error.message;showAdmin(data.session)});
async function logoutAdmin(){
  const buttons=[$('#logoutBtn'),$('#logoutNavBtn')].filter(Boolean);
  buttons.forEach(b=>{b.disabled=true});
  const {error}=await db.auth.signOut();
  if(error){
    buttons.forEach(b=>{b.disabled=false});
    return toast(error.message||'Could not sign out.');
  }
  $('#adminNav')?.classList.remove('open');
  $('#adminNavBackdrop')?.classList.remove('open');
  $('#adminMenuBtn')?.setAttribute('aria-expanded','false');
  if(location.hash)history.replaceState(null,'',location.pathname+location.search);
  showLogin();
  buttons.forEach(b=>{b.disabled=false});
}
$('#logoutBtn')?.addEventListener('click',logoutAdmin);
$('#logoutNavBtn')?.addEventListener('click',logoutAdmin);
$('#refreshBtn').onclick=loadAll;$('#scheduleDate').addEventListener('change',loadSchedule);$('#clientSearch').addEventListener('input',renderClientList);
$('#toggleUpcomingBookings')?.addEventListener('click',()=>toggleListPreview('#bookings','.booking-card','#toggleUpcomingBookings','upcoming'));
$('#togglePastSessions')?.addEventListener('click',()=>toggleListPreview('#pastSessionsList','.booking-card','#togglePastSessions','past'));
$('#togglePaymentFollowups')?.addEventListener('click',()=>toggleListPreview('#paymentFollowupList','.payment-followup-card','#togglePaymentFollowups','payment'));
$('#toggleCompletedSessions')?.addEventListener('click',()=>toggleListPreview('#completedSessionsList','.completed-session-card','#toggleCompletedSessions','completed'));
$('#toggleClientProfiles')?.addEventListener('click',()=>toggleListPreview('#clients','.client-card','#toggleClientProfiles','clients'));
async function repairConfirmedOrphanBookings(){
  const today=ymd(new Date());
  const {data:inquiries,error:ie}=await db.from('inquiries')
    .select('*')
    .eq('status','confirmed')
    .gte('preferred_date',today)
    .order('created_at',{ascending:false})
    .limit(100);
  if(ie||!inquiries?.length)return;

  for(const i of inquiries){
    if(i.start_hour==null||i.end_hour==null||!i.preferred_date)continue;

    const {data:existing,error:be}=await db.from('bookings')
      .select('id')
      .eq('status','confirmed')
      .eq('session_date',i.preferred_date)
      .eq('start_hour',i.start_hour)
      .eq('end_hour',i.end_hour)
      .ilike('client_name',i.client_name)
      .limit(1);
    if(be||existing?.length)continue;

    const {data:slots,error:se}=await db.from('schedule_slots')
      .select('*')
      .eq('slot_date',i.preferred_date)
      .gte('start_hour',i.start_hour)
      .lt('start_hour',i.end_hour)
      .order('start_hour');
    if(se)continue;

    const expected=Math.max(1,Number(i.end_hour)-Number(i.start_hour));
    const orphan=(slots||[]).filter(s=>
      s.status==='booked' &&
      !s.booking_id &&
      String(s.client_name||'').trim().toLowerCase()===String(i.client_name||'').trim().toLowerCase()
    );
    if(orphan.length!==expected)continue;

    const {data:participants,error:pe}=await db.from('inquiry_participants')
      .select('*')
      .eq('inquiry_id',i.id)
      .order('participant_order');
    if(pe)continue;

    const amount=Number(i.quoted_rate||orphan[0]?.rate||0);
    const pc=Number(i.participant_count||participants?.length||1);
    let bookingId=null;
    try{
      let primaryClientId=null;
      const clientRows=[];
      for(const p of (participants||[])){
        const c=await findOrCreateClient(p);
        if(p.is_primary||Number(p.participant_order)===1)primaryClientId=c.id;
        clientRows.push({client:c,participant:p});
      }

      const {data:b,error:insertErr}=await db.from('bookings').insert({
        session_date:i.preferred_date,
        start_hour:i.start_hour,
        end_hour:i.end_hour,
        client_name:i.client_name,
        contact:i.contact,
        participant_count:pc,
        coaching_type:i.coaching_type||`${pc} Player${pc>1?'s':''}`,
        rate_mode:'standard',
        rate_per_person:pc?amount/pc:amount,
        total_amount:amount,
        court_name:courtFromSource(i)||null,
        notes:i.notes||null,
        status:'confirmed',
        session_status:'scheduled',
        client_id:primaryClientId
      }).select('id').single();
      if(insertErr)throw insertErr;
      bookingId=b.id;

      if(clientRows.length){
        const bp=clientRows.map(({client:c,participant:p})=>({
          booking_id:bookingId,
          client_id:c.id,
          participant_order:p.participant_order,
          first_name:p.first_name,
          last_name:p.last_name,
          full_name:p.full_name,
          contact:p.contact||null,
          contact_key:p.contact_key||null,
          is_primary:!!p.is_primary
        }));
        const {error:bpe}=await db.from('booking_participants').insert(bp);
        if(bpe)throw bpe;
      }

      const {error:slotErr}=await db.from('schedule_slots')
        .update({booking_id:bookingId})
        .eq('slot_date',i.preferred_date)
        .gte('start_hour',i.start_hour)
        .lt('start_hour',i.end_hour)
        .is('booking_id',null);
      if(slotErr)throw slotErr;

      console.info('Recovered confirmed booking',bookingId,i.client_name);
    }catch(err){
      console.warn('Could not recover orphan booking',i?.id,err);
      if(bookingId){
        await db.from('booking_participants').delete().eq('booking_id',bookingId);
        await db.from('bookings').delete().eq('id',bookingId);
      }
    }
  }
}

async function loadAll(){
  await repairConfirmedOrphanBookings();
  await Promise.all([loadInquiries(),loadBookings(),loadPaymentFollowups(),loadCompletedSessions(),loadSchedule(),loadClients()]);
}
async function loadInquiries(){
  const {data,error}=await db.from('inquiries').select('*').in('status',['new','waiting','tentative']).order('created_at',{ascending:false}).limit(100);
  if(error)return $('#inquiries').innerHTML=`<div class="empty">${esc(error.message)}</div>`;
  const rows=latestInquiryVersions(data||[]);
  $('#metricInquiries').textContent=rows.length;
  $('#inquiries').innerHTML=rows.length?rows.map(i=>{
    const meta=inquiryRequestMeta(i);
    return `<article class="card"><div class="card-top"><div><h3>${esc(i.client_name)}</h3><div class="meta">${esc(i.preferred_date||'No date')} • ${i.start_hour==null?'No time':`${hour(i.start_hour)}–${hour(i.end_hour)}`}<br>${i.participant_count||1} player${Number(i.participant_count||1)>1?'s':''} • ${money(i.quoted_rate)} • ${esc(i.goal_focus||'General coaching')}<br><strong>Court:</strong> ${esc(courtFromSource(i)||'Not specified')}<br>${esc(i.contact||'No contact')}${meta.ref?`<br><span class="request-ref">Request ${esc(meta.ref)} • v${meta.version||1}</span>`:''}</div></div><span class="tag ${i.status==='new'?'new':''}">${esc(i.status)}</span></div><div class="card-actions"><button class="mini confirm" data-confirm="${i.id}">Confirm</button><button class="mini" data-wait="${i.id}">Mark Waiting</button><button class="mini" data-cancel="${i.id}">Cancel</button></div></article>`;
  }).join(''):'<div class="empty">No pending inquiries.</div>';
  rows.forEach(i=>{
    document.querySelector(`[data-confirm="${i.id}"]`)?.addEventListener('click',()=>openConfirm(i));
    document.querySelector(`[data-wait="${i.id}"]`)?.addEventListener('click',()=>setInquiry(i.id,'waiting'));
    document.querySelector(`[data-cancel="${i.id}"]`)?.addEventListener('click',()=>setInquiry(i.id,'cancelled'));
  });
}
async function setInquiry(id,status){const {error}=await db.from('inquiries').update({status}).eq('id',id);if(error)return toast(error.message);toast(`Inquiry marked ${status}.`);await loadInquiries();window.dispatchEvent(new CustomEvent('coach:data-changed',{detail:{type:'inquiry-status',inquiryId:id,status}}))}
function openConfirm(i){activeInquiry=i;$('#confirmTitle').textContent=i.client_name;$('#confirmMeta').innerHTML=`${esc(i.preferred_date)} • ${hour(i.start_hour)}–${hour(i.end_hour)}<br>${i.participant_count||1} player${Number(i.participant_count||1)>1?'s':''} • ${esc(i.coaching_type||'Coaching session')}<br><strong>Court:</strong> ${esc(courtFromSource(i)||'Not specified')}<br>${esc(i.contact||'No contact')}`;$('#confirmAmount').value=Number(i.quoted_rate||0);$('#confirmNote').value='';$('#confirmDialog').showModal()}
$('#confirmBookingBtn').onclick=confirmBooking;
async function findOrCreateClient(p){const full=String(p.full_name||`${p.first_name||''} ${p.last_name||''}`).trim().replace(/\s+/g,' '),contact=p.contact||null;let q=db.from('clients').select('*').ilike('full_name',full).eq('is_active',true);if(contact)q=q.eq('contact',contact);const {data:found}=await q.limit(1);if(found?.length)return found[0];const n=splitFullName(full),payload={first_name:p.first_name||n.first,last_name:p.last_name||n.last,full_name:full,name_key:full.toLowerCase(),contact,contact_key:contact?String(contact).trim().toLowerCase():null,is_active:true};const {data,error}=await db.from('clients').insert(payload).select('*').single();if(error)throw error;return data}
async function confirmBooking(){const i=activeInquiry;if(!i)return;const amount=Number($('#confirmAmount').value||0);if(i.start_hour==null||i.end_hour==null||!i.preferred_date)return toast('Inquiry has incomplete schedule details.');const {data:conflicts,error:ce}=await db.from('schedule_slots').select('start_hour,status').eq('slot_date',i.preferred_date).gte('start_hour',i.start_hour).lt('start_hour',i.end_hour).in('status',['booked','unavailable']);if(ce)return toast(ce.message);if(conflicts?.length)return toast('That time is no longer available.');const {data:participants,error:pe}=await db.from('inquiry_participants').select('*').eq('inquiry_id',i.id).order('participant_order');if(pe)return toast(pe.message);const pc=Number(i.participant_count||participants?.length||1);const {data:b,error}=await db.from('bookings').insert({session_date:i.preferred_date,start_hour:i.start_hour,end_hour:i.end_hour,client_name:i.client_name,contact:i.contact,participant_count:pc,coaching_type:i.coaching_type||`${pc} Player${pc>1?'s':''}`,rate_mode:'standard',rate_per_person:pc?amount/pc:amount,total_amount:amount,court_name:courtFromSource(i)||null,notes:$('#confirmNote').value.trim()||i.notes||null,status:'confirmed',session_status:'scheduled'}).select('id').single();if(error)return toast(error.message);try{const bp=[];let primaryClientId=null;for(const p of (participants||[])){const c=await findOrCreateClient(p);if(p.is_primary||Number(p.participant_order)===1)primaryClientId=c.id;bp.push({booking_id:b.id,client_id:c.id,participant_order:p.participant_order,first_name:p.first_name,last_name:p.last_name,full_name:p.full_name,contact:p.contact||null,contact_key:p.contact_key||null,is_primary:!!p.is_primary})}if(bp.length){const {error:e}=await db.from('booking_participants').insert(bp);if(e)throw e}if(primaryClientId)await db.from('bookings').update({client_id:primaryClientId}).eq('id',b.id);const rows=[];for(let h=i.start_hour;h<i.end_hour;h++)rows.push({slot_date:i.preferred_date,start_hour:h,status:'booked',client_name:i.client_name,contact:i.contact,coaching_type:i.coaching_type,rate:amount,booking_id:b.id});const {error:se}=await db.from('schedule_slots').upsert(rows,{onConflict:'slot_date,start_hour'});if(se)throw se;await db.from('inquiries').update({status:'confirmed'}).eq('id',i.id);
const reqMeta=inquiryRequestMeta(i);
if(reqMeta.ref){
  const {data:siblings}=await db.from('inquiries').select('id,source_text,status').neq('id',i.id).in('status',['new','waiting','tentative']);
  const stale=(siblings||[]).filter(x=>inquiryRequestMeta(x).ref===reqMeta.ref).map(x=>x.id);
  if(stale.length)await db.from('inquiries').update({status:'cancelled'}).in('id',stale);
}
$('#confirmDialog').close();toast('Booking confirmed. Client profiles updated.');
window.dispatchEvent(new CustomEvent('coach:data-changed',{detail:{type:'booking-confirmed',bookingId:b.id,inquiryId:i.id}}));
try{
  await loadAll();

  if(String(i.preferred_date||'')>ymd(new Date())){
    listPreviewState.upcoming=true;
    applyListPreview('#bookings','.booking-card','#toggleUpcomingBookings','upcoming');
  }

  const confirmationBtn=document.querySelector(`[data-confirmation="${CSS.escape(String(b.id))}"]`);
  if(confirmationBtn){
    confirmationBtn.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>confirmationBtn.click(),180);
  }else{
    toast('Booking confirmed. Use Show All in Upcoming Bookings if you need to view it.');
  }
}catch(uiErr){
  console.warn('Booking confirmed but admin refresh failed',uiErr);
  toast('Booking confirmed. Refresh the admin page to reload the lists.');
}
}catch(e){
  await db.from('schedule_slots').update({status:'available',client_name:null,contact:null,coaching_type:null,rate:null,booking_id:null}).eq('booking_id',b.id);
  await db.from('booking_participants').delete().eq('booking_id',b.id);
  await db.from('bookings').delete().eq('id',b.id);
  await db.from('inquiries').update({status:'new'}).eq('id',i.id);
  toast(e.message||'Could not finish booking confirmation.');
}}
async function loadBookings(){
  const today=ymd(new Date());
  const {data,error}=await db.from('bookings').select('*').eq('status','confirmed').order('session_date').order('start_hour').limit(400);
  if(error){
    $('#bookings').innerHTML=`<div class="empty">${esc(error.message)}</div>`;
    $('#todayBookings').innerHTML=`<div class="empty">${esc(error.message)}</div>`;
    if($('#pastSessionsList'))$('#pastSessionsList').innerHTML=`<div class="empty">${esc(error.message)}</div>`;
    return;
  }
  const ids=(data||[]).map(b=>b.id);
  paymentTotals=new Map();
  if(ids.length){
    const {data:p,error:pe}=await db.from('booking_payments').select('booking_id,amount').in('booking_id',ids);
    if(pe)return toast(pe.message);
    (p||[]).forEach(x=>paymentTotals.set(x.booking_id,(paymentTotals.get(x.booking_id)||0)+Number(x.amount||0)));
  }
  const rows=(data||[]).map(b=>{
    const paid=paymentTotals.get(b.id)||0,total=Number(b.total_amount||0);
    return {...b,paid,balance:Math.max(0,total-paid)};
  });
  const todays=rows.filter(b=>b.session_date===today&&(b.session_status!=='completed'||b.balance>0.001));
  const upcoming=rows.filter(b=>b.session_date>today&&b.session_status!=='completed');
  const pastPending=rows
    .filter(b=>b.session_date<today&&b.session_status!=='completed')
    .sort((a,b)=>String(b.session_date||'').localeCompare(String(a.session_date||''))||Number(a.start_hour||0)-Number(b.start_hour||0));
  $('#metricToday').textContent=String(todays.length);
  $('#metricBookings').textContent=String(upcoming.length);
  $('#metricBalance').textContent=money(rows.reduce((s,b)=>s+b.balance,0));
  if($('#pastSessionsCount'))$('#pastSessionsCount').textContent=String(pastPending.length);
  renderBookings(upcoming,todays,pastPending);
}
function isSessionEarly(b){const now=new Date(),d=ymd(now);if(String(b.session_date)>d)return true;if(String(b.session_date)<d)return false;const end=Number(b.end_hour||0),nowHour=now.getHours()+(now.getMinutes()/60);return end>nowHour}
function bookingCard(b,todayMode=false,pastMode=false){
  const paid=Number(b.paid??paymentTotals.get(b.id)??0),total=Number(b.total_amount||0),bal=Math.max(0,total-paid),payState=bal<=0?'Paid':paid>0?'Partial':'Unpaid',done=b.session_status==='completed',early=!done&&isSessionEarly(b),completedEarly=wasCompletedEarly(b),completeLabel=early?'Complete Early':'Mark Completed';
  const completionBtn=!done?`<button class="mini confirm" data-complete="${b.id}">${completeLabel}</button>`:'';
  const paymentBtn=bal>0?`<button class="mini" data-payment="${b.id}">Record Payment</button>`:'';
  const stateLabel=pastMode&&!done?'Past • Needs Completion':completedEarly?'Completed Early':(b.session_status||'scheduled');
  const cardClass=pastMode?' past-session-card':'';
  const stateClass=pastMode&&!done?' past-due':completedEarly?' completed-early':'';
  return `<article class="card booking-card${cardClass}" id="booking-card-${b.id}"><div class="card-top"><div><h3>${esc(b.client_name)}</h3><div class="meta">${esc(b.session_date)} • ${hour(b.start_hour)}–${hour(b.end_hour)}<br>${b.participant_count} player${b.participant_count>1?'s':''} • ${money(total)}<br><strong>Court:</strong> ${esc(b.court_name||'Not specified')}<br>${esc(b.contact||'No contact')}</div></div><div class="tag-stack"><span class="tag${stateClass}">${esc(stateLabel)}</span><span class="tag payment ${payState.toLowerCase()}">${payState}${bal?` • ${money(bal)} due`:''}</span></div></div><div class="card-actions">${completionBtn}${paymentBtn}<button class="mini confirm-card" data-confirmation="${b.id}">Confirmation PNG</button><button class="mini danger" data-cancel-booking="${b.id}">Cancel Booking</button></div></article>`;
}
function renderBookings(upcoming,todays,pastPending=[]){
  $('#todayBookings').innerHTML=todays.length?todays.map(b=>bookingCard(b,true,false)).join(''):'<div class="empty">No coaching sessions need attention today.</div>';
  $('#bookings').innerHTML=upcoming.length?upcoming.map(b=>bookingCard(b,false,false)).join(''):'<div class="empty">No upcoming confirmed bookings.</div>';
  if($('#pastSessionsList'))$('#pastSessionsList').innerHTML=pastPending.length?pastPending.map(b=>bookingCard(b,false,true)).join(''):'<div class="empty">No past sessions need completion.</div>';
  [...upcoming,...todays,...pastPending].forEach(b=>{
    document.querySelectorAll(`[data-cancel-booking="${b.id}"]`).forEach(x=>x.onclick=()=>cancelBooking(b));
    document.querySelectorAll(`[data-payment="${b.id}"]`).forEach(x=>x.onclick=()=>openPayment(b));
    document.querySelectorAll(`[data-complete="${b.id}"]`).forEach(x=>x.onclick=()=>setSessionStatus(b,'completed'));
  });
  applyListPreview('#bookings','.booking-card','#toggleUpcomingBookings','upcoming');
  applyListPreview('#pastSessionsList','.booking-card','#togglePastSessions','past');
}
async function setSessionStatus(b,status){
  const keepScroll=window.scrollY;
  if(status==='completed'){
    const early=isSessionEarly(b);
    const message=early
      ? `This session is scheduled for ${b.session_date} • ${hour(b.start_hour)}–${hour(b.end_hour)}. Marking it completed early will count the coaching fee as Earned Income even though the scheduled session has not ended yet. Continue?`
      : `Mark ${b.client_name}'s session as completed?`;
    if(!confirm(message))return;
  }
  if(location.hash)history.replaceState(null,'',location.pathname+location.search);
  const {error}=await db.from('bookings').update({session_status:status,session_closed_at:status==='completed'?new Date().toISOString():null}).eq('id',b.id);
  if(error)return toast(error.message);
  toast(status==='completed'?'Session marked completed. Earned Income will update.':'Session updated.');
  await Promise.all([loadBookings(),loadPaymentFollowups(),loadCompletedSessions(),loadClients()]);
  window.dispatchEvent(new CustomEvent('coach:data-changed',{detail:{type:'session-status',bookingId:b.id,status}}));
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:keepScroll,left:0,behavior:'auto'})));
}
function openPayment(b){activePaymentBooking=b;const paid=paymentTotals.get(b.id)||0,total=Number(b.total_amount||0),bal=Math.max(0,total-paid);$('#paymentTitle').textContent=b.client_name;$('#paymentMeta').innerHTML=`${esc(b.session_date)} • ${hour(b.start_hour)}–${hour(b.end_hour)}<br><strong>Court:</strong> ${esc(b.court_name||'Not specified')}`;$('#paymentTotal').textContent=money(total);$('#paymentPaid').textContent=money(paid);$('#paymentBalance').textContent=money(bal);$('#paymentAmount').value=bal||'';$('#paymentAmount').max=bal;$('#paymentDate').value=ymd(new Date());$('#paymentNote').value='';$('#paymentDialog').showModal()}
async function loadPaymentFollowups(){
  const list=$('#paymentFollowupList'),count=$('#paymentFollowupCount');
  if(!list)return;
  const today=ymd(new Date());
  const {data:bookings,error}=await db.from('bookings').select('*').eq('status','confirmed').eq('session_status','completed').order('session_closed_at',{ascending:false}).order('session_date',{ascending:false}).limit(300);
  if(error){list.innerHTML=`<div class="empty">${esc(error.message)}</div>`;if(count)count.textContent='0';return}
  const ids=(bookings||[]).map(b=>b.id),paidMap=new Map();
  if(ids.length){
    const {data:p,error:pe}=await db.from('booking_payments').select('booking_id,amount').in('booking_id',ids);
    if(pe){list.innerHTML=`<div class="empty">${esc(pe.message)}</div>`;if(count)count.textContent='0';return}
    (p||[]).forEach(x=>paidMap.set(x.booking_id,(paidMap.get(x.booking_id)||0)+Number(x.amount||0)));
  }
  const rows=(bookings||[]).map(b=>({...b,paid:paidMap.get(b.id)||0}))
    .filter(b=>Number(b.total_amount||0)-b.paid>0.001)
    .filter(b=>String(b.session_date)!==today);
  if(count)count.textContent=String(rows.length);
  list.innerHTML=rows.length?rows.map(b=>{
    const total=Number(b.total_amount||0),bal=Math.max(0,total-b.paid),state=b.paid>0?'Partial':'Unpaid',early=wasCompletedEarly(b);
    return `<article class="card payment-followup-card" id="payment-followup-${b.id}"><div class="card-top"><div><h3>${esc(b.client_name)}</h3><div class="meta">${esc(b.session_date)} • ${hour(b.start_hour)}–${hour(b.end_hour)}<br>${b.participant_count||1} player${Number(b.participant_count||1)>1?'s':''} • ${money(total)} total<br><strong>Court:</strong> ${esc(b.court_name||'Not specified')}<br>${money(b.paid)} paid • <strong>${money(bal)} due</strong></div></div><div class="tag-stack"><span class="tag ${early?'completed-early':''}">${early?'Completed Early':'Completed'}</span><span class="tag payment ${state.toLowerCase()}">${state}</span></div></div><div class="card-actions"><button class="mini confirm" data-followup-payment="${b.id}">Record Remaining Payment</button><button class="mini confirm-card" data-confirmation="${b.id}">Confirmation PNG</button></div></article>`;
  }).join(''):'<div class="empty">No completed sessions need payment follow-up.</div>';
  rows.forEach(b=>document.querySelector(`[data-followup-payment="${b.id}"]`)?.addEventListener('click',()=>{paymentTotals.set(b.id,b.paid);openPayment(b)}));
  applyListPreview('#paymentFollowupList','.payment-followup-card','#togglePaymentFollowups','payment');
}

async function loadCompletedSessions(){
  const list=$('#completedSessionsList'),count=$('#completedSessionsCount');
  if(!list)return;
  const {data:bookings,error}=await db.from('bookings').select('*').eq('status','confirmed').eq('session_status','completed').order('session_closed_at',{ascending:false}).order('session_date',{ascending:false}).limit(400);
  if(error){list.innerHTML=`<div class="empty">${esc(error.message)}</div>`;if(count)count.textContent='0';return}
  const ids=(bookings||[]).map(b=>b.id),paidMap=new Map();
  if(ids.length){
    const {data:p,error:pe}=await db.from('booking_payments').select('booking_id,amount').in('booking_id',ids);
    if(pe){list.innerHTML=`<div class="empty">${esc(pe.message)}</div>`;if(count)count.textContent='0';return}
    (p||[]).forEach(x=>paidMap.set(x.booking_id,(paidMap.get(x.booking_id)||0)+Number(x.amount||0)));
  }
  const rows=(bookings||[]).map(b=>{
    const paid=paidMap.get(b.id)||0,total=Number(b.total_amount||0);
    return {...b,paid,balance:Math.max(0,total-paid)};
  }).filter(b=>b.balance<=0.001)
    .sort((a,b)=>{
      const aKey=String(a.session_closed_at||a.session_date||''),bKey=String(b.session_closed_at||b.session_date||'');
      return bKey.localeCompare(aKey)||Number(b.start_hour||0)-Number(a.start_hour||0);
    });
  if(count)count.textContent=String(rows.length);
  list.innerHTML=rows.length?rows.map(b=>{
    const early=wasCompletedEarly(b);
    return `<article class="card completed-session-card"><div class="card-top"><div><h3>${esc(b.client_name)}</h3><div class="meta">${esc(b.session_date)} • ${hour(b.start_hour)}–${hour(b.end_hour)}<br>${b.participant_count||1} player${Number(b.participant_count||1)>1?'s':''} • ${money(b.total_amount)} collected<br><strong>Court:</strong> ${esc(b.court_name||'Not specified')}</div></div><div class="tag-stack"><span class="tag ${early?'completed-early':''}">${early?'Completed Early':'Completed'}</span><span class="tag payment paid">Paid</span></div></div><div class="card-actions"><button class="mini confirm-card" data-confirmation="${b.id}">Confirmation PNG</button></div></article>`;
  }).join(''):'<div class="empty">No fully settled completed sessions yet.</div>';
  applyListPreview('#completedSessionsList','.completed-session-card','#toggleCompletedSessions','completed');
}
$('#savePaymentBtn').onclick=savePayment;
async function savePayment(){
  const b=activePaymentBooking;if(!b)return;
  const amount=Number($('#paymentAmount').value||0),paid=paymentTotals.get(b.id)||0,bal=Math.max(0,Number(b.total_amount||0)-paid);
  if(amount<=0)return toast('Enter a valid payment amount.');
  if(amount>bal)return toast('Payment cannot be greater than the remaining balance.');
  const {error}=await db.from('booking_payments').insert({booking_id:b.id,amount,paid_at:$('#paymentDate').value,payment_method:$('#paymentMethod').value,note:$('#paymentNote').value.trim()||null,source:'manual'});
  if(error)return toast(error.message);
  $('#paymentDialog').close();
  toast('Payment recorded.');
  await Promise.all([loadBookings(),loadPaymentFollowups(),loadCompletedSessions(),loadClients()]);
  window.dispatchEvent(new CustomEvent('coach:data-changed',{detail:{type:'payment',bookingId:b.id}}));
}
const manualBookingState={slots:new Map(),autoAmount:0,rateOverridden:false};
function manualBookingRate(players){const n=Math.max(1,Number(players)||1);return 500+((n-1)*200)}
function manualBookingDuration(){const s=Number($('#manualBookingStart')?.value),e=Number($('#manualBookingEnd')?.value);return Number.isFinite(s)&&Number.isFinite(e)&&e>s?e-s:0}
function renderManualParticipantFields(){
  const n=Math.max(1,Number($('#manualBookingPlayers')?.value)||1),wrap=$('#manualParticipantFields');
  if(!wrap)return;
  if(n<=1){wrap.innerHTML='';return}
  let html='<div class="confirm-meta">Additional player names are optional. Add them if you want individual client profiles/history.</div>';
  for(let i=2;i<=n;i++)html+=`<label class="manual-participant-row"><span>${i}</span><input type="text" maxlength="120" data-manual-participant="${i}" placeholder="Player ${i} name (optional)"></label>`;
  wrap.innerHTML=html;
}
function buildManualPlayerOptions(){
  const el=$('#manualBookingPlayers');if(!el)return;
  el.innerHTML='';
  for(let i=1;i<=12;i++){const o=document.createElement('option');o.value=String(i);o.textContent=i===1?'1 player (1-on-1)':`${i} players`;el.appendChild(o)}
  el.value='1';
}
function refreshManualClientOptions(){
  const sel=$('#manualBookingClient');if(!sel)return;
  const current=sel.value;
  sel.innerHTML='<option value="">New client / not yet listed</option>'+clientCache.map(c=>`<option value="${esc(c.id)}">${esc(c.full_name)}${c.contact?' • '+esc(c.contact):''}</option>`).join('');
  if([...sel.options].some(o=>o.value===current))sel.value=current;
}
function manualSlotStatus(h){return manualBookingState.slots.get(Number(h))||'available'}
async function loadManualBookingAvailability(){
  const date=$('#manualBookingDate')?.value,start=$('#manualBookingStart'),end=$('#manualBookingEnd'),msg=$('#manualBookingAvailability');
  if(!date||!start||!end||!msg)return;
  start.innerHTML='<option value="">Loading…</option>';end.innerHTML='<option value="">Choose start time first</option>';end.disabled=true;
  const {data,error}=await db.from('schedule_slots').select('start_hour,status').eq('slot_date',date).order('start_hour');
  if(error){msg.className='manual-availability warn';msg.textContent=error.message;return}
  manualBookingState.slots=new Map((data||[]).map(r=>[Number(r.start_hour),r.status]));
  const open=[];for(let h=8;h<22;h++)if(manualSlotStatus(h)==='available')open.push(h);
  start.innerHTML='<option value="">Choose start time</option>'+open.map(h=>`<option value="${h}">${hour(h)}</option>`).join('');
  msg.className='manual-availability '+(open.length?'ok':'warn');
  msg.textContent=open.length?`${open.length} available hour${open.length>1?'s':''} on this date. Choose a start time.`:'No available coaching hours on this date.';
  updateManualBookingEndOptions();updateManualBookingSummary();
}
function updateManualBookingEndOptions(){
  const startEl=$('#manualBookingStart'),endEl=$('#manualBookingEnd'),msg=$('#manualBookingAvailability');
  if(!startEl||!endEl)return;
  const s=Number(startEl.value);
  endEl.innerHTML='';
  if(!Number.isFinite(s)||!startEl.value){endEl.innerHTML='<option value="">Choose start time first</option>';endEl.disabled=true;updateManualBookingSummary();return}
  const opts=[];
  for(let h=s;h<22;h++){if(manualSlotStatus(h)!=='available')break;opts.push(h+1)}
  endEl.innerHTML=opts.map(h=>`<option value="${h}">${hour(h)}</option>`).join('');
  endEl.disabled=!opts.length;
  if(opts.length)endEl.value=String(opts[0]);
  if(msg){msg.className='manual-availability ok';msg.textContent=`Available continuously from ${hour(s)} to ${hour(opts[opts.length-1])}. End time cannot cross a booked or blocked hour.`}
  syncManualAutoRate();
}
function syncManualAutoRate(force=false){
  const players=Math.max(1,Number($('#manualBookingPlayers')?.value)||1),dur=manualBookingDuration(),auto=manualBookingRate(players)*dur;
  manualBookingState.autoAmount=auto;
  const amount=$('#manualBookingAmount'),hint=$('#manualBookingRateHint');
  if(amount&&(!manualBookingState.rateOverridden||force)){amount.value=auto?String(auto):'';manualBookingState.rateOverridden=false}
  if(hint)hint.textContent=dur?`Auto rate: ${money(manualBookingRate(players))}/hour × ${dur} hour${dur>1?'s':''} = ${money(auto)}`:'Choose start and end time to calculate the coaching fee.';
  const payment=$('#manualBookingPayment');if(payment)payment.max=amount?.value||'0';
  updateManualBookingSummary();
}
function updateManualBookingSummary(){
  const box=$('#manualBookingSummary');if(!box)return;
  const name=$('#manualBookingName')?.value.trim()||'Client',date=$('#manualBookingDate')?.value||'No date',s=$('#manualBookingStart')?.value,e=$('#manualBookingEnd')?.value,n=Number($('#manualBookingPlayers')?.value||1),amount=Number($('#manualBookingAmount')?.value||0),pay=Number($('#manualBookingPayment')?.value||0),dur=manualBookingDuration(),court=manualCourtValue();
  box.innerHTML=`<strong>${esc(name)}</strong><br>${esc(date)} • ${s&&e?hour(Number(s))+'–'+hour(Number(e)):'Choose time'} • ${dur||0} hour${dur===1?'':'s'}<br>${n} player${n>1?'s':''} • Court: ${esc(court||'Not selected')}<br>${money(amount)} coaching fee${pay>0?' • '+money(pay)+' payment now':''}`;
}
async function openManualBooking(prefill=null){
  const dlg=$('#manualBookingDialog');if(!dlg)return;
  refreshManualClientOptions();buildManualPlayerOptions();
  $('#manualBookingForm').reset();
  $('#manualBookingClient').value='';
  const now=ymd(new Date());
  $('#manualBookingDate').removeAttribute('min');
  $('#manualBookingDate').value=prefill?.date||now;
  $('#manualBookingPaymentDate').value=prefill?.date&&prefill.date<now?prefill.date:now;
  $('#manualBookingPlayers').value=String(Math.max(1,Math.min(12,Number(prefill?.players)||1)));
  $('#manualBookingName').value=prefill?.name||'';
  $('#manualBookingContact').value=prefill?.contact||'';
  const prefillCourt=String(prefill?.court||'').trim();
  const knownCourts=['NANOMOLY','DINK VALLEY','HOMECOURT','CASA PLAY'];
  $('#manualBookingCourt').value=knownCourts.includes(prefillCourt)?prefillCourt:(prefillCourt?'OTHERS':'');
  $('#manualBookingCourtOther').value=knownCourts.includes(prefillCourt)?'':prefillCourt;
  $('#manualBookingCourtOtherWrap').style.display=$('#manualBookingCourt').value==='OTHERS'?'grid':'none';
  $('#manualBookingNote').value=prefill?.goal?('Goal: '+prefill.goal+(prefill.source?'\nSource: '+prefill.source:'')):(prefill?.source?('Source: '+prefill.source):'');
  manualBookingState.rateOverridden=false;manualBookingState.slots=new Map();
  $('#manualBookingAmount').value='';$('#manualBookingPayment').value='0';
  renderManualParticipantFields();
  dlg.showModal();
  await loadManualBookingAvailability();
  if(prefill?.start!=null){
    $('#manualBookingStart').value=String(prefill.start);
    updateManualBookingEndOptions();
    if(prefill?.end!=null&&[...$('#manualBookingEnd').options].some(o=>Number(o.value)===Number(prefill.end)))$('#manualBookingEnd').value=String(prefill.end);
  }
  syncManualAutoRate();
  if(prefill?.amount!=null&&Number.isFinite(Number(prefill.amount))){
    $('#manualBookingAmount').value=String(Number(prefill.amount));
    manualBookingState.rateOverridden=Number(prefill.amount)!==manualBookingState.autoAmount;
  }
  updateManualBookingSummary();
}
function closeManualBooking(){$('#manualBookingDialog')?.close()}
async function saveManualBooking(e){
  e?.preventDefault();
  const btn=$('#saveManualBooking'),name=$('#manualBookingName').value.trim().replace(/\s+/g,' '),contact=$('#manualBookingContact').value.trim(),date=$('#manualBookingDate').value,start=Number($('#manualBookingStart').value),end=Number($('#manualBookingEnd').value),players=Math.max(1,Number($('#manualBookingPlayers').value)||1),court=manualCourtValue(),amount=Number($('#manualBookingAmount').value||0),payment=Number($('#manualBookingPayment').value||0);
  if(name.length<2)return toast('Enter the client name.');
  if(!court)return toast('Select a court or enter the court name.');
  if(!date||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return toast('Choose a valid date and time.');
  if(amount<0)return toast('Enter a valid coaching fee.');
  if(payment<0||payment>amount)return toast('Payment cannot be greater than the coaching fee.');
  const old=btn.textContent;btn.disabled=true;btn.textContent='Creating…';
  let bookingId=null;
  try{
    const {data:conflicts,error:ce}=await db.from('schedule_slots').select('start_hour,status').eq('slot_date',date).gte('start_hour',start).lt('start_hour',end).in('status',['booked','unavailable']);
    if(ce)throw ce;if(conflicts?.length)throw new Error('One or more selected hours are no longer available. Please choose another time.');
    const selectedClient=clientCache.find(x=>String(x.id)===String($('#manualBookingClient').value));
    const primary=selectedClient||await findOrCreateClient({full_name:name,contact:contact||null});
    const {data:b,error:be}=await db.from('bookings').insert({session_date:date,start_hour:start,end_hour:end,client_name:name,contact:contact||null,participant_count:players,coaching_type:players===1?'1-on-1':`${players} Players`,rate_mode:manualBookingState.rateOverridden?'custom':'standard',rate_per_person:players?amount/players:amount,total_amount:amount,court_name:court,notes:$('#manualBookingNote').value.trim()||null,status:'confirmed',session_status:'scheduled',client_id:primary.id}).select('id').single();
    if(be)throw be;bookingId=b.id;
    const pRows=[{booking_id:bookingId,client_id:primary.id,participant_order:1,first_name:primary.first_name||splitFullName(name).first,last_name:primary.last_name||splitFullName(name).last,full_name:name,contact:contact||null,contact_key:contact?contact.toLowerCase():null,is_primary:true}];
    for(let i=2;i<=players;i++){
      const raw=document.querySelector(`[data-manual-participant="${i}"]`)?.value.trim().replace(/\s+/g,' ');
      if(!raw)continue;
      const pc=await findOrCreateClient({full_name:raw,contact:null}),parts=splitFullName(raw);
      pRows.push({booking_id:bookingId,client_id:pc.id,participant_order:i,first_name:pc.first_name||parts.first,last_name:pc.last_name||parts.last,full_name:raw,contact:null,contact_key:null,is_primary:false});
    }
    const {error:bpe}=await db.from('booking_participants').insert(pRows);if(bpe)throw bpe;
    const rows=[];for(let h=start;h<end;h++)rows.push({slot_date:date,start_hour:h,status:'booked',client_name:name,contact:contact||null,coaching_type:players===1?'1-on-1':`${players} Players`,rate:amount,booking_id:bookingId});
    const {error:se}=await db.from('schedule_slots').upsert(rows,{onConflict:'slot_date,start_hour'});if(se)throw se;
    if(payment>0){
      const paidAt=$('#manualBookingPaymentDate').value||ymd(new Date());
      const {error:pe}=await db.from('booking_payments').insert({booking_id:bookingId,amount:payment,paid_at:paidAt,payment_method:$('#manualBookingPaymentMethod').value,note:'Recorded during manual booking',source:'manual'});
      if(pe)throw pe;
    }
    const isPast=date<ymd(new Date());
    closeManualBooking();
    toast(isPast?'Past session created. Mark it completed to add it to Earned Income.':'Manual booking created and schedule blocked.');
    if($('#scheduleDate'))$('#scheduleDate').value=date;
    await loadAll();
    await loadSchedule();
    if(isPast){
      setTimeout(()=>document.querySelector('#pastSessionsSection')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
    }else{
      setTimeout(()=>document.querySelector(`[data-confirmation="${bookingId}"]`)?.click(),150);
    }
  }catch(err){
    if(bookingId){
      await db.from('booking_payments').delete().eq('booking_id',bookingId);
      await db.from('schedule_slots').delete().eq('booking_id',bookingId);
      await db.from('booking_participants').delete().eq('booking_id',bookingId);
      await db.from('bookings').delete().eq('id',bookingId);
    }
    toast(err.message||'Could not create the manual booking.');
    await loadManualBookingAvailability();
  }finally{btn.disabled=false;btn.textContent=old}
}
function parseBookingRequestText(text){
  const src=String(text||'').replace(/\r/g,'').trim();
  if(!src)return null;
  const grab=(label)=>{
    const pattern='^'+label+'\\s*:\\s*(.+)$';
    const m=src.match(new RegExp(pattern,'mi'));
    return m?m[1].trim():'';
  };
  const code=grab('Request Code');
  let date='',start=null,end=null,players=null;
  if(code){
    const m=code.match(/CKREQ\|([0-9]{4}-[0-9]{2}-[0-9]{2})\|(\d{1,2})\|(\d{1,2})\|(\d{1,2})/i);
    if(m){date=m[1];start=Number(m[2]);end=Number(m[3]);players=Number(m[4])}
  }
  if(!date){
    const raw=grab('Date');
    const d=raw?new Date(raw):null;
    if(d&&!Number.isNaN(d.getTime()))date=ymd(d);
  }
  if(start==null||end==null){
    const tm=grab('Time').match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)\s*-\s*(\d{1,2})(?::\d{2})?\s*(AM|PM)/i);
    const to24=(h,ampm)=>{const n=Number(h)%12;return n+(String(ampm).toUpperCase()==='PM'?12:0)};
    if(tm){start=to24(tm[1],tm[2]);end=to24(tm[3],tm[4])}
  }
  if(players==null){
    const pm=grab('Pax').match(/\d+/);
    if(pm)players=Number(pm[0]);
  }
  const feeRaw=grab('Estimated Coaching Fee').replace(/[^0-9.]/g,'');
  const amount=feeRaw?Number(feeRaw):null;
  return {
    name:grab('Booking Name'),
    contact:grab('Contact')==='Not provided'?'':grab('Contact'),
    date:date,
    start:start,
    end:end,
    players:players||1,
    court:grab('Court')||'',
    goal:grab('Goal')||'General coaching',
    amount:Number.isFinite(amount)?amount:null,
    source:'Messenger booking request'
  };
}
function openPasteBooking(){
  $('#pasteBookingText').value='';
  $('#pasteBookingStatus').className='manual-availability';
  $('#pasteBookingStatus').textContent='Waiting for a booking request.';
  $('#pasteBookingDialog').showModal();
  setTimeout(()=>$('#pasteBookingText')?.focus(),80);
}
function closePasteBooking(){$('#pasteBookingDialog')?.close()}
async function parseAndFillBooking(){
  const parsed=parseBookingRequestText($('#pasteBookingText').value);
  const status=$('#pasteBookingStatus');
  if(!parsed||!parsed.name||!parsed.date||parsed.start==null||parsed.end==null){
    status.className='manual-availability warn';
    status.textContent='Could not read the booking details. Paste the complete message copied from the Coach Kyle public site.';
    return;
  }
  closePasteBooking();
  await openManualBooking(parsed);
  toast('Booking request parsed. Review the details, then create the confirmed booking.');
}
function wireManualBooking(){
  const form=$('#manualBookingForm');if(!form)return;
  $('#openManualBookingBtn')?.addEventListener('click',()=>openManualBooking());
  $('#pasteBookingRequestBtn')?.addEventListener('click',openPasteBooking);
  $('#closePasteBooking')?.addEventListener('click',closePasteBooking);
  $('#cancelPasteBooking')?.addEventListener('click',closePasteBooking);
  $('#parseBookingRequest')?.addEventListener('click',parseAndFillBooking);
  $('#adminManualBookingLink')?.addEventListener('click',e=>{e.preventDefault();openManualBooking()});
  $('#closeManualBooking')?.addEventListener('click',closeManualBooking);
  $('#cancelManualBooking')?.addEventListener('click',closeManualBooking);
  $('#manualBookingDate')?.addEventListener('change',async()=>{
    const d=$('#manualBookingDate').value,now=ymd(new Date()),paymentDate=$('#manualBookingPaymentDate');
    if(paymentDate&&d&&d<now)paymentDate.value=d;
    await loadManualBookingAvailability();
  });
  $('#manualBookingStart')?.addEventListener('change',updateManualBookingEndOptions);
  $('#manualBookingEnd')?.addEventListener('change',()=>syncManualAutoRate());
  $('#manualBookingPlayers')?.addEventListener('change',()=>{renderManualParticipantFields();syncManualAutoRate()});
  $('#manualBookingCourt')?.addEventListener('change',()=>{const other=$('#manualBookingCourt').value==='OTHERS';$('#manualBookingCourtOtherWrap').style.display=other?'grid':'none';if(!other)$('#manualBookingCourtOther').value='';updateManualBookingSummary()});
  $('#manualBookingCourtOther')?.addEventListener('input',updateManualBookingSummary);
  $('#manualBookingName')?.addEventListener('input',updateManualBookingSummary);
  $('#manualBookingPayment')?.addEventListener('input',updateManualBookingSummary);
  $('#manualBookingAmount')?.addEventListener('input',()=>{
    manualBookingState.rateOverridden=Number($('#manualBookingAmount').value||0)!==manualBookingState.autoAmount;
    updateManualBookingSummary();
  });
  $('#resetManualBookingRate')?.addEventListener('click',()=>syncManualAutoRate(true));
  $('#manualBookingClient')?.addEventListener('change',()=>{
    const row=clientCache.find(x=>String(x.id)===String($('#manualBookingClient').value));
    if(row){
      $('#manualBookingName').value=row.full_name||'';
      $('#manualBookingContact').value=row.contact||'';
    }else{
      $('#manualBookingName').value='';
      $('#manualBookingContact').value='';
    }
    updateManualBookingSummary();
  });
  form.addEventListener('submit',saveManualBooking);
}
wireManualBooking();

async function cancelBooking(b){if(!confirm(`Cancel booking for ${b.client_name}?`))return;const {error}=await db.from('bookings').update({status:'cancelled',session_status:'cancelled',cancelled_at:new Date().toISOString()}).eq('id',b.id);if(error)return toast(error.message);await db.from('schedule_slots').delete().eq('booking_id',b.id);toast('Booking cancelled and hours reopened.');await loadAll();window.dispatchEvent(new CustomEvent('coach:data-changed',{detail:{type:'booking-cancelled',bookingId:b.id}}))}
let pendingBlockSlot=null;
function adminBlockReason(note){
  const s=String(note||'').trim();
  if(!s)return 'Coach Unavailable';
  if(s.startsWith('PUBLIC:'))return s.slice(7).trim()||'Coach Unavailable';
  if(s.startsWith('PRIVATE:'))return s.slice(8).trim()||'Coach Unavailable';
  return s;
}
function blockReasonKey(reason){
  const s=String(reason||'').trim().toLowerCase();
  if(s==='training')return 'training';
  if(s==='tournament')return 'tournament';
  if(s==='personal schedule')return 'personal';
  if(s==='rest day')return 'rest';
  if(s==='coach unavailable')return 'unavailable';
  return 'other';
}
async function loadSchedule(){
  const d=$('#scheduleDate').value||ymd(new Date());
  const {data,error}=await db.from('schedule_slots').select('*').eq('slot_date',d).order('start_hour');
  if(error)return $('#scheduleSlots').innerHTML=`<div class="empty">${esc(error.message)}</div>`;
  const map=new Map((data||[]).map(r=>[Number(r.start_hour),r]));
  if(d===ymd(new Date()))$('#metricBlocked').textContent=(data||[]).filter(r=>r.status==='unavailable').length;
  let html='';
  for(let h=8;h<22;h++){
    const r=map.get(h),st=r?.status||'available';
    const reason=st==='unavailable'?adminBlockReason(r?.notes):'';
    const reasonKey=st==='unavailable'?blockReasonKey(reason):'';
    const detail=st==='unavailable'?reason:st==='booked'?'Booked':'Available';
    const badgeClass=st==='unavailable'?` block-reason-badge reason-${reasonKey}`:'';
    const extraClass=st==='unavailable'?` block-${reasonKey}`:'';
    html+=`<button class="slot ${st}${extraClass}" data-hour="${h}" ${st==='booked'?'disabled':''}><span class="slot-time">${shortHour(h)} to ${shortHour(h+1)}</span><small class="slot-status${badgeClass}">${esc(detail)}</small></button>`;
  }
  const scheduleRoot=$('#scheduleSlots');
  scheduleRoot.innerHTML=html;
  scheduleRoot.onclick=e=>{
    const btn=e.target.closest('.slot:not([disabled])');
    if(!btn||!scheduleRoot.contains(btn))return;
    toggleSlot(d,Number(btn.dataset.hour),map.get(Number(btn.dataset.hour)));
  };
}
function openBlockReason(date,h){
  pendingBlockSlot={date:date,h:h};
  $('#blockReasonTime').textContent=`${date} • ${hour(h)}–${hour(h+1)}`;
  $('#blockReason').value='Coach Unavailable';
  $('#blockReasonOther').value='';
  $('#blockReasonOtherWrap').style.display='none';
  $('#blockReasonPublic').checked=true;
  $('#blockReasonDialog').showModal();
}
async function saveBlockReason(){
  if(!pendingBlockSlot)return;
  let reason=$('#blockReason').value;
  if(reason==='Other')reason=$('#blockReasonOther').value.trim()||'Coach Unavailable';
  const note=($('#blockReasonPublic').checked?'PUBLIC:':'PRIVATE:')+reason;
  const row={
    slot_date:pendingBlockSlot.date,
    start_hour:pendingBlockSlot.h,
    status:'unavailable',
    notes:note
  };
  const {error}=await db.from('schedule_slots').upsert(row,{onConflict:'slot_date,start_hour'});
  if(error)return toast(error.message);
  const blockedHour=pendingBlockSlot.h;
  $('#blockReasonDialog').close();
  pendingBlockSlot=null;
  toast(`${hour(blockedHour)} blocked • ${reason}.`);
  await loadSchedule();
}
async function toggleSlot(date,h,row){
  if(row?.status==='unavailable'){
    const {error}=await db.from('schedule_slots').delete().eq('id',row.id);
    if(error)return toast(error.message);
    toast(`${hour(h)} reopened.`);
    await loadSchedule();
  }else{
    openBlockReason(date,h);
  }
}
$('#blockReason')?.addEventListener('change',()=>{
  $('#blockReasonOtherWrap').style.display=$('#blockReason').value==='Other'?'grid':'none';
});
$('#closeBlockReason')?.addEventListener('click',()=>$('#blockReasonDialog').close());
$('#cancelBlockReason')?.addEventListener('click',()=>$('#blockReasonDialog').close());
$('#saveBlockReason')?.addEventListener('click',saveBlockReason);
async function loadClients(){const {data,error}=await db.from('clients').select('*').eq('is_active',true).order('full_name').limit(300);if(error){$('#clients').innerHTML=`<div class="empty">${esc(error.message)}</div>`;return}clientCache=data||[];$('#metricClients').textContent=clientCache.length;renderClientList()}
function openAddClientDialog(){const d=$('#addClientDialog');if(!d)return;$('#manualClientName').value='';$('#manualClientContact').value='';$('#manualClientNote').value='';d.showModal()}
function closeAddClientDialog(){const d=$('#addClientDialog');if(d?.open)d.close()}
$('#manualAddClientBtn')?.addEventListener('click',openAddClientDialog);
$('#closeAddClientDialog')?.addEventListener('click',closeAddClientDialog);
$('#cancelAddClient')?.addEventListener('click',closeAddClientDialog);
$('#addClientForm')?.addEventListener('submit',async e=>{e.preventDefault();const full=$('#manualClientName').value.trim().replace(/\s+/g,' '),contact=$('#manualClientContact').value.trim(),notes=$('#manualClientNote').value.trim();if(full.length<2)return toast('Enter the client full name.');const existing=clientCache.find(c=>c.is_active!==false&&String(c.full_name||'').trim().toLowerCase()===full.toLowerCase());if(existing){closeAddClientDialog();activeClient=existing;toast('Client already exists. Opening profile.');$('#clientName').textContent=existing.full_name;$('#clientMeta').textContent=existing.contact||'No contact saved';$('#clientDialog').showModal();await loadClientDetails();return}const n=splitFullName(full),payload={first_name:n.first||null,last_name:n.last||null,full_name:full,name_key:full.toLowerCase(),contact:contact||null,contact_key:contact?contact.toLowerCase():null,notes:notes||null,is_active:true};const btn=$('#saveManualClient'),old=btn.textContent;btn.disabled=true;btn.textContent='Adding…';try{const {data,error}=await db.from('clients').insert(payload).select('*').single();if(error)throw error;closeAddClientDialog();toast('Client added. You can now add a progress assessment.');await loadClients();activeClient=data;$('#clientName').textContent=data.full_name;$('#clientMeta').textContent=data.contact||'No contact saved';$('#clientDialog').showModal();await loadClientDetails()}catch(err){toast(err.message||'Could not add client.')}finally{btn.disabled=false;btn.textContent=old}});
function renderClientList(){const q=($('#clientSearch').value||'').trim().toLowerCase(),rows=clientCache.filter(c=>!q||c.full_name.toLowerCase().includes(q)||(c.contact||'').toLowerCase().includes(q));$('#clients').innerHTML=rows.length?rows.map(c=>`<button class="client-card" data-client="${c.id}"><span>${esc(c.full_name)}</span><small>${esc(c.contact||'No contact saved')}</small><b>View profile →</b></button>`).join(''):'<div class="empty">No matching clients.</div>';$('[data-client]').forEach(btn=>btn.onclick=()=>openClient(btn.dataset.client));applyListPreview('#clients','.client-card','#toggleClientProfiles','clients')}
async function openClient(id){activeClient=clientCache.find(c=>c.id===id);if(!activeClient)return;$('#clientName').textContent=activeClient.full_name;$('#clientMeta').textContent=activeClient.contact||'No contact saved';$('#clientDialog').showModal();await loadClientDetails()}
$('#closeClientDialog').onclick=()=>$('#clientDialog').close();
async function loadClientDetails(){if(!activeClient)return;const {data:bp,error}=await db.from('booking_participants').select('booking_id').eq('client_id',activeClient.id);if(error)return toast(error.message);const ids=[...new Set((bp||[]).map(x=>x.booking_id))];let sessions=[];if(ids.length){const {data}=await db.from('bookings').select('*').in('id',ids).order('session_date',{ascending:false}).order('start_hour',{ascending:false});sessions=data||[]}const completed=sessions.filter(x=>x.session_status==='completed').length,hours=sessions.filter(x=>x.status==='confirmed').reduce((s,x)=>s+(Number(x.end_hour)-Number(x.start_hour)),0);$('#clientStats').innerHTML=`<div><span>Total sessions</span><strong>${sessions.length}</strong></div><div><span>Completed</span><strong>${completed}</strong></div><div><span>Coaching hours</span><strong>${hours}</strong></div>`;$('#clientSessions').innerHTML=sessions.length?sessions.map(s=>`<div class="timeline-item"><strong>${esc(s.session_date)} • ${hour(s.start_hour)}–${hour(s.end_hour)}</strong><small>${esc(s.coaching_type||'Coaching')} • ${esc(s.session_status)} • ${money(s.total_amount)} • Court: ${esc(s.court_name||'Not specified')}</small>${s.session_outcome_note?`<p>${esc(s.session_outcome_note)}</p>`:''}</div>`).join(''):'<div class="empty">No session history yet.</div>';await loadProgress()}
async function loadProgress(){if(!activeClient)return;const {data,error}=await db.from('progress_assessments').select('*').eq('client_id',activeClient.id).order('assessment_date',{ascending:false}).order('created_at',{ascending:false}).limit(30);if(error)return $('#clientProgress').innerHTML=`<div class="empty">${esc(error.message)}</div>`;if(!data.length){$('#clientProgress').innerHTML='<div class="empty">No assessment yet.</div>';return}const latest=data[0],scores=skillDefs.map(([k,l])=>latest[k]!=null?`<div class="skill-score"><span>${l}</span><strong>${latest[k]}/5</strong></div>`:'').join('');$('#clientProgress').innerHTML=`<div class="progress-latest"><span class="eyebrow">LATEST • ${esc(latest.assessment_date)}</span><div class="skill-score-grid">${scores}</div>${latest.coach_note?`<p>${esc(latest.coach_note)}</p>`:''}</div><div class="assessment-history">${data.map(a=>`<div><strong>${esc(a.assessment_date)} • ${esc(a.assessment_type)}</strong><small>${a.coach_note?esc(a.coach_note):'No note'}</small></div>`).join('')}</div>`}
function buildSkillFields(){const x=$('#skillFields');if(!x||x.children.length)return;const labels={1:'Needs work',2:'Emerging',3:'Developing',4:'Proficient',5:'Strong'};x.innerHTML='<div class="rating-scale-legend">'+Object.entries(labels).map(([n,t])=>`<span><b>${n}</b>${t}</span>`).join('')+'</div>'+skillDefs.map(([k,l])=>`<label class="rating-field"><span class="rating-field-name">${l}</span><select id="skill_${k}" class="rating-native" aria-label="${l} rating"><option value="">Not rated</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n} - ${labels[n]}</option>`).join('')}</select><div class="rating-control" data-rating-for="${k}">${[1,2,3,4,5].map(n=>`<button type="button" class="rating-chip" data-rating-skill="${k}" data-rating-value="${n}" aria-label="${l}: ${n} - ${labels[n]}">${n}</button>`).join('')}</div><span class="rating-choice-label" id="rating_status_${k}">Not rated — tap 1 to 5</span></label>`).join('');x.addEventListener('click',e=>{const b=e.target.closest('[data-rating-skill]');if(!b)return;const k=b.dataset.ratingSkill,v=b.dataset.ratingValue,select=$('#skill_'+k),control=b.closest('.rating-control'),status=$('#rating_status_'+k);if(!select||!control)return;select.value=v;control.querySelectorAll('.rating-chip').forEach(btn=>btn.classList.toggle('active',btn===b));if(status){status.textContent=`${v} - ${labels[v]}`;status.classList.add('selected')}})}
function resetProgressRatings(){skillDefs.forEach(([k])=>{const s=$('#skill_'+k);if(s)s.value='';document.querySelectorAll(`[data-rating-skill="${k}"]`).forEach(b=>b.classList.remove('active'));const status=$('#rating_status_'+k);if(status){status.textContent='Not rated — tap 1 to 5';status.classList.remove('selected')}})}$('#addProgressBtn').onclick=()=>{if(!activeClient)return;buildSkillFields();$('#progressTitle').textContent=`Assess ${activeClient.full_name}`;$('#assessmentDate').value=ymd(new Date());$('#assessmentType').value='session';$('#assessmentNote').value='';resetProgressRatings();if($('#clientDialog').open)$('#clientDialog').close();$('#progressDialog').showModal()};const reopenClient=()=>{if(activeClient&&!$('#clientDialog').open)$('#clientDialog').showModal()};$('#closeProgressDialog').onclick=()=>{$('#progressDialog').close();reopenClient()};$('#cancelProgress').onclick=()=>{$('#progressDialog').close();reopenClient()};
$('#progressForm').addEventListener('submit',async e=>{e.preventDefault();if(!activeClient)return;const payload={client_id:activeClient.id,assessment_date:$('#assessmentDate').value,assessment_type:$('#assessmentType').value,assessment_source:'coach',coach_note:$('#assessmentNote').value.trim()||null};let rated=0;skillDefs.forEach(([k])=>{const v=$('#skill_'+k).value;if(v){payload[k]=Number(v);rated++}});if(!rated&&!payload.coach_note)return toast('Add at least one skill rating or a coach note.');const {error}=await db.from('progress_assessments').insert(payload);if(error)return toast(error.message);$('#progressDialog').close();reopenClient();toast('Progress assessment saved.');loadProgress()});
init();
})();