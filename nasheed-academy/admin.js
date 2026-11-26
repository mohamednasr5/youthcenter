(function(){
 "use strict";
 const $=s=>document.querySelector(s),API=window.YC_ATTENDANCE_API||"";
 let user=null,players=[],schedules=[];
 async function token(){const a=firebase.apps.find(x=>x.name==="youthcenter")||firebase.apps[0];if(!a?.auth().currentUser)throw Error("سجّل الدخول أولًا.");return a.auth().currentUser.getIdToken();}
 async function api(path,opts={}){const r=await fetch(API+path,{...opts,headers:{"content-type":"application/json","authorization":"Bearer "+await token()}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"تعذر الاتصال.");return d;}
 function say(id,t,error=false){const e=$("#"+id);e.textContent=t;e.className="msg"+(error?" error":"");}
 async function load(){
  const d=await api("/api/nasheed/data");players=d.players||[];schedules=d.schedules||[];
  $("#playersList").innerHTML=players.map(p=>'<div class="item"><div><b>'+escapeHtml(p.name)+'</b><small>'+escapeHtml(p.age||"")+' · '+escapeHtml(p.category||"")+'</small></div><div><button class="secondary" data-edit-player="'+escapeHtml(p.id)+'">تعديل</button><button class="danger" data-del-player="'+escapeHtml(p.id)+'">حذف</button></div></div>').join("")||'<p class="muted">لا يوجد لاعبون بعد.</p>';
  $("#schedulesList").innerHTML=schedules.map(s=>'<div class="item"><div><b>'+escapeHtml(s.day)+'</b><small>'+escapeHtml(s.date||"أسبوعي")+' · '+escapeHtml(s.fromTime)+' – '+escapeHtml(s.toTime)+'</small></div><div><button class="secondary" data-edit-schedule="'+escapeHtml(s.id)+'">تعديل</button><button class="danger" data-del-schedule="'+escapeHtml(s.id)+'">حذف</button></div></div>').join("")||'<p class="muted">لم تتم إضافة مواعيد بعد.</p>';
 }
 function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 function clearPlayer(){$("#playerForm").reset();$("#playerId").value="";$("#playerTitle").textContent="إضافة لاعب جديد";}
 function clearSchedule(){$("#scheduleForm").reset();$("#scheduleId").value="";$("#scheduleFrom").value="17:00";$("#scheduleTo").value="19:00";$("#scheduleLocation").value="مركز شباب الأحمدية";$("#scheduleTitle").textContent="إضافة موعد تدريب";}
 async function open(){
  $("#login").style.display="none";$("#app").style.display="block";await load();
 }
 $("#loginBtn").onclick=async()=>{try{const email=$("#em").value.trim();try{await SiteData.signIn(email,$("#pw").value,"nasheed");}catch(first){await SiteData.signIn(email,$("#pw").value,"center");}await open();}catch(e){say("loginMsg",e.message,true)}};
 $("#googleBtn").onclick=async()=>{try{let u;try{u=await SiteData.signInWithGoogle("nasheed");}catch(first){u=await SiteData.signInWithGoogle("center");}if(u)await open();}catch(e){say("loginMsg",e.message,true)}};
 $("#playerForm").onsubmit=async e=>{e.preventDefault();try{const d={id:$("#playerId").value||undefined,name:$("#playerName").value.trim(),age:$("#playerAge").value,category:$("#playerGroup").value.trim(),photo:$("#playerPhoto").value.trim()};await api("/api/nasheed/player",{method:"POST",body:JSON.stringify(d)});clearPlayer();say("playerMsg","تم حفظ بيانات اللاعب.");await load();}catch(x){say("playerMsg",x.message,true)}};
 $("#scheduleForm").onsubmit=async e=>{e.preventDefault();try{const d={id:$("#scheduleId").value||undefined,day:$("#scheduleDay").value,date:$("#scheduleDate").value,fromTime:$("#scheduleFrom").value,toTime:$("#scheduleTo").value,location:$("#scheduleLocation").value};await api("/api/nasheed/schedule",{method:"POST",body:JSON.stringify(d)});clearSchedule();say("scheduleMsg","تم حفظ موعد التدريب.");await load();}catch(x){say("scheduleMsg",x.message,true)}};
 $("#cancelPlayer").onclick=clearPlayer;$("#cancelSchedule").onclick=clearSchedule;
 document.addEventListener("click",async e=>{
  const ep=e.target.closest("[data-edit-player]"),dp=e.target.closest("[data-del-player]"),es=e.target.closest("[data-edit-schedule]"),ds=e.target.closest("[data-del-schedule]");
  try{
   if(ep){const p=players.find(x=>x.id===ep.dataset.editPlayer);$("#playerId").value=p.id;$("#playerName").value=p.name||"";$("#playerAge").value=p.age||"";$("#playerGroup").value=p.category||"";$("#playerPhoto").value=p.photo||"";$("#playerTitle").textContent="تعديل بيانات اللاعب";window.scrollTo({top:0,behavior:"smooth"});}
   if(dp&&confirm("حذف اللاعب؟")){await api("/api/nasheed/player/delete",{method:"POST",body:JSON.stringify({id:dp.dataset.delPlayer})});await load();}
   if(es){const s=schedules.find(x=>x.id===es.dataset.editSchedule);$("#scheduleId").value=s.id;$("#scheduleDay").value=s.day;$("#scheduleDate").value=s.date||"";$("#scheduleFrom").value=s.fromTime;$("#scheduleTo").value=s.toTime;$("#scheduleLocation").value=s.location||"";$("#scheduleTitle").textContent="تعديل موعد التدريب";}
   if(ds&&confirm("حذف موعد التدريب؟")){await api("/api/nasheed/schedule/delete",{method:"POST",body:JSON.stringify({id:ds.dataset.delSchedule})});await load();}
  }catch(x){say("playerMsg",x.message,true);}
 });
 const a=firebase.apps.find(x=>x.name==="youthcenter")||firebase.apps[0];
 if(a){a.auth().onAuthStateChanged(async u=>{if(u){try{await u.getIdToken(true);if($("#login").style.display!=="none")await open();}catch(e){say("loginMsg",e.message,true)}}});}
})();