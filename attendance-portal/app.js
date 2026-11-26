(() => {
 "use strict";
 const API=window.YC_ATTENDANCE_API||"", $=s=>document.querySelector(s), loginView=$("#loginView"), dashboard=$("#dashboardView"), children=$("#children");
 const tokenKey="ahmadiya_guardian_session_v1";
 let token=sessionStorage.getItem(tokenKey)||"",timer=null,busy=false;
 const names={football:"⚽ كرة القدم",karate:"🥋 الكاراتيه",kungfu:"🥊 الكونغ فو",nasheed:"🎙️ الإنشاد"};
 const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const publicBase=location.origin;
 function api(path,opts={}){return fetch(API+path,{...opts,headers:{"content-type":"application/json",...(opts.headers||{}),...(token?{authorization:"Bearer "+token}:{})}}).then(async r=>{let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||"تعذر الاتصال بالخدمة.");return d;});}
 function showDashboard(){loginView.classList.add("hidden");dashboard.classList.remove("hidden");$("#logout").classList.remove("hidden");}
 function showLogin(){dashboard.classList.add("hidden");loginView.classList.remove("hidden");$("#logout").classList.add("hidden");}
 const time=v=>v?new Intl.DateTimeFormat("ar-EG",{hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Africa/Cairo"}).format(new Date(v)):"—";
 function statusClass(code){return ["inside","left","absent","upcoming","no-training"].includes(code)?code:"no-training";}
 function playerQrUrl(p){
   const url=new URL("/attendance/qr.html",publicBase);
   url.searchParams.set("academy",p.academy);
   url.searchParams.set("player",p.id);
   return url.href;
 }
 function qrCard(p){
   const payload=playerQrUrl(p), qrSrc="https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data="+encodeURIComponent(payload);
   const name=escapeHtml(p.name),academy=escapeHtml(p.academyLabel||names[p.academy]||"");
   return '<section class="player-qr" data-qr-player="'+escapeHtml(p.id)+'">'+
    '<div class="player-qr-head"><div><span class="qr-eyebrow">رمز اللاعب الشخصي</span><h4>'+name+'</h4><small>'+academy+' · رقم اللاعب: '+escapeHtml(p.id)+'</small></div><span class="qr-lock">QR</span></div>'+
    '<div class="player-qr-body"><img class="player-qr-image" src="'+qrSrc+'" alt="رمز QR الخاص باللاعب '+name+'" loading="lazy"><div class="player-qr-help">اعرض الرمز عند الحضور أو احتفظ بالصورة على هاتفك. الرمز مرتبط بمعرّف هذا اللاعب فقط.</div></div>'+
    '<div class="player-qr-actions"><button type="button" class="qr-btn qr-download" data-qr-download="'+escapeHtml(p.id)+'">تنزيل الصورة</button><button type="button" class="qr-btn qr-whatsapp" data-qr-whatsapp="'+escapeHtml(p.id)+'">مشاركة واتساب</button><button type="button" class="qr-btn qr-print" data-qr-print="'+escapeHtml(p.id)+'">طباعة</button></div></section>';
 }
 function render(data){
  const list=data.players||[],inside=list.filter(x=>x.status?.code==="inside").length,left=list.filter(x=>x.status?.code==="left").length;
  $("#totalChildren").textContent=list.length;$("#insideCount").textContent=inside;$("#leftCount").textContent=left;
  $("#todayText").textContent="تاريخ اليوم: "+(data.date||"");
  if(!list.length){children.innerHTML='<div class="empty">لا توجد أسماء مرتبطة برقم هاتفك حتى الآن.<br>تواصل مع إدارة المركز لربط بيانات أبنائك.</div>';return;}
  children.innerHTML=list.map((p,i)=>{
   const s=p.status||{},photo=p.photo?'<img class="avatar" src="'+escapeHtml(p.photo)+'" alt="">':'<div class="avatar avatar-fallback">👦</div>';
   const schedule=p.schedule?'<div class="detail"><small>موعد التدريب</small><b>'+escapeHtml(p.schedule.fromTime||"—")+' – '+escapeHtml(p.schedule.toTime||"—")+'</b></div><div class="detail"><small>المكان</small><b>'+escapeHtml(p.schedule.location||"مركز شباب الأحمدية")+'</b></div>':'<div class="detail"><small>موعد التدريب</small><b>لا يوجد موعد مسجل اليوم</b></div><div class="detail"><small>الأكاديمية</small><b>'+escapeHtml(names[p.academy]||"")+'</b></div>';
   let duration="";
   if(s.code==="inside")duration='<div class="duration">بدأ التدريب الساعة <strong>'+time(s.checkInAt)+'</strong> · يتدرب منذ <strong>'+Number(s.minutes||0)+' دقيقة</strong></div>';
   else if(s.code==="left")duration='<div class="duration">الدخول <strong>'+time(s.checkInAt)+'</strong> · الخروج <strong>'+time(s.checkOutAt)+'</strong> · المدة <strong>'+Number(s.minutes||0)+' دقيقة</strong></div>';
   else if(s.code==="absent")duration='<div class="duration">موعد الحصة '+escapeHtml(s.fromTime||"")+(s.toTime?" – "+escapeHtml(s.toTime):"")+'</div>';
   else if(s.code==="upcoming")duration='<div class="duration">موعد البداية <strong>'+escapeHtml(s.fromTime||"")+'</strong></div>';
   return '<article class="child-card" style="animation-delay:'+(i*70)+'ms"><div class="child-head">'+photo+'<div class="child-info"><h3>'+escapeHtml(p.name)+'</h3><small>'+escapeHtml(p.group||p.age||"")+'</small><div class="academy">'+escapeHtml(names[p.academy]||p.academyLabel||"")+'</div></div></div><div class="status '+statusClass(s.code)+'">'+escapeHtml(s.label||"لا توجد حالة مسجلة")+'</div><div class="detail-grid">'+schedule+'</div>'+duration+qrCard(p)+'</article>';
  }).join("");
 }
 function qrImageUrl(id){const p=(window.__guardianPlayers||[]).find(x=>String(x.id)===String(id));return p? "https://api.qrserver.com/v1/create-qr-code/?size=720x720&margin=18&data="+encodeURIComponent(playerQrUrl(p)):null;}
 async function downloadQr(id){
   const src=qrImageUrl(id);if(!src)return;
   const p=window.__guardianPlayers.find(x=>String(x.id)===String(id));
   try{const response=await fetch(src);if(!response.ok)throw Error("تعذر تنزيل صورة الرمز");const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="QR-"+(p?.name||"player")+"-"+id+".png";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
   catch{window.open(src,"_blank","noopener");}
 }
 function shareQr(id){
   const src=qrImageUrl(id),p=window.__guardianPlayers.find(x=>String(x.id)===String(id));if(!src||!p)return;
   const message="رمز QR الخاص باللاعب "+p.name+" - "+(p.academyLabel||names[p.academy]||"")+"\n"+playerQrUrl(p)+"\nصورة الرمز: "+src;
   window.open("https://wa.me/?text="+encodeURIComponent(message),"_blank","noopener");
 }
 function printQr(id){
   const p=window.__guardianPlayers.find(x=>String(x.id)===String(id)),src=qrImageUrl(id);if(!p||!src)return;
   const w=window.open("","_blank","noopener,noreferrer");if(!w)return;
   w.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>QR '+escapeHtml(p.name)+'</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:30px;color:#172033}.card{max-width:430px;margin:auto;border:2px solid #ddd;border-radius:18px;padding:24px}img{width:280px;height:280px;object-fit:contain}h1{font-size:24px}p{color:#555}@media print{button{display:none}}</style><div class="card"><h1>مركز شباب الأحمدية</h1><h2>'+escapeHtml(p.name)+'</h2><p>'+escapeHtml(p.academyLabel||names[p.academy]||"")+' · رقم اللاعب '+escapeHtml(p.id)+'</p><img src="'+src+'" alt="QR"><p>رمز اللاعب الشخصي</p></div><script>window.onload=()=>window.print()<\/script></html>');
   w.document.close();
 }
 children.addEventListener("click",e=>{
   const d=e.target.closest("[data-qr-download]"),s=e.target.closest("[data-qr-whatsapp]"),p=e.target.closest("[data-qr-print]");
   if(d)downloadQr(d.dataset.qrDownload);else if(s)shareQr(s.dataset.qrWhatsapp);else if(p)printQr(p.dataset.qrPrint);
 });
 async function refresh(){
  if(!token||busy)return;busy=true;
  try{const data=await api("/api/guardian/status");window.__guardianPlayers=data.players||[];render(data);}
  catch(e){if(/جلسة المتابعة|رمز المتابعة/.test(e.message)){token="";sessionStorage.removeItem(tokenKey);clearInterval(timer);showLogin();$("#loginError").textContent=e.message;}else $("#todayText").textContent=e.message;}
  finally{busy=false;}
 }
 $("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();const btn=$("#loginBtn"),err=$("#loginError");btn.disabled=true;err.textContent="";
  try{const r=await api("/api/guardian/login",{method:"POST",headers:{},body:JSON.stringify({phone:$("#phone").value,code:$("#code").value})});token=r.token;sessionStorage.setItem(tokenKey,token);$("#code").value="";showDashboard();children.innerHTML='<div class="loading"><span class="loader"></span> جارٍ تحميل بيانات الأبناء…</div>';await refresh();clearInterval(timer);timer=setInterval(refresh,25000);}
  catch(x){err.textContent=x.message;}
  finally{btn.disabled=false;}
 });
 $("#refresh").addEventListener("click",refresh);
 $("#logout").addEventListener("click",()=>{token="";sessionStorage.removeItem(tokenKey);clearInterval(timer);showLogin();});
 if(token){showDashboard();refresh();timer=setInterval(refresh,25000);}else showLogin();
})();