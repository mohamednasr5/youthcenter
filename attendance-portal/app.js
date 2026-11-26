(() => {
 "use strict";
 const API=window.YC_ATTENDANCE_API||"", $=s=>document.querySelector(s), loginView=$("#loginView"), dashboard=$("#dashboardView"), children=$("#children");
 const tokenKey="ahmadiya_guardian_session_v1";
 let token=sessionStorage.getItem(tokenKey)||"",timer=null,busy=false;
 const names={football:"⚽ كرة القدم",karate:"🥋 الكاراتيه",kungfu:"🥊 الكونغ فو",nasheed:"🎙️ الإنشاد"};
 const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function api(path,opts={}){return fetch(API+path,{...opts,headers:{"content-type":"application/json",...(opts.headers||{}),...(token?{authorization:"Bearer "+token}:{})}}).then(async r=>{let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||"تعذر الاتصال بالخدمة.");return d;});}
 function showDashboard(){loginView.classList.add("hidden");dashboard.classList.remove("hidden");$("#logout").classList.remove("hidden");}
 function showLogin(){dashboard.classList.add("hidden");loginView.classList.remove("hidden");$("#logout").classList.add("hidden");}
 const time=v=>v?new Intl.DateTimeFormat("ar-EG",{hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"Africa/Cairo"}).format(new Date(v)):"—";
 function statusClass(code){return ["inside","left","absent","upcoming","no-training"].includes(code)?code:"no-training";}
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
   return '<article class="child-card" style="animation-delay:'+(i*70)+'ms"><div class="child-head">'+photo+'<div class="child-info"><h3>'+escapeHtml(p.name)+'</h3><small>'+escapeHtml(p.group||p.age||"")+'</small><div class="academy">'+escapeHtml(names[p.academy]||p.academyLabel||"")+'</div></div></div><div class="status '+statusClass(s.code)+'">'+escapeHtml(s.label||"لا توجد حالة مسجلة")+'</div><div class="detail-grid">'+schedule+'</div>'+duration+'</article>';
  }).join("");
 }
 async function refresh(){
  if(!token||busy)return;busy=true;
  try{const data=await api("/api/guardian/status");render(data);}
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