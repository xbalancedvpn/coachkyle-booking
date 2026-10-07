(() => {
const URL='https://pnomsapqqkgcvkzknujc.supabase.co',KEY='sb_publishable_EokwTiLlK_qy2Upc_0j3hw_noRX84_q';
const db=window.supabase.createClient(URL,KEY);
const CFG={base:500,extra:200,minHour:8,maxEnd:22,courts:['NANOMOLY','DINK VALLEY','HOMECOURT','CASA PLAY']};
const $=s=>document.querySelector(s),money=n=>'₱'+Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:0});
const hour=h=>(h%12||12)+':00 '+(h<12?'AM':'PM');
let target=null,paid=0,auto=true;
function rate(n){return CFG.base+Math.max(0,Number(n)-1)*CFG.extra}
function duration(){return Math.max(1,Number($('#editBookingEnd')?.value||0)-Number($('#editBookingStart')?.value||0))}
function currentTotal(){return Number($('#editBookingTotal')?.value||0)}
function courtsHtml(){return '<option value="">Not specified</option>'+CFG.courts.map(x=>'<option>'+x+'</option>').join('')+'<option value="OTHERS">OTHERS</option>'}
function fillHours(){
  const s=$('#editBookingStart'),e=$('#editBookingEnd');if(!s||!e)return;
  const startVal=Number(s.value||CFG.minHour),endVal=Number(e.value||startVal+1);
  s.innerHTML='';for(let h=CFG.minHour;h<CFG.maxEnd;h++){const o=document.createElement('option');o.value=h;o.textContent=hour(h);s.appendChild(o)}
  s.value=String(Math.min(CFG.maxEnd-1,Math.max(CFG.minHour,startVal)));
  const st=Number(s.value);e.innerHTML='';for(let h=st+1;h<=CFG.maxEnd;h++){const o=document.createElement('option');o.value=h;o.textContent=hour(h);e.appendChild(o)}
  e.value=String(Math.min(CFG.maxEnd,Math.max(st+1,endVal)));
}
function recalc(force=false){
  if(!target)return;if(force)auto=true;
  const n=Number($('#editBookingPlayers').value||1);
  if(auto)$('#editBookingTotal').value=String(rate(n)*duration());
  const total=currentTotal(),bal=Math.max(0,total-paid);
  $('#editBookingCalc').textContent=(auto?'Auto rate':'Custom fee')+' • '+duration()+' hr • '+n+' player'+(n===1?'':'s');
  $('#editBookingMoney').textContent=money(total)+' total • '+money(paid)+' collected • '+money(bal)+' balance';
}
function ensure(){
  if($('#editBookingDialog'))return;
  const d=document.createElement('dialog');d.id='editBookingDialog';d.className='edit-booking-dialog';
  let players='';for(let i=1;i<=12;i++)players+='<option value="'+i+'">'+i+' player'+(i===1?'':'s')+'</option>';
  d.innerHTML='<form id="editBookingForm" class="edit-booking-card">'+
    '<button type="button" class="edit-booking-x" data-edit-close>×</button>'+
    '<span class="eyebrow">EDIT CONFIRMED BOOKING</span><h2>Edit Booking</h2><p id="editBookingMeta" class="edit-booking-meta"></p>'+
    '<div class="edit-booking-grid">'+
      '<label>Date<input id="editBookingDate" type="date" required></label>'+
      '<label>Players<select id="editBookingPlayers">'+players+'</select></label>'+
      '<label>Start<select id="editBookingStart"></select></label>'+
      '<label>End<select id="editBookingEnd"></select></label>'+
      '<label>Court<select id="editBookingCourt">'+courtsHtml()+'</select></label>'+
      '<label id="editBookingCourtOtherWrap" class="hidden">Other court<input id="editBookingCourtOther" maxlength="120"></label>'+
    '</div>'+
    '<div class="edit-booking-fee"><label>Total coaching fee<input id="editBookingTotal" type="number" min="0" step="1"></label><button id="editBookingAuto" type="button" class="mini">Use Auto Rate</button><small id="editBookingCalc"></small><strong id="editBookingMoney"></strong></div>'+
    '<div id="editBookingError" class="edit-booking-error hidden"></div>'+
    '<div class="edit-booking-actions"><button type="button" class="ghost" data-edit-close>Cancel</button><button id="saveEditBooking" class="primary" type="submit">Save Changes</button></div>'+
  '</form>';
  document.body.appendChild(d);
  d.querySelectorAll('[data-edit-close]').forEach(x=>x.onclick=()=>d.close());
  $('#editBookingStart').onchange=()=>{fillHours();recalc()};
  $('#editBookingEnd').onchange=()=>recalc();
  $('#editBookingPlayers').onchange=()=>recalc();
  $('#editBookingTotal').oninput=()=>{auto=false;recalc()};
  $('#editBookingAuto').onclick=()=>recalc(true);
  $('#editBookingCourt').onchange=()=>$('#editBookingCourtOtherWrap').classList.toggle('hidden',$('#editBookingCourt').value!=='OTHERS');
  $('#editBookingForm').onsubmit=save;
}
async function open(id){
  ensure();
  const rb=await db.from('bookings').select('*').eq('id',id).maybeSingle();if(rb.error||!rb.data)return alert(rb.error?.message||'Booking not found.');
  const b=rb.data,rp=await db.from('booking_payments').select('amount').eq('booking_id',id);if(rp.error)return alert(rp.error.message);
  paid=(rp.data||[]).reduce((s,x)=>s+Number(x.amount||0),0)||Number(b.amount_paid||0);target=b;auto=b.rate_mode!=='custom';
  $('#editBookingMeta').textContent=b.client_name+' • '+b.session_date+' • '+hour(Number(b.start_hour))+'–'+hour(Number(b.end_hour));
  $('#editBookingDate').value=b.session_date;$('#editBookingPlayers').value=String(b.participant_count||1);
  fillHours();$('#editBookingStart').value=String(b.start_hour);fillHours();$('#editBookingEnd').value=String(b.end_hour);
  const c=String(b.court_name||'');if(CFG.courts.includes(c)){$('#editBookingCourt').value=c;$('#editBookingCourtOther').value=''}else if(c){$('#editBookingCourt').value='OTHERS';$('#editBookingCourtOther').value=c}else{$('#editBookingCourt').value='';$('#editBookingCourtOther').value=''}
  $('#editBookingCourtOtherWrap').classList.toggle('hidden',$('#editBookingCourt').value!=='OTHERS');
  $('#editBookingTotal').value=String(Number(b.total_amount||0));$('#editBookingError').classList.add('hidden');recalc(false);$('#editBookingDialog').showModal();
}
async function save(e){
  e.preventDefault();if(!target)return;
  const btn=$('#saveEditBooking'),err=$('#editBookingError'),date=$('#editBookingDate').value,start=Number($('#editBookingStart').value),end=Number($('#editBookingEnd').value),players=Number($('#editBookingPlayers').value),total=currentTotal();
  let court=$('#editBookingCourt').value;if(court==='OTHERS')court=$('#editBookingCourtOther').value.trim();
  if(total<paid)return showErr('New total cannot be lower than the amount already collected.');
  const old=btn.textContent;btn.disabled=true;btn.textContent='Saving…';err.classList.add('hidden');
  const res=await db.rpc('edit_confirmed_booking',{p_booking_id:target.id,p_session_date:date,p_start_hour:start,p_end_hour:end,p_participant_count:players,p_total_amount:total,p_rate_mode:auto?'standard':'custom',p_court:court||null});
  btn.disabled=false;btn.textContent=old;if(res.error)return showErr(res.error.message);
  $('#editBookingDialog').close();window.dispatchEvent(new CustomEvent('coach:data-changed',{detail:{type:'booking-edited',bookingId:target.id}}));$('#refreshBtn')?.click();showToast('Booking updated.');
}
function showErr(m){const e=$('#editBookingError');e.textContent=m;e.classList.remove('hidden')}
function showToast(m){let t=$('#editBookingToast');if(!t){t=document.createElement('div');t.id='editBookingToast';t.className='edit-booking-toast';document.body.appendChild(t)}t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function inject(){
  document.querySelectorAll('.booking-card,.payment-followup-card,.completed-session-card').forEach(card=>{
    const id=(card.id||'').replace(/^booking-card-|^payment-followup-/,'')||card.querySelector('[data-confirmation]')?.dataset.confirmation||card.querySelector('[data-followup-payment]')?.dataset.followupPayment;
    const actions=card.querySelector('.card-actions');if(!id||!actions||actions.querySelector('[data-edit-booking]'))return;
    const b=document.createElement('button');b.type='button';b.className='mini';b.dataset.editBooking=id;b.textContent='Edit Booking';actions.prepend(b);
  });
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-edit-booking]');if(b){e.preventDefault();open(b.dataset.editBooking)}});
new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});inject();
})();