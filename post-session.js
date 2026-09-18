(() => {
const URL='https://pnomsapqqkgcvkzknujc.supabase.co',KEY='sb_publishable_EokwTiLlK_qy2Upc_0j3hw_noRX84_q';
const db=window.supabase.createClient(URL,KEY),$=s=>document.querySelector(s);
const skills=[['serve','Serve'],['return_score','Return'],['forehand','Forehand'],['backhand','Backhand'],['dinking','Dinking'],['footwork','Footwork'],['positioning','Positioning'],['consistency','Consistency'],['strategy','Strategy'],['confidence','Confidence']];
let active=null,participants=[],drafts=new Map(),selectedClientId=null,paidBefore=0,balanceBefore=0;
const money=n=>'₱'+Number(n||0).toLocaleString('en-PH');
const pad=n=>String(n).padStart(2,'0'),ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hour=h=>`${h%12||12}:00 ${h<12?'AM':'PM'}`;
function toast(msg){const t=$('#toast');if(!t)return alert(msg);t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3200)}
function resetSkillButtons(){document.querySelectorAll('#postSkillFields [data-score]').forEach(b=>b.classList.remove('active'))}
function readCurrentDraft(){if(!selectedClientId)return;const note=$('#postProgressNote').value.trim();const scores={};skills.forEach(([k])=>{const x=document.querySelector(`#postSkillFields [data-skill="${k}"].active`);if(x)scores[k]=Number(x.dataset.score)});const has=note||Object.keys(scores).length;if(has)drafts.set(selectedClientId,{client_id:selectedClientId,scores,note});else drafts.delete(selectedClientId);renderDraftStatus()}
function loadDraft(id){selectedClientId=id;resetSkillButtons();$('#postProgressNote').value='';const d=drafts.get(id);if(d){for(const [k,v] of Object.entries(d.scores||{}))document.querySelector(`#postSkillFields [data-skill="${k}"][data-score="${v}"]`)?.classList.add('active');$('#postProgressNote').value=d.note||''}renderDraftStatus()}
function renderDraftStatus(){const names=participants.filter(p=>drafts.has(p.client_id)).map(p=>p.full_name);const el=$('#postProgressStatus');if(!names.length){el.className='post-progress-status';el.textContent='Progress is optional. No player assessment queued yet.'}else{el.className='post-progress-status ready';el.textContent=`Queued progress: ${names.join(', ')}`}}
function buildSkills(){const root=$('#postSkillFields');if(root.children.length)return;root.innerHTML=skills.map(([k,l])=>`<div class="post-skill-row"><span>${l}</span><div class="post-rating">${[1,2,3,4,5].map(n=>`<button type="button" data-skill="${k}" data-score="${n}">${n}</button>`).join('')}</div></div>`).join('');root.addEventListener('click',e=>{const b=e.target.closest('[data-score]');if(!b)return;const row=b.parentElement;row.querySelectorAll('[data-score]').forEach(x=>x.classList.toggle('active',x===b))})}
async function openWorkflow(id){try{
  const [{data:b,error:be},{data:parts,error:pe},{data:pays,error:payErr}]=await Promise.all([
    db.from('bookings').select('*').eq('id',id).single(),
    db.from('booking_participants').select('client_id,full_name,participant_order,is_primary').eq('booking_id',id).order('participant_order'),
    db.from('booking_payments').select('amount').eq('booking_id',id)
  ]);
  if(be)throw be;if(pe)throw pe;if(payErr)throw payErr;
  active=b;participants=(parts||[]).filter(p=>p.client_id);drafts=new Map();paidBefore=(pays||[]).reduce((s,x)=>s+Number(x.amount||0),0);balanceBefore=Math.max(0,Number(b.total_amount||0)-paidBefore);
  $('#postSessionTitle').textContent=b.client_name;
  $('#postSessionMeta').innerHTML=`${b.session_date} • ${hour(b.start_hour)}–${hour(b.end_hour)} • ${b.participant_count} player${b.participant_count>1?'s':''}`;
  $('#postTotal').textContent=money(b.total_amount);$('#postPaid').textContent=money(paidBefore);$('#postBalance').textContent=money(balanceBefore);$('#postPlayers').textContent=String(b.participant_count||participants.length||1);
  $('#postOutcome').value=b.session_outcome_note||'';$('#postPaymentAmount').value='';$('#postPaymentAmount').max=balanceBefore;$('#postPaymentMethod').value='Cash';$('#postPaymentDate').value=ymd(new Date());
  const alertEl=$('#postBalanceAlert');alertEl.className='post-balance-alert'+(balanceBefore<=0?' paid':'');alertEl.textContent=balanceBefore<=0?'Payment status: Fully paid.':'Payment status: '+money(balanceBefore)+' remaining. You can record a payment now or leave it blank.';
  $('#postPlayerSelect').innerHTML=participants.length?participants.map(p=>`<option value="${p.client_id}">${p.full_name}</option>`).join(''):'<option value="">No linked player profile</option>';
  selectedClientId=participants[0]?.client_id||null;loadDraft(selectedClientId);buildSkills();loadDraft(selectedClientId);$('#postSessionDialog').showModal();
}catch(e){toast(e.message||'Could not open session workflow.')}} 
document.addEventListener('click',e=>{const btn=e.target.closest?.('[data-complete]');if(!btn)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openWorkflow(btn.dataset.complete)},true);
$('#postPlayerSelect')?.addEventListener('change',e=>{readCurrentDraft();loadDraft(e.target.value||null)});
$('#queuePlayerProgress')?.addEventListener('click',()=>{readCurrentDraft();toast(drafts.has(selectedClientId)?'Player progress queued.':'No rating or note to queue.')});
$('#clearPlayerProgress')?.addEventListener('click',()=>{if(selectedClientId)drafts.delete(selectedClientId);resetSkillButtons();$('#postProgressNote').value='';renderDraftStatus()});
$('#closePostSession')?.addEventListener('click',()=>$('#postSessionDialog').close());
$('#cancelPostSession')?.addEventListener('click',()=>$('#postSessionDialog').close());
$('#completeSessionBtn')?.addEventListener('click',async()=>{if(!active)return;readCurrentDraft();const amount=Number($('#postPaymentAmount').value||0);if(amount<0)return toast('Payment amount cannot be negative.');if(amount>balanceBefore)return toast('Payment cannot exceed remaining balance.');if(amount>0&&!$('#postPaymentMethod').value)return toast('Choose a payment method.');
  const btn=$('#completeSessionBtn'),old=btn.textContent;btn.disabled=true;btn.textContent='Saving…';
  try{
    const {data,error}=await db.rpc('complete_session_v2',{
      p_booking_id:active.id,
      p_outcome_note:$('#postOutcome').value.trim()||null,
      p_payment_amount:amount,
      p_payment_method:amount>0?$('#postPaymentMethod').value:null,
      p_payment_date:$('#postPaymentDate').value||ymd(new Date()),
      p_progress_entries:[...drafts.values()]
    });
    if(error)throw error;
    $('#postSessionDialog').close();
    const progressCount=Number(data?.progress_saved_count||0),remaining=Number(data?.remaining_balance||0);
    toast(`Session completed${progressCount?' • '+progressCount+' progress update'+(progressCount>1?'s':''):''}${amount>0?' • payment recorded':''}${remaining>0?' • '+money(remaining)+' due':''}`);
    setTimeout(()=>location.reload(),900);
  }catch(e){toast(e.message||'Could not complete session.')}finally{btn.disabled=false;btn.textContent=old}
});
})();