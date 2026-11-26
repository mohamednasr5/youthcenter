(function(){
 "use strict";
 const $=s=>document.querySelector(s),API=window.YC_ATTENDANCE_API||"";
 let db,players=[],schedules=[];
 function say(id,msg,error=false){const e=$("#"+id);e.textContent=msg;e.className="msg"+(error?" error":"");}
 function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 async function token(){const a=firebase.apps.find(x=>x.name==="youthcenter")||firebase.apps[0],u=a?.auth?.().currentUser;if(!u)throw Error("سجّل الدخول أولًا.");return u.getIdToken();}
 async function worker(path,opts={}){const r=await fetch(API+path,{...opts,headers:{"content-type":"application/json","authorization":"Bearer "+await token()}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"تعذر تنفيذ العملية.");return d;}
 async function load(){
  const [ps,ss]=await Promise.all([db.ref("nasheed_academy/players").once("value"),db.ref("nasheed_academy/schedules").once("value")]);
  players=Object.entries(ps.val()||{}).map(([id,p])=>({id,...p}));
  schedules=Object.entries(ss.val()||{}).map(([id,p])=>({id,...p}));
  $("#playersList").innerHTML=players.map(p=>'<div class="item"><div><b>'+esc(p.name)+'</b><small>'+esc(p.age||"")+' · '+esc(p.category||"")+'</small></div><div><button class="secondary" data-edit-player="'+esc(p.id)+'">تعديل</button><button class="danger" data-del-player="'+esc(p.id)+'">حذف</button></div></div>').join("")||'<p class="muted">لا يوجد لاعبون بعد.</p>';
  $("#schedulesList").innerHTML=schedules.map(s=>'<div class="item"><div><b>'+esc(s.day)+'</b><small>'+esc(s.date||"أسبوعي")+' · '+esc(s.fromTime)+' – '+esc(s.toTime)+'</small></div><div><button class="secondary" data-edit-schedule="'+esc(s.id)+'">تعديل</button><button class="danger" data-del-schedule="'+esc(s.id)+'">حذف</button></div></div>').join("")||'<p class="muted">لم تتم إضافة مواعيد بعد.</p>';
 }
 function clearPlayer(){$("#playerForm").reset();$("#playerId").value="";$("#playerTitle").textContent="إضافة لاعب جديد";}
 function clearSchedule(){$("#scheduleForm").reset();$("#scheduleId").value="";$("#scheduleFrom").value="17:00";$("#scheduleTo").value="19:00";$("#scheduleLocation").value="مركز شباب الأحمدية";$("#scheduleTitle").textContent="إضافة موعد تدريب";}
 async function open(){db=SiteData.db();$("#login").style.display="none";$("#app").style.display="block";await load();}
 async function doEmail(){
  const email=$("#em").value.trim(),password=$("#pw").value;
  try{await SiteData.signIn(email,password,"nasheed");}
  catch(first){await SiteData.signIn(email,password,"center");}
  await open();
 }
 $("#loginBtn").onclick=()=>doEmail().catch(e=>say("loginMsg",e.message,true));
 $("#googleBtn").onclick=async()=>{try{let u;try{u=await SiteData.signInWithGoogle("nasheed");}catch(e){u=await SiteData.signInWithGoogle("center");}if(u)await open();}catch(e){say("loginMsg",e.message,true)}};
 $("#playerForm").onsubmit=async e=>{
  e.preventDefault();
  try{
   const id=$("#playerId").value,ref=id?db.ref("nasheed_academy/players/"+id):db.ref("nasheed_academy/players").push();
   const guardianPhone=($("#playerGuardian")?.value||"").trim();
   const p={id:ref.key||id,name:$("#playerName").value.trim(),age:$("#playerAge").value,category:$("#playerGroup").value.trim(),photo:$("#playerPhoto").value.trim(),active:true,updatedAt:Date.now()};
   await ref.set(p);clearPlayer();
   try{
    const mod=await import("../attendance-portal/qr-provision.js");
    const res=await mod.provisionPlayerQR("nasheed",p.id,guardianPhone);
    say("playerMsg","تم حفظ اللاعب وإنشاء بطاقة QR — رقم الهوية "+(res.barcode?.barcodeId||""));
    window.dispatchEvent(new CustomEvent("yc:qr-provisioned",{detail:{academy:"nasheed",playerId:p.id}}));
   }catch(x){ say("playerMsg","تم حفظ اللاعب، وتعذر توليد بطاقة QR الآن: "+x.message,true); }
   await load();
  }catch(x){say("playerMsg",x.message,true)}
 };
 $("#scheduleForm").onsubmit=async e=>{
  e.preventDefault();
  try{
   const id=$("#scheduleId").value,ref=id?db.ref("nasheed_academy/schedules/"+id):db.ref("nasheed_academy/schedules").push();
   const s={id:ref.key||id,day:$("#scheduleDay").value,date:$("#scheduleDate").value,fromTime:$("#scheduleFrom").value,toTime:$("#scheduleTo").value,location:$("#scheduleLocation").value||"مركز شباب الأحمدية",active:true,updatedAt:Date.now()};
   await ref.set(s);clearSchedule();say("scheduleMsg","تم حفظ الموعد في قاعدة Firebase.");await load();
  }catch(x){say("scheduleMsg",x.message,true)}
 };
 $("#cancelPlayer").onclick=clearPlayer;$("#cancelSchedule").onclick=clearSchedule;
 document.addEventListener("click",async e=>{
  const ep=e.target.closest("[data-edit-player]"),dp=e.target.closest("[data-del-player]"),es=e.target.closest("[data-edit-schedule]"),ds=e.target.closest("[data-del-schedule]");
  try{
   if(ep){const p=players.find(x=>x.id===ep.dataset.editPlayer);$("#playerId").value=p.id;$("#playerName").value=p.name||"";$("#playerAge").value=p.age||"";$("#playerGroup").value=p.category||"";$("#playerPhoto").value=p.photo||"";$("#playerTitle").textContent="تعديل بيانات اللاعب";window.scrollTo({top:0,behavior:"smooth"});}
   if(dp&&confirm("حذف اللاعب؟")){
    const id=dp.dataset.delPlayer,all=await worker("/api/admin/players?academy=nasheed");
    const p=all.find(x=>String(x.id)===id);
    if(p?.guardianPhone)await worker("/api/admin/link-player",{method:"POST",body:JSON.stringify({academy:"nasheed",playerId:id,phone:""})});
    await db.ref("nasheed_academy/players/"+id).remove();await load();
   }
   if(es){const s=schedules.find(x=>x.id===es.dataset.editSchedule);$("#scheduleId").value=s.id;$("#scheduleDay").value=s.day;$("#scheduleDate").value=s.date||"";$("#scheduleFrom").value=s.fromTime;$("#scheduleTo").value=s.toTime;$("#scheduleLocation").value=s.location||"";$("#scheduleTitle").textContent="تعديل موعد التدريب";}
   if(ds&&confirm("حذف موعد التدريب؟")){await db.ref("nasheed_academy/schedules/"+ds.dataset.delSchedule).remove();await load();}
  }catch(x){say("playerMsg",x.message,true);}
 });
 const app=firebase.apps.find(x=>x.name==="youthcenter")||firebase.apps[0];
 if(app)app.auth().onAuthStateChanged(async u=>{if(u&&$("#app").style.display==="none"){try{const c=await u.getIdTokenResult(true);if(c.claims.ycAdmin||c.claims.ycCenter||c.claims.ycNasheed)await open();}catch(e){say("loginMsg",e.message,true)}}});
})();