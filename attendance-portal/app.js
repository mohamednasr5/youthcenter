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
 const fmtDate=v=>v?new Intl.DateTimeFormat("ar-EG",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Africa/Cairo"}).format(new Date(v)):"—";
 function statusClass(code){return ["inside","left","absent","upcoming","no-training"].includes(code)?code:"no-training";}
 function playerQrUrl(p){return "AHMADIYAH|v1|"+p.barcodeToken;}
 function qrCard(p){
  const name=escapeHtml(p.name),academy=escapeHtml(p.academyLabel||names[p.academy]||"");
  if(p.barcodeActive===false||!p.barcodeToken){
   return '<section class="player-qr revoked"><div class="player-qr-head"><div><span class="qr-eyebrow">بطاقة الهوية الرقمية</span><h4>'+name+'</h4><small>'+academy+'</small></div><span class="qr-lock">⛔</span></div><div class="qr-revoked-note">بطاقة هذا اللاعب موقوفة مؤقتًا من إدارة المركز. تواصل مع إدارة الأكاديمية لإصدار بطاقة محدثة؛ سجلات الحضور السابقة محفوظة.</div></section>';
  }
  return '<section class="player-qr" data-qr-player="'+escapeHtml(p.id)+'">'+
   '<div class="player-qr-head"><div><span class="qr-eyebrow">بطاقة الهوية الرقمية — رمز دائم لا يتغير</span><h4>'+name+'</h4><small>'+academy+' · '+escapeHtml(p.barcodeId||"")+'</small></div><span class="qr-lock">QR</span></div>'+
   '<div class="player-qr-body"><canvas class="player-qr-image" data-player-qr="'+escapeHtml(p.id)+'"></canvas><div class="player-qr-help">ولي الأمر: '+escapeHtml(p.guardianPhone||"")+'<br>رمز حضور وانصراف موثّق'+(p.barcodeCreatedAt?' · أُنشئت '+escapeHtml(fmtDate(p.barcodeCreatedAt)):'')+'</div></div>'+
   '<div class="player-qr-actions"><button type="button" class="qr-btn qr-download" data-qr-download="'+escapeHtml(p.id)+'">تنزيل البطاقة</button><button type="button" class="qr-btn qr-whatsapp" data-qr-whatsapp="'+escapeHtml(p.id)+'">مشاركة واتساب</button><button type="button" class="qr-btn qr-print" data-qr-print="'+escapeHtml(p.id)+'">طباعة</button></div></section>';
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
  list.forEach(p=>{const canvas=children.querySelector('[data-player-qr="'+CSS.escape(String(p.id))+'"]');if(canvas&&window.QRCode&&p.barcodeToken)QRCode.toCanvas(canvas,playerQrUrl(p),{width:220,margin:2,errorCorrectionLevel:"H"}).catch(()=>{});});
 }
 function qrCanvas(id){return children.querySelector('[data-player-qr="'+CSS.escape(String(id))+'"]');}
 async function drawPortalCard(p){
  /* premium downloadable ID card for the guardian portal (mint/gold theme) */
  await ensureQrLibrary();
  const W=680,H=920,c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d");
  const rr=(r,X,Y,w,h)=>{x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath();};
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#14233c");g.addColorStop(1,"#0b1020");
  rr(34,0,0,W,H);x.fillStyle=g;x.fill();
  x.strokeStyle="#9be7cb";x.lineWidth=3;rr(26,10,10,W-20,H-20);x.stroke();
  x.textAlign="center";x.fillStyle="#9be7cb";x.font="900 30px Cairo,'Segoe UI',sans-serif";x.fillText("🏛️ مركز شباب الأحمدية",W/2,72);
  x.fillStyle="rgba(255,255,255,.6)";x.font="600 19px Cairo,sans-serif";x.fillText("بوابة ولي الأمر — بطاقة هوية اللاعب",W/2,102);
  x.font="800 23px Cairo,sans-serif";const chip="✅ "+(p.academyLabel||names[p.academy]||"");const cw=x.measureText(chip).width+56;
  rr(20,(W-cw)/2,128,cw,46,23);x.fillStyle="rgba(155,231,203,.15)";x.fill();x.strokeStyle="#9be7cb";x.lineWidth=1.6;x.stroke();x.fillStyle="#fff";x.fillText(chip,W/2,159);
  const img=await new Promise(res=>{if(!p.photo)return res(null);const i=new Image();i.crossOrigin="anonymous";i.onload=()=>res(i);i.onerror=()=>res(null);try{i.src=new URL(p.photo,location.href).href;}catch{res(null);}});
  const cx=W/2,cy=290,pr=82;x.save();x.beginPath();x.arc(cx,cy,pr+5,0,Math.PI*2);x.fillStyle="#9be7cb";x.fill();x.beginPath();x.arc(cx,cy,pr,0,Math.PI*2);x.clip();
  if(img){const s=Math.max(pr*2/img.width,pr*2/img.height);x.drawImage(img,cx-img.width*s/2,cy-img.height*s/2,img.width*s,img.height*s);}else{x.fillStyle="rgba(255,255,255,.15)";x.fillRect(cx-pr,cy-pr,pr*2,pr*2);x.font="700 58px Cairo,sans-serif";x.fillStyle="#fff";x.fillText(String(p.name||"؟").charAt(0),cx,cy+22);}
  x.restore();
  x.fillStyle="#fff";x.font="900 42px Cairo,sans-serif";x.fillText(String(p.name||"لاعب"),W/2,424);
  x.fillStyle="#aab5ca";x.font="600 20px Cairo,sans-serif";
  x.fillText((p.age?"السن: "+p.age+" · ":"")+"رقم الهوية: "+(p.barcodeId||"—"),W/2,462);
  x.fillText("ولي الأمر: "+(p.guardianPhone||"غير مربوط"),W/2,494);
  const q=document.createElement("canvas");await QRCode.toCanvas(q,playerQrUrl(p),{width:300,margin:2,errorCorrectionLevel:"H"});
  rr(16,(W-320)/2,530,320,320);x.fillStyle="#fff";x.fill();x.drawImage(q,(W-320)/2+10,540,300,300);
  x.font="600 17px Cairo,sans-serif";x.fillStyle="rgba(255,255,255,.55)";
  x.fillText("امسح هذا الرمز عند بوابة الأكاديمية لتسجيل الحضور والانصراف",W/2,884);
  return c;
 }
 function ensureQrLibrary(){
  if(window.QRCode)return Promise.resolve();
  if(window.__gQrPromise)return window.__gQrPromise;
  window.__gQrPromise=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js";s.onload=()=>window.QRCode?resolve():reject(Error("تعذر تحميل مكتبة QR."));s.onerror=()=>reject(Error("تعذر تحميل مكتبة QR."));document.head.appendChild(s);});return window.__gQrPromise;
 }
 async function downloadQr(id){
  const p=(window.__guardianPlayers||[]).find(x=>String(x.id)===String(id)),canvas=qrCanvas(id);if(!p||!canvas)return;
  try{
   const card=await drawPortalCard(p);
   const a=document.createElement("a");a.href=card.toDataURL("image/png");a.download="بطاقة-"+(p.name||"player")+"-"+(p.barcodeId||id)+".png";a.click();
  }catch(e){
   const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download="QR-"+(p.name||"player")+"-"+(p.barcodeId||id)+".png";a.click();
  }
 }
 async function shareQr(id){
  const p=(window.__guardianPlayers||[]).find(x=>String(x.id)===String(id)),canvas=qrCanvas(id);if(!p||!canvas)return;
  const message="بطاقة QR الخاصة باللاعب "+p.name+" - "+(p.academyLabel||names[p.academy]||"")+" - رقم الهوية "+(p.barcodeId||"");
  canvas.toBlob(async blob=>{
   if(blob&&navigator.canShare&&navigator.share){const file=new File([blob],"QR-"+(p.barcodeId||id)+".png",{type:"image/png"});try{if(navigator.canShare({files:[file]})){await navigator.share({title:"بطاقة اللاعب",text:message,files:[file]});return;}}catch{}}
   window.open("https://wa.me/?text="+encodeURIComponent(message+"\\nيمكن تنزيل صورة البطاقة من بوابة ولي الأمر."),"_blank","noopener");
  },"image/png");
 }
 function printQr(id){
  const p=(window.__guardianPlayers||[]).find(x=>String(x.id)===String(id)),canvas=qrCanvas(id);if(!p||!canvas)return;
  const w=window.open("","_blank");if(!w)return;const src=canvas.toDataURL("image/png");
  w.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>بطاقة '+escapeHtml(p.name)+'</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:30px;color:#172033}.card{max-width:430px;margin:auto;border:2px solid #ddd;border-radius:18px;padding:24px}img{width:280px;height:280px;object-fit:contain}h1{font-size:24px}p{color:#555}</style><div class="card"><h1>مركز شباب الأحمدية</h1><h2>'+escapeHtml(p.name)+'</h2><p>'+escapeHtml(p.academyLabel||names[p.academy]||"")+'</p><p>ولي الأمر: '+escapeHtml(p.guardianPhone||"")+'</p><p>رقم الهوية: '+escapeHtml(p.barcodeId||"")+'</p><img src="'+src+'" alt="QR"><p>بطاقة الحضور والانصراف الرسمية</p></div><script>window.onload=()=>window.print()<\\/script></html>');
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