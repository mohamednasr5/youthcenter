(function(){
 "use strict";
 const API=window.YC_ATTENDANCE_API||"";
 const $=s=>document.querySelector(s);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const ACADEMIES={football:"أكاديمية كرة القدم",karate:"أكاديمية الكاراتيه",kungfu:"أكاديمية الكونغ فو",nasheed:"فريق الإنشاد"};
 let loaded=false;
 async function token(){const apps=window.firebase?.apps||[],app=apps.find(x=>x.name==="youthcenter")||apps[0];const u=app?.auth?.().currentUser;if(!u)throw Error("سجّل الدخول إلى لوحة المركز أولًا.");return u.getIdToken();}
 async function call(path,opts={}){const r=await fetch(API+path,{...opts,headers:{"content-type":"application/json","authorization":"Bearer "+await token()}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"تعذر الاتصال بالخدمة.");return d;}
 function message(t){$("#yc-center-message").textContent=t;}
 async function load(){
  const rows=await call("/api/admin/guardians");
  $("#yc-guardian-count").textContent=rows.length+" رقم";
  $("#yc-guardian-list").innerHTML=rows.map(g=>'<div class="yc-guardian-row"><div><b>'+esc(g.phone)+'</b><small>'+g.count+' لاعب · '+(g.enabled?"رمز مفعل":"لا يوجد رمز")+'</small></div><span class="'+(g.enabled?"on":"off")+'">'+(g.enabled?"مفعل":"غير مفعل")+'</span></div>').join("")||'<p>لا توجد أرقام أولياء أمور بعد. اربط رقم الهاتف باللاعب من لوحة الأكاديمية أولًا.</p>';
 }
 async function save(action){
  const phone=$("#yc-guardian-phone").value.trim(),code=$("#yc-guardian-code").value.trim();
  if(!phone)throw Error("أدخل رقم الهاتف.");
  const r=await call("/api/admin/guardian-code",{method:"POST",body:JSON.stringify({phone,code,action})});
  $("#yc-guardian-code").value="";message(r.message);await load();
 }

 /* ---------- central QR management across the four academies ---------- */
 let qrPlayers=[],qrAcademy="";
 function ensureQrLib(){return new Promise((res,rej)=>{if(window.QRCode)return res();const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js";s.onload=()=>window.QRCode?res():rej(Error("تعذر تحميل مكتبة QR."));s.onerror=()=>rej(Error("تعذر تحميل مكتبة QR."));document.head.appendChild(s);});}
 async function loadAcademyPlayers(a){
  const rows=await call("/api/admin/players?academy="+a);
  qrPlayers=rows;
  $("#yc-qr-player").innerHTML='<option value="">اختر لاعبًا</option>'+rows.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' — '+esc(p.barcodeId||"بدون بطاقة")+'</option>').join("");
 }
 async function showQrInfo(){
  const a=$("#yc-qr-academy").value||qrAcademy,pid=$("#yc-qr-player").value;
  if(!a||!pid){$("#yc-qr-info").innerHTML='<p class="sub">اختر الأكاديمية ثم اللاعب لعرض حالة البطاقة.</p>';return;}
  const p=qrPlayers.find(x=>String(x.id)===String(pid));
  if(!p)return;
  $("#yc-qr-info").innerHTML=
   '<div class="yc-qr-grid"><div class="yc-qr-preview" id="yc-qr-canvas-holder">'+(p.barcodeToken?'<span class="yc-qr-loading">جارٍ رسم الرمز…</span>':'<span class="yc-qr-loading">لا يوجد رمز — أنشئ البطاقة من لوحة الأكاديمية</span>')+'</div>'+
   '<div class="yc-qr-fields">'+
   '<div><small>رقم الهوية الدائم</small><b>'+esc(p.barcodeId||"—")+'</b></div>'+
   '<div><small>تاريخ الإنشاء</small><b>'+esc(fmtDate(p.barcodeCreatedAt))+'</b></div>'+
   '<div><small>حالة البطاقة</small><b class="'+(p.barcodeActive===false?"off":"on")+'">'+(p.barcodeActive===false?"⛔ موقوفة":"✅ مفعّلة")+'</b></div>'+
   '<div><small>رقم الإصدار</small><b>'+esc(p.barcodeRevision||1)+'</b></div>'+
   '<div><small>ولي الأمر</small><b>'+(p.guardianPhone?'<bdi>'+esc(p.guardianPhone)+'</bdi>':"غير مربوط")+'</b></div>'+
   '<div><small>المعرّف في Firebase</small><b dir="ltr">'+esc(p.id)+'</b></div>'+
   '</div></div>';
  if(p.barcodeToken){
   try{
    await ensureQrLib();
    const holder=$("#yc-qr-canvas-holder");holder.innerHTML="";
    const c=document.createElement("canvas");
    await QRCode.toCanvas(c,"AHMADIYAH|v1|"+p.barcodeToken,{width:210,margin:2,errorCorrectionLevel:"H"});
    holder.appendChild(c);
    const dl=document.createElement("button");dl.textContent="⬇ تنزيل QR";dl.onclick=()=>{const a2=document.createElement("a");a2.href=c.toDataURL("image/png");a2.download="QR-"+(p.barcodeId||p.id)+".png";a2.click();};
    holder.appendChild(dl);
   }catch(e){$("#yc-qr-canvas-holder").innerHTML='<span class="yc-qr-loading">'+esc(e.message)+'</span>';}
  }
 }
 const fmtDate=v=>v?new Intl.DateTimeFormat("ar-EG",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Africa/Cairo"}).format(new Date(v)):"—";
 const fmtTime=v=>v?new Intl.DateTimeFormat("ar-EG",{hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Africa/Cairo"}).format(new Date(v)):"—";
 async function qrAction(action){
  const a=$("#yc-qr-academy").value,pid=$("#yc-qr-player").value;
  if(!a||!pid)throw Error("اختر الأكاديمية واللاعب أولًا.");
  const r=await call("/api/admin/qr-manage",{method:"POST",body:JSON.stringify({academy:a,playerId:pid,action})});
  message(r.message);
  await loadAcademyPlayers(a);await showQrInfo();await loadAudit();
 }
 async function transferPlayer(){
  const from=$("#yc-qr-academy").value,pid=$("#yc-qr-player").value,to=$("#yc-qr-transfer").value;
  if(!from||!pid)throw Error("اختر الأكاديمية واللاعب أولًا.");
  if(!to||to===from)throw Error("اختر أكاديمية نقل مختلفة.");
  if(!confirm("سيُنقل اللاعب مع الحفاظ على بطاقة QR وهويته نفسها. متابعة؟"))return;
  const r=await call("/api/admin/transfer-player",{method:"POST",body:JSON.stringify({fromAcademy:from,toAcademy:to,playerId:pid})});
  message(r.message);
  await loadAcademyPlayers(from);await showQrInfo();await loadAudit();
 }
 const ACTION_LABEL={scan:"مسح كاميرا",checkin:"تسجيل دخول",checkout:"تسجيل خروج",link:"ربط ولي أمر",unlink:"إلغاء ربط",revoke:"إيقاف بطاقة",regenerate:"تجديد رمز",provision:"إنشاء بطاقة",transfer:"نقل لاعب"};
 async function loadAudit(){
  try{
   const r=await call("/api/admin/audit-logs?limit=80");
   const items=r.items||[];
   $("#yc-audit-list").innerHTML=items.map(x=>'<div class="yc-audit-row"><div><b>'+esc(ACTION_LABEL[x.kind]||x.kind||x.action||"—")+'</b><small>'+esc(ACADEMIES[x.academy]||"")+(x.playerName?" · "+esc(x.playerName):"")+(x.barcodeId?" · "+esc(x.barcodeId):"")+'</small></div><div class="yc-audit-meta"><span>'+esc(fmtTime(x.t))+'</span><small>بواسطة '+esc(x.staffEmail||x.staff||"—")+'</small></div></div>').join("")||'<p class="sub">لا توجد حركات مدونة بعد.</p>';
  }catch(e){$("#yc-audit-list").innerHTML='<p class="sub">'+esc(e.message)+'</p>';}
 }
 function init(){
  if(loaded||!$("#sec-attendance"))return;loaded=true;
  const style=document.createElement("style");
  style.textContent="#sec-attendance .yc-guardian-card{background:#ffffff08;border:1px solid #ffffff18;border-radius:16px;padding:16px;margin:12px 0}#sec-attendance .yc-guardian-row{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid #ffffff18}#sec-attendance .yc-guardian-row small{display:block;color:#9ca3af;margin-top:3px}#sec-attendance .yc-guardian-row .on{color:#34d399}#sec-attendance .yc-guardian-row .off{color:#fbbf24}#sec-attendance input,#sec-attendance select{padding:11px;border-radius:9px;border:1px solid #ffffff25;background:#101827;color:inherit;width:100%;margin-top:5px}#sec-attendance label{display:block;margin:10px 0}#sec-attendance button{padding:10px 15px;border:0;border-radius:9px;background:#a7f3d0;color:#10231d;font-weight:800;cursor:pointer;margin:5px 4px}#sec-attendance button.warn{background:#5b2630;color:#fecdd3}#sec-attendance button.alt{background:#263850;color:#e5edf8}#yc-center-message{min-height:24px;color:#34d399;font-size:.85rem}#sec-attendance .yc-qr-grid{display:grid;grid-template-columns:250px 1fr;gap:16px;margin-top:10px}#sec-attendance .yc-qr-preview{display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px;background:#fff;border-radius:14px;justify-content:center}#sec-attendance .yc-qr-preview canvas{width:200px;height:200px}#sec-attendance .yc-qr-preview button{margin:0}#sec-attendance .yc-qr-loading{color:#4b5563;font-size:.78rem;direction:rtl}#sec-attendance .yc-qr-fields div{display:flex;justify-content:space-between;gap:10px;padding:9px 2px;border-bottom:1px solid #ffffff12;font-size:.82rem}#sec-attendance .yc-qr-fields small{color:#9ca3af}#sec-attendance .yc-qr-fields .on{color:#34d399}#sec-attendance .yc-qr-fields .off{color:#f87171}#sec-attendance .yc-audit-row{display:flex;justify-content:space-between;gap:10px;padding:10px 2px;border-bottom:1px solid #ffffff12;font-size:.8rem}#sec-attendance .yc-audit-row small{display:block;color:#9ca3af;margin-top:2px}#sec-attendance .yc-audit-meta{text-align:left;direction:ltr}#sec-attendance .yc-audit-meta small{display:block}#sec-attendance .yc-picker{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}@media(max-width:700px){#sec-attendance .yc-qr-grid{grid-template-columns:1fr}}";
  document.head.appendChild(style);
  const section=$("#sec-attendance");
  section.innerHTML='<div class="admin-card"><h3>👨‍👩‍👧‍👦 إدارة حسابات أولياء الأمور</h3><p class="sub">اربط رقم الهاتف من لوحة الأكاديمية أولًا، ثم أنشئ رمز المتابعة أو غيّره أو ألغِه. تغيير الرمز أو حذفه يبطل الجلسات والرموز السابقة فورًا.</p><div class="yc-guardian-card"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px"><label>رقم هاتف ولي الأمر<input id="yc-guardian-phone" dir="ltr" placeholder="01xxxxxxxxx"></label><label>رمز متابعة جديد<input id="yc-guardian-code" dir="ltr" minlength="6" maxlength="16" placeholder="6–16 أحرف أو أرقام"></label></div><button id="yc-code-save">حفظ / تغيير الرمز</button><button class="warn" id="yc-code-delete">إلغاء الرمز الحالي</button><button id="yc-guardian-refresh">تحديث القائمة</button><div id="yc-center-message"></div></div><div class="yc-guardian-card"><h4>أرقام أولياء الأمور <small id="yc-guardian-count"></small></h4><div id="yc-guardian-list">جارٍ تحميل البيانات…</div></div></div>'+
  '<div class="admin-card"><h3>🪪 إدارة بطاقات QR للاعبي الأكاديميات الأربع</h3><p class="sub">هوية واحدة دائمة لكل لاعب: عرض حالة البطاقة، تنزيل الرمز، إيقافه أو تجديده بأمان، ونقل اللاعب بين الأكاديميات مع الحفاظ على هويته نفسها.</p><div class="yc-guardian-card"><div class="yc-picker"><label>الأكاديمية<select id="yc-qr-academy"><option value="">اختر الأكاديمية</option><option value="football">⚽ كرة القدم</option><option value="karate">🥋 الكاراتيه</option><option value="kungfu">🥊 الكونغ فو</option><option value="nasheed">🎙️ الإنشاد</option></select></label><label>اللاعب<select id="yc-qr-player"><option value="">اختر لاعبًا</option></select></label><label>نقل إلى أكاديمية (اختياري)<select id="yc-qr-transfer"><option value="">— بدون نقل —</option><option value="football">⚽ كرة القدم</option><option value="karate">🥋 الكاراتيه</option><option value="kungfu">🥊 الكونغ فو</option><option value="nasheed">🎙️ الإنشاد</option></select></label></div><div id="yc-qr-info"><p class="sub">اختر الأكاديمية ثم اللاعب لعرض حالة البطاقة.</p></div><div><button id="yc-qr-revoke" class="warn">⛔ إيقاف البطاقة</button><button id="yc-qr-regen">♻ تجديد الرمز بأمان</button><button id="yc-qr-transfer" class="alt">↔ تنفيذ النقل</button></div></div></div>'+
  '<div class="admin-card"><h3>🧾 سجل التدقيق — كل حركات الحضور والبطاقات</h3><p class="sub">كل مسحة كاميرا وتسجيل دخول وخروج وربط وإيقاف وتجديد ونقل يُسجَّل باسم المدير المنفذ.</p><div class="yc-guardian-card"><div id="yc-audit-list">جارٍ تحميل السجل…</div></div></div>';
  $("#yc-code-save").onclick=()=>save("set").catch(e=>message(e.message));
  $("#yc-code-delete").onclick=()=>{if(confirm("سيتم إلغاء الرمز الحالي وإخراج ولي الأمر من جلسات المتابعة. متابعة؟"))save("delete").catch(e=>message(e.message));};
  $("#yc-guardian-refresh").onclick=()=>load().catch(e=>message(e.message));
  $("#yc-qr-academy").onchange=async()=>{qrAcademy=$("#yc-qr-academy").value;if(!qrAcademy)return;try{await loadAcademyPlayers(qrAcademy);$("#yc-qr-info").innerHTML='<p class="sub">اختر اللاعب لعرض حالة البطاقة.</p>';}catch(e){message(e.message);}};
  $("#yc-qr-player").onchange=()=>showQrInfo().catch(e=>message(e.message));
  $("#yc-qr-revoke").onclick=()=>{if(confirm("إيقاف البطاقة يمنع تسجيل الحضور لهذا اللاعب حتى إصدار بطاقة جديدة. متابعة؟"))qrAction("revoke").catch(e=>message(e.message));};
  $("#yc-qr-regen").onclick=()=>{if(confirm("تجديد الرمز يُصدر رمزًا جديدًا ويُبطل البطاقات المطبوعة القديمة. متابعة؟"))qrAction("regenerate").catch(e=>message(e.message));};
  $("#yc-qr-transfer").onclick=()=>transferPlayer().catch(e=>message(e.message));
  const nav=$("#asNav a[data-sec=attendance]");
  if(nav)nav.addEventListener("click",()=>{load().catch(e=>message(e.message));loadAudit();});
  const observer=new MutationObserver(()=>{if(section.classList.contains("active")){load().catch(e=>message(e.message));loadAudit();}});
  observer.observe(section,{attributes:true,attributeFilter:["class"]});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
