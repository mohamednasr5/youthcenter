(function(){
 "use strict";
 const API=window.YC_ATTENDANCE_API||"";
 const $=s=>document.querySelector(s);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
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
 function init(){
  if(loaded||!$("#sec-attendance"))return;loaded=true;
  const style=document.createElement("style");style.textContent="#sec-attendance .yc-guardian-card{background:#ffffff08;border:1px solid #ffffff18;border-radius:16px;padding:16px;margin:12px 0}#sec-attendance .yc-guardian-row{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid #ffffff18}#sec-attendance .yc-guardian-row small{display:block;color:#9ca3af;margin-top:3px}#sec-attendance .yc-guardian-row .on{color:#34d399}#sec-attendance .yc-guardian-row .off{color:#fbbf24}#sec-attendance input{padding:11px;border-radius:9px;border:1px solid #ffffff25;background:#101827;color:inherit;width:100%;margin-top:5px}#sec-attendance label{display:block;margin:10px 0}#sec-attendance button{padding:10px 15px;border:0;border-radius:9px;background:#a7f3d0;color:#10231d;font-weight:800;cursor:pointer;margin:5px 4px}#sec-attendance button.danger{background:#5b2630;color:#fecdd3}#yc-center-message{min-height:24px;color:#34d399;font-size:.85rem}";
  document.head.appendChild(style);
  const section=$("#sec-attendance");
  section.innerHTML='<div class="admin-card"><h3>👨‍👩‍👧‍👦 إدارة حسابات أولياء الأمور</h3><p class="sub">اربط رقم الهاتف من لوحة الأكاديمية أولًا، ثم أنشئ رمز المتابعة أو غيّره أو ألغِه. تغيير الرمز أو حذفه يبطل الجلسات والرموز السابقة فورًا.</p><div class="yc-guardian-card"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px"><label>رقم هاتف ولي الأمر<input id="yc-guardian-phone" dir="ltr" placeholder="01xxxxxxxxx"></label><label>رمز متابعة جديد<input id="yc-guardian-code" dir="ltr" minlength="6" maxlength="16" placeholder="6–16 أحرف أو أرقام"></label></div><button id="yc-code-save">حفظ / تغيير الرمز</button><button class="danger" id="yc-code-delete">إلغاء الرمز الحالي</button><button id="yc-guardian-refresh">تحديث القائمة</button><div id="yc-center-message"></div></div><div class="yc-guardian-card"><h4>أرقام أولياء الأمور <small id="yc-guardian-count"></small></h4><div id="yc-guardian-list">جارٍ تحميل البيانات…</div></div></div>';
  $("#yc-code-save").onclick=()=>save("set").catch(e=>message(e.message));
  $("#yc-code-delete").onclick=()=>{if(confirm("سيتم إلغاء الرمز الحالي وإخراج ولي الأمر من جلسات المتابعة. متابعة؟"))save("delete").catch(e=>message(e.message));};
  $("#yc-guardian-refresh").onclick=()=>load().catch(e=>message(e.message));
  const nav=$("#asNav a[data-sec=attendance]");
  if(nav)nav.addEventListener("click",()=>load().catch(e=>message(e.message)));
  const observer=new MutationObserver(()=>{if(section.classList.contains("active"))load().catch(e=>message(e.message));});
  observer.observe(section,{attributes:true,attributeFilter:["class"]});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();