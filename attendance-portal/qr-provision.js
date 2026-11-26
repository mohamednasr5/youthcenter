/* Shared helper: automatic permanent QR provisioning for a newly created player.
   Used by every academy dashboard right after a player is saved to Firebase,
   and by the attendance module itself. Keeps a single getUser implementation.

   export provisionPlayerQR(academy, playerId, phone) -> {ok, message, barcode}
   export getUser(academy) -> firebase user (modular for football, compat otherwise)
*/
const API=window.YC_ATTENDANCE_API||"";
const ACADEMIES=["football","karate","kungfu","nasheed"];

export async function getUser(a){
 if(a==="football"){
  const m=await import("../football-academy/js/firebase-config.js");
  if(m.auth.currentUser)return m.auth.currentUser;
  return await new Promise(resolve=>{let off;const done=u=>{if(off)off();resolve(u)};off=m.onAuthStateChanged(m.auth,done);setTimeout(()=>done(m.auth.currentUser),6000);});
 }
 const apps=window.firebase?.apps||[],app=apps.find(x=>x.name==="youthcenter")||apps[0];
 if(!app)return null;
 const auth=app.auth();
 if(auth.currentUser)return auth.currentUser;
 return await new Promise(resolve=>{let off;const done=u=>{if(off)off();resolve(u)};off=auth.onAuthStateChanged(done);setTimeout(()=>done(auth.currentUser),6000);});
}

export async function getUserToken(a){
 const u=await getUser(a);
 if(!u)throw Error("سجّل الدخول إلى لوحة الأكاديمية أولًا.");
 return await u.getIdToken(true);
}

export async function provisionPlayerQR(academy,playerId,phone=""){
 if(!ACADEMIES.includes(academy))throw Error("أكاديمية غير معروفة.");
 const token=await getUserToken(academy);
 const r=await fetch(API+"/api/admin/qr-provision",{
  method:"POST",
  headers:{"content-type":"application/json","authorization":"Bearer "+token},
  body:JSON.stringify({academy,playerId,phone:String(phone||"").trim()})
 });
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(d.error||"تعذر توليد بطاقة QR.");
 return d;
}

/* Fire-and-observe helper for inline (non-module) admin scripts. */
export function announceQrProvisioned(academy,playerId){
 window.dispatchEvent(new CustomEvent("yc:qr-provisioned",{detail:{academy,playerId:String(playerId)}}));
}
