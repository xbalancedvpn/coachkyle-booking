(() => {
const URL='https://pnomsapqqkgcvkzknujc.supabase.co',KEY='sb_publishable_EokwTiLlK_qy2Upc_0j3hw_noRX84_q';
const db=window.supabase.createClient(URL,KEY),$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let reportRows=[],confirmationBlob=null,confirmationBooking=null,notifyTimer=null;
const money=n=>'₱'+Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:0});
const pad=n=>String(n).padStart(2,'0'),ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hour=h=>`${h%12||12}:00 ${h<12?'AM':'PM'}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){const t=$('#toast');if(!t)return alert(msg);t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}
function today(){return ymd(new Date())}
function firstOfMonth(){const d=new Date();return ymd(new Date(d.getFullYear(),d.getMonth(),1))}
function sessionSizeLabel(n){n=Number(n||1);return n===1?'1-on-1':`+${n-1} (${n} pax)`}
function paymentState(row){
  if(row.paid<=0)return 'unpaid';
  if(row.paid+0.001<row.total)return 'partial';
  return 'paid';
}
function isAdvance(row){return row.paid>0&&row.session_status!=='completed'&&row.session_date>=today()}
function reportFilterMatch(row,filter){
  const state=paymentState(row);
  if(filter==='all')return true;
  if(filter==='paid')return state==='paid';
  if(filter==='unpaid')return state==='unpaid';
  if(filter==='partial')return state==='partial';
  if(filter==='advance')return isAdvance(row);
  if(filter==='completed_due')return row.session_status==='completed'&&row.balance>0;
  return true;
}
function wireAdminMenu(){
  const btn=$('#adminMenuBtn'),drawer=$('#adminNav'),backdrop=$('#adminNavBackdrop');
  if(!btn||!drawer)return;
  const close=()=>{drawer.classList.remove('open');backdrop?.classList.remove('open');btn.setAttribute('aria-expanded','false')};
  btn.onclick=()=>{const on=!drawer.classList.contains('open');drawer.classList.toggle('open',on);backdrop?.classList.toggle('open',on);btn.setAttribute('aria-expanded',String(on))};
  backdrop?.addEventListener('click',close);
  drawer.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
}
async function loadNotifications(){
  const bell=$('#adminNotifyBtn'),badge=$('#adminNotifyBadge'),list=$('#adminNotifyList');
  if(!bell||!list)return;
  try{
    const [{data:inq,error:ie},{data:completed,error:be}]=await Promise.all([
      db.from('inquiries').select('id,client_name,preferred_date,start_hour,end_hour,created_at').eq('status','new').order('created_at',{ascending:false}).limit(20),
      db.from('bookings').select('id,client_name,session_date,start_hour,end_hour,total_amount,session_status').eq('status','confirmed').eq('session_status','completed').order('session_date',{ascending:false}).limit(80)
    ]);
    if(ie)throw ie;if(be)throw be;
    const ids=(completed||[]).map(x=>x.id);
    const paidMap=new Map();
    if(ids.length){
      const {data:p,error:pe}=await db.from('booking_payments').select('booking_id,amount').in('booking_id',ids);
      if(pe)throw pe;
      (p||[]).forEach(x=>paidMap.set(x.booking_id,(paidMap.get(x.booking_id)||0)+Number(x.amount||0)));
    }
    const unpaid=(completed||[]).map(b=>({...b,paid:paidMap.get(b.id)||0})).filter(b=>Number(b.total_amount||0)-b.paid>0.001);
    const total=(inq||[]).length+unpaid.length;
    badge.textContent=String(total);
    badge.classList.toggle('hidden-badge',total===0);
    const parts=[];
    if(inq?.length){
      parts.push(`<div class="notify-group"><h4>New inquiries <span>${inq.length}</span></h4>${inq.slice(0,6).map(x=>`<a href="#inquiriesSection"><strong>${esc(x.client_name)}</strong><small>${esc(x.preferred_date||'No date')} • ${x.start_hour==null?'No time':hour(x.start_hour)+'–'+hour(x.end_hour)}</small></a>`).join('')}</div>`);
    }
    if(unpaid.length){
      parts.push(`<div class="notify-group"><h4>Completed • payment pending <span>${unpaid.length}</span></h4>${unpaid.slice(0,6).map(x=>`<a href="#reportsSection"><strong>${esc(x.client_name)}</strong><small>${esc(x.session_date)} • ${money(Number(x.total_amount||0)-x.paid)} due</small></a>`).join('')}</div>`);
    }
    list.innerHTML=parts.length?parts.join(''):'<div class="notify-empty">No items need attention.</div>';
    $('#attentionInquiries').textContent=String(inq?.length||0);
    $('#attentionCompletedDue').textContent=String(unpaid.length);
    $('#attentionPanel')?.classList.toggle('has-alerts',total>0);
  }catch(e){console.warn(e);list.innerHTML='<div class="notify-empty">Could not refresh notifications.</div>'}
}
function wireNotifications(){
  const btn=$('#adminNotifyBtn'),panel=$('#adminNotifyPanel');
  if(!btn||!panel)return;
  btn.addEventListener('click',e=>{e.stopPropagation();panel.classList.toggle('open')});
  document.addEventListener('click',e=>{if(!e.target.closest('#adminNotifyWrap'))panel.classList.remove('open')});
  loadNotifications();
  notifyTimer=setInterval(loadNotifications,60000);
}
function fitText(ctx,text,max,start,min=26){let s=start;while(s>min){ctx.font=`900 ${s}px Arial`;if(ctx.measureText(text).width<=max)return s;s-=2}return min}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.closePath()}
async function openConfirmationCard(id){
  try{
    const [{data:b,error:be},{data:p,error:pe}]=await Promise.all([
      db.from('bookings').select('*').eq('id',id).single(),
      db.from('booking_payments').select('amount').eq('booking_id',id)
    ]);
    if(be)throw be;if(pe)throw pe;
    confirmationBooking=b;
    const paid=(p||[]).reduce((s,x)=>s+Number(x.amount||0),0),total=Number(b.total_amount||0),balance=Math.max(0,total-paid);
    const canvas=$('#bookingConfirmationCanvas'),ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,1080,1350);ctx.fillStyle='#070707';ctx.fillRect(0,0,1080,1350);
    const g=ctx.createLinearGradient(0,0,1080,1350);g.addColorStop(0,'rgba(255,214,0,.2)');g.addColorStop(.42,'rgba(255,214,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1350);
    ctx.fillStyle='#FFD600';ctx.fillRect(0,0,1080,18);
    try{
      const logo=new Image();logo.src='assets/coach-kyle-main-logo.webp?v=7';await logo.decode();
      const scale=Math.min(300/logo.naturalWidth,180/logo.naturalHeight);ctx.drawImage(logo,72,50,logo.naturalWidth*scale,logo.naturalHeight*scale);
    }catch{}
    ctx.fillStyle='#FFD600';ctx.font='900 22px Arial';ctx.fillText('BOOKING CONFIRMATION',72,270);
    ctx.fillStyle='#fff';const fs=fitText(ctx,String(b.client_name||'CLIENT').toUpperCase(),930,62,34);ctx.font=`900 ${fs}px Arial`;ctx.fillText(String(b.client_name||'CLIENT').toUpperCase(),72,350);
    ctx.fillStyle='#aaa';ctx.font='700 22px Arial';ctx.fillText('Your coaching session is confirmed.',72,395);
    rounded(ctx,72,455,936,430,30);ctx.fillStyle='#111';ctx.fill();
    const rows=[
      ['DATE',new Date(b.session_date+'T12:00:00').toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'})],
      ['TIME',hour(b.start_hour)+' – '+hour(b.end_hour)],
      ['DURATION',(Number(b.end_hour)-Number(b.start_hour))+' hour'+(Number(b.end_hour)-Number(b.start_hour)>1?'s':'')],
      ['PLAYERS',String(b.participant_count||1)+' pax'],
      ['COACHING FEE',money(total)],
      ['PAYMENT',balance<=0?'Paid in full':paid>0?money(paid)+' paid • '+money(balance)+' balance':'Unpaid • '+money(balance)+' balance']
    ];
    let y=515;for(const [k,v] of rows){ctx.fillStyle='#777';ctx.font='800 16px Arial';ctx.fillText(k,110,y);ctx.fillStyle=k==='PAYMENT'?'#FFD600':'#fff';ctx.font='900 25px Arial';ctx.fillText(v,330,y);y+=62}
    ctx.fillStyle='#aaa';ctx.font='700 18px Arial';ctx.fillText('COURT FEE',110,945);ctx.fillStyle='#fff';ctx.font='900 24px Arial';ctx.fillText('Not included',330,945);
    rounded(ctx,72,1000,936,150,24);ctx.fillStyle='#101010';ctx.fill();ctx.fillStyle='#FFD600';ctx.font='900 20px Arial';ctx.fillText('COACH KYLE',105,1050);ctx.fillStyle='#ddd';ctx.font='700 18px Arial';ctx.fillText('Pickleball Coaching • Santiago City',105,1085);ctx.fillStyle='#888';ctx.font='700 16px Arial';ctx.fillText('Please message Coach Kyle on Facebook for changes or questions.',105,1120);
    ctx.fillStyle='#555';ctx.font='700 15px Arial';ctx.fillText('Generated from Coach Kyle Booking System',72,1295);
    confirmationBlob=await new Promise(r=>canvas.toBlob(r,'image/png',1));
    $('#bookingConfirmationDialog').showModal();
  }catch(e){toast(e.message||'Could not create confirmation card.')}
}
async function saveBlob(blob,name){
  if(!blob)return;
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function wireConfirmation(){
  document.addEventListener('click',e=>{const b=e.target.closest('[data-confirmation]');if(b)openConfirmationCard(b.dataset.confirmation)});
  $('#closeBookingConfirmation')?.addEventListener('click',()=>$('#bookingConfirmationDialog').close());
  $('#closeBookingConfirmationBottom')?.addEventListener('click',()=>$('#bookingConfirmationDialog').close());
  $('#saveBookingConfirmation')?.addEventListener('click',()=>saveBlob(confirmationBlob,`coach-kyle-${String(confirmationBooking?.client_name||'client').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-booking.png`));
  $('#shareBookingConfirmation')?.addEventListener('click',async()=>{
    if(!confirmationBlob)return;
    const file=new File([confirmationBlob],'coach-kyle-booking-confirmation.png',{type:'image/png'});
    if(navigator.canShare?.({files:[file]})){try{await navigator.share({title:'Coach Kyle Booking Confirmation',files:[file]});return}catch(e){if(e.name==='AbortError')return}}
    saveBlob(confirmationBlob,'coach-kyle-booking-confirmation.png');
  });
}
async function loadReport(){
  const from=$('#reportFrom').value,to=$('#reportTo').value,filter=$('#reportStatus').value;
  if(!from||!to)return toast('Select a report date range.');
  if(from>to)return toast('Start date must be before end date.');
  $('#reportTable').innerHTML='<div class="empty">Generating report…</div>';
  try{
    const {data:bookings,error}=await db.from('bookings').select('*').eq('status','confirmed').gte('session_date',from).lte('session_date',to).order('session_date').order('start_hour');
    if(error)throw error;
    const ids=(bookings||[]).map(x=>x.id),paidMap=new Map();
    if(ids.length){
      const {data:p,error:pe}=await db.from('booking_payments').select('booking_id,amount,paid_at,payment_method').in('booking_id',ids);
      if(pe)throw pe;
      (p||[]).forEach(x=>paidMap.set(x.booking_id,(paidMap.get(x.booking_id)||0)+Number(x.amount||0)));
    }
    reportRows=(bookings||[]).map(b=>{const total=Number(b.total_amount||0),paid=paidMap.get(b.id)||0;return {...b,total,paid,balance:Math.max(0,total-paid)}});

    const all=reportRows,shown=all.filter(r=>reportFilterMatch(r,filter));
    const confirmedValue=all.reduce((s,r)=>s+r.total,0);
    const collected=all.reduce((s,r)=>s+r.paid,0);
    const earned=all.filter(r=>r.session_status==='completed').reduce((s,r)=>s+Math.min(r.paid,r.total),0);
    const outstanding=all.reduce((s,r)=>s+r.balance,0);
    const advance=all.filter(isAdvance).reduce((s,r)=>s+r.paid,0);
    const paidFull=all.filter(r=>paymentState(r)==='paid');
    const paidCompleted=paidFull.filter(r=>r.session_status==='completed').length;
    const prepaid=paidFull.filter(isAdvance).length;

    $('#reportConfirmedValue').textContent=money(confirmedValue);
    $('#reportCollected').textContent=money(collected);
    $('#reportEarned').textContent=money(earned);
    $('#reportOutstanding').textContent=money(outstanding);
    $('#reportAdvance').textContent=money(advance);
    $('#reportPaidBreakdown').textContent=`${paidFull.length} fully paid (${paidCompleted} completed • ${prepaid} prepaid)`;
    $('#reportRangeLabel').textContent=`${from} to ${to} • ${shown.length} of ${all.length} sessions`;

    renderReportTable(shown);
    drawIncomeChart(all,from,to);
    drawSizeChart(all);
  }catch(e){$('#reportTable').innerHTML=`<div class="empty">${esc(e.message)}</div>`}
}
function renderReportTable(rows){
  if(!rows.length){$('#reportTable').innerHTML='<div class="empty">No sessions match this report filter.</div>';return}
  $('#reportTable').innerHTML=`<div class="report-table-scroll"><table class="report-table"><thead><tr><th>Date</th><th>Client</th><th>Size</th><th>Session</th><th>Fee</th><th>Paid</th><th>Balance</th><th>Collection</th></tr></thead><tbody>${rows.map(r=>{
    const ps=paymentState(r),advance=isAdvance(r);
    const label=ps==='paid'?(advance?'Paid • Prepayment':r.session_status==='completed'?'Paid • Done':'Paid'):ps==='partial'?'Partial':'Not collected';
    return `<tr><td>${esc(r.session_date)}</td><td><strong>${esc(r.client_name)}</strong><small>${hour(r.start_hour)}–${hour(r.end_hour)}</small></td><td>${esc(sessionSizeLabel(r.participant_count))}</td><td><span class="report-pill ${esc(r.session_status)}">${esc(r.session_status)}</span></td><td>${money(r.total)}</td><td>${money(r.paid)}</td><td>${money(r.balance)}</td><td><span class="report-pill ${ps}">${label}</span></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function barChart(canvas,labels,values,formatter=v=>String(v)){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#0b0b0b';ctx.fillRect(0,0,w,h);
  const padL=78,padR=30,padT=30,padB=78,max=Math.max(1,...values),innerW=w-padL-padR,innerH=h-padT-padB,n=Math.max(1,labels.length),step=innerW/n,bar=Math.min(54,step*.6);
  ctx.strokeStyle='#292929';ctx.lineWidth=1;for(let i=0;i<=4;i++){const y=padT+innerH*(i/4);ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(w-padR,y);ctx.stroke()}
  values.forEach((v,i)=>{const bh=innerH*(v/max),x=padL+i*step+(step-bar)/2,y=padT+innerH-bh;ctx.fillStyle='#FFD600';ctx.fillRect(x,y,bar,bh);ctx.fillStyle='#ddd';ctx.font='700 15px Arial';ctx.textAlign='center';ctx.fillText(formatter(v),x+bar/2,Math.max(20,y-8));ctx.save();ctx.translate(x+bar/2,h-20);ctx.rotate(-.45);ctx.fillStyle='#999';ctx.font='700 13px Arial';ctx.fillText(labels[i],0,0);ctx.restore()});
  ctx.textAlign='left';
}
function drawIncomeChart(rows,from,to){
  const map=new Map();
  rows.forEach(r=>{if(r.session_status!=='completed')return;map.set(r.session_date,(map.get(r.session_date)||0)+Math.min(r.paid,r.total))});
  const dates=[...map.keys()].sort(),labels=dates.length?dates:['No earned sessions'],vals=dates.length?dates.map(d=>map.get(d)):[0];
  barChart($('#incomeChart'),labels,vals,v=>money(v));
}
function drawSizeChart(rows){
  const map=new Map();rows.forEach(r=>{const k=sessionSizeLabel(r.participant_count);map.set(k,(map.get(k)||0)+1)});
  const labels=[...map.keys()].sort((a,b)=>{const an=a==='1-on-1'?1:Number((a.match(/\((\d+)/)||[])[1]||99),bn=b==='1-on-1'?1:Number((b.match(/\((\d+)/)||[])[1]||99);return an-bn});
  barChart($('#bookingSizeChart'),labels.length?labels:['No bookings'],labels.length?labels.map(k=>map.get(k)):[0],v=>String(v));
}
function csvEscape(s){s=String(s??'');return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function exportCsv(){
  const filter=$('#reportStatus').value,rows=reportRows.filter(r=>reportFilterMatch(r,filter));
  if(!rows.length)return toast('No report rows to export.');
  const lines=[['Date','Client','Time','Pax','Session Status','Fee','Paid','Balance','Payment Status'].join(',')];
  rows.forEach(r=>lines.push([r.session_date,r.client_name,`${hour(r.start_hour)}-${hour(r.end_hour)}`,r.participant_count,r.session_status,r.total,r.paid,r.balance,paymentState(r)].map(csvEscape).join(',')));
  const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'});saveBlob(blob,`coach-kyle-income-${$('#reportFrom').value}-to-${$('#reportTo').value}.csv`);
}
function wireReport(){
  if(!$('#reportFrom'))return;
  $('#reportFrom').value=firstOfMonth();$('#reportTo').value=today();
  $('#generateIncomeReport').addEventListener('click',loadReport);
  $('#reportStatus').addEventListener('change',()=>{if(reportRows.length){renderReportTable(reportRows.filter(r=>reportFilterMatch(r,$('#reportStatus').value)));}});
  $('#exportIncomeCsv').addEventListener('click',exportCsv);
  loadReport();
}
function init(){
  wireAdminMenu();wireNotifications();wireConfirmation();wireReport();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadNotifications()});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-confirm],[data-wait],[data-cancel],[data-payment],[data-complete],#savePaymentBtn,#confirmBookingBtn,#completeSessionBtn')){
      setTimeout(()=>{loadNotifications();if(reportRows.length)loadReport()},1400);
    }
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();