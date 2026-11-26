/* Ahmadiya Youth Center attendance API
   Guardians + QR attendance for football, karate, kungfu and nasheed.
   Private guardian data is held in Cloudflare Durable Objects.
*/
const API_KEY = "FIREBASE_WEB_API_KEY";
const DB = "https://academia-e6d7b-default-rtdb.firebaseio.com";
const PRIVATE = "att:";
const ACADEMIES = {
  football:{label:"أكاديمية كرة القدم",players:"players",schedules:"schedules",claim:"ycFootball"},
  karate:{label:"أكاديمية الكاراتيه",players:"karate_academy/players",schedules:"karate_academy/schedules",claim:"ycKarate"},
  kungfu:{label:"أكاديمية الكونغ فو",players:"kungfu_academy/players",schedules:"kungfu_academy/schedules",claim:"ycKungfu"},
  nasheed:{label:"فريق الإنشاد",players:"nasheed_academy/players",schedules:"nasheed_academy/schedules",claim:"ycNasheed"}
};
const DAYS=["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

const ok=(data,status=200,origin="")=>{
  const h={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"};
  if(origin){h["access-control-allow-origin"]=origin;h.vary="Origin";}
  return new Response(JSON.stringify(data),{status,headers:h});
};
const originAllowed=(v)=>{
  if(!v)return "";
  try{const h=new URL(v).hostname;return h==="ahmadiya.online"||h==="www.ahmadiya.online"||h.endsWith(".workers.dev")?v:null;}catch{return null;}
};
const bearer=req=>{const h=req.headers.get("authorization")||"";return h.startsWith("Bearer ")?h.slice(7):"";};
const body=async req=>{try{return await req.json();}catch{return {};}};
const entries=v=>Array.isArray(v)?v.map((x,i)=>[String(x?.id??i),x]).filter(x=>x[1]):v&&typeof v==="object"?Object.entries(v):[];
const academyKey=v=>{const a=String(v||"");if(!ACADEMIES[a])throw Error("الأكاديمية غير معروفة.");return a;};
const playerKey=v=>{const s=String(v??"").trim();if(!s||/[.#$\[\]/]/.test(s))throw Error("معرّف اللاعب غير صالح.");return s;};
function phoneKey(v){
 let n=String(v||"").replace(/[^0-9]/g,"");
 if(n.startsWith("0020"))n=n.slice(2);
 if(n.startsWith("0"))n="20"+n.slice(1);
 if(n.length===10&&n.startsWith("1"))n="20"+n;
 if(!/^20[0-9]{10,11}$/.test(n))throw Error("أدخل رقم هاتف مصري صحيحًا لولي الأمر.");
 return n;
}
let firebaseKeys=null;
async function verifyStaff(req,env,academy,centerOnly=false){
 const token=bearer(req);if(!token)throw Error("سجّل الدخول بحساب الإدارة أولًا.");
 const parts=token.split(".");if(parts.length!==3)throw Error("جلسة Firebase غير صالحة.");
 let head,payload,signature;
 try{head=JSON.parse(unb64(parts[0]));payload=JSON.parse(unb64(parts[1]));signature=Uint8Array.from(unb64(parts[2]),c=>c.charCodeAt(0));}catch{throw Error("جلسة Firebase غير صالحة.");}
 if(head.alg!=="RS256"||!head.kid)throw Error("جلسة Firebase غير صالحة.");
 if(!firebaseKeys||firebaseKeys.until<Date.now()){
  const kr=await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
  if(!kr.ok)throw Error("تعذر التحقق من توقيع Firebase.");
  firebaseKeys={keys:(await kr.json()).keys||[],until:Date.now()+3000000};
 }
 const jwk=firebaseKeys.keys.find(k=>k.kid===head.kid);if(!jwk)throw Error("مفتاح توقيع Firebase غير معروف.");
 const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
 const valid=await crypto.subtle.verify({name:"RSASSA-PKCS1-v1_5"},key,signature,new TextEncoder().encode(parts[0]+"."+parts[1]));
 const now=Math.floor(Date.now()/1000),project=env.FIREBASE_PROJECT_ID||"academia-e6d7b";
 if(!valid||payload.aud!==project||payload.iss!=="https://securetoken.google.com/"+project||!payload.sub||payload.exp<now||payload.iat>now+60||payload.auth_time>now+60)throw Error("جلسة Firebase غير صالحة أو منتهية.");
 const check=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="+encodeURIComponent(env.FIREBASE_API_KEY||API_KEY),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({idToken:token})});
 if(!check.ok)throw Error("انتهت صلاحية حساب الإدارة أو تم إيقافه.");
 const user=(await check.json()).users?.[0];if(!user||user.disabled||Number(payload.auth_time)<Number(user.validSince||0))throw Error("جلسة الإدارة لم تعد صالحة. سجّل الدخول مجددًا.");
 const claims=payload;
 const allowed=centerOnly?(claims.ycAdmin===true||claims.ycCenter===true):(claims.ycAdmin===true||claims.ycCenter===true||(academy&&claims[ACADEMIES[academy].claim]===true));
 if(!allowed)throw Error("الحساب لا يملك صلاحية تنفيذ هذا الإجراء.");
 return {uid:payload.user_id||payload.sub,claims};
}
function store(env){
 const id=env.ATTENDANCE_STORE.idFromName("ahmadiya-attendance-store");
 return env.ATTENDANCE_STORE.get(id);
}
async function kv(env,method,key,value){
 const url="https://store/"+method+"?key="+encodeURIComponent(key);
 const init={method:"POST",headers:{"content-type":"application/json"}};
 if(method==="put")init.body=JSON.stringify(value);
 const r=await store(env).fetch(url,init);if(!r.ok)throw Error("تعذر الوصول إلى مخزن الحضور.");
 const j=await r.json();return j.value??j.items??null;
}
const get=(env,key)=>kv(env,"get",key);
const put=(env,key,value)=>kv(env,"put",key,value);
const del=(env,key)=>kv(env,"delete",key);
const list=(env,prefix)=>kv(env,"list",prefix);
async function firebaseRead(path){
 const r=await fetch(DB+"/"+path.split("/").map(encodeURIComponent).join("/")+".json");
 if(!r.ok)throw Error("تعذر قراءة بيانات الأكاديمية من Firebase.");
 return r.json();
}
async function tokenHash(value){
 const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
 let s="";digest.forEach(c=>s+=String.fromCharCode(c));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
const b64=s=>btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unb64=s=>{const v=s.replace(/-/g,"+").replace(/_/g,"/");return atob(v+"=".repeat((4-v.length%4)%4));};
async function hashCode(code,salt,it){
 const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(code),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:Uint8Array.from(unb64(salt),c=>c.charCodeAt(0)),iterations:it,hash:"SHA-256"},k,256);
 let s="";new Uint8Array(bits).forEach(c=>s+=String.fromCharCode(c));return b64(s);
}
async function equal(a,b){const x=new TextEncoder().encode(String(a)),y=new TextEncoder().encode(String(b));if(x.length!==y.length)return false;let d=0;for(let i=0;i<x.length;i++)d|=x[i]^y[i];return d===0;}
async function parentToken(phone,version,env){
 const bytes=crypto.getRandomValues(new Uint8Array(32));let raw="";bytes.forEach(c=>raw+=String.fromCharCode(c));raw=b64(raw);
 await put(env,PRIVATE+"session:"+await tokenHash(raw),{phone,version,expiresAt:Date.now()+1200000});
 return raw;
}
async function parentSession(req,env){
 const raw=bearer(req);if(raw.length<40)throw Error("انتهت جلسة المتابعة؛ سجّل الدخول مرة أخرى.");
 const s=await get(env,PRIVATE+"session:"+await tokenHash(raw));
 if(!s||s.expiresAt<Date.now())throw Error("انتهت جلسة المتابعة؛ سجّل الدخول مرة أخرى.");
 const g=await get(env,PRIVATE+"guardian:"+s.phone);
 if(!g||!g.enabled||g.version!==s.version)throw Error("تم تغيير أو إلغاء رمز المتابعة. استخدم الرمز الجديد.");
 return {phone:s.phone,guardian:g};
}
function clock(){
 const p=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Cairo",year:"numeric",month:"2-digit",day:"2-digit",weekday:"long",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 const days={Sunday:"الأحد",Monday:"الإثنين",Tuesday:"الثلاثاء",Wednesday:"الأربعاء",Thursday:"الخميس",Friday:"الجمعة",Saturday:"السبت"};
 return {date:p.year+"-"+p.month+"-"+p.day,day:days[p.weekday],minute:Number(p.hour)*60+Number(p.minute),now:new Date().toISOString(),ms:Date.now()};
}
async function academyPlayers(a,env){
 return entries(await firebaseRead(ACADEMIES[a].players)).map(([k,v])=>({...v,id:String(v.id??k)}));
}
async function academySchedules(a,env){
 return entries(await firebaseRead(ACADEMIES[a].schedules)).map(x=>x[1]);
}
function matchingSchedule(rows,c){
 return rows.find(s=>s&&s.active!==false&&s.active!=="false"&&s.active!=="موقوف"&&(s.date?String(s.date)===c.date:String(s.day||"")===c.day))||null;
}
function stateOf(s,sc,c){
 if(s&&s.in&&!s.out)return {code:"inside",label:"داخل التمرين",checkInAt:s.in,minutes:Math.max(0,Math.floor((c.ms-Date.parse(s.in))/60000))};
 if(s&&s.in&&s.out)return {code:"left",label:"خرج من التمرين",checkInAt:s.in,checkOutAt:s.out,minutes:Math.max(0,Math.floor((Date.parse(s.out)-Date.parse(s.in))/60000))};
 if(!sc)return {code:"no-training",label:"لا يوجد تمرين اليوم"};
 const t=String(sc.fromTime||"00:00").split(":").map(Number),start=(t[0]||0)*60+(t[1]||0);
 return c.minute<start?{code:"upcoming",label:"لم يبدأ التمرين بعد",fromTime:sc.fromTime||"",location:sc.location||""}:{code:"absent",label:"لم يحضر",fromTime:sc.fromTime||"",location:sc.location||""};
}
async function parentLogin(req,env){
 const b=await body(req);let phone;try{phone=phoneKey(b.phone);}catch{return {status:401,error:"رقم الهاتف أو رمز المتابعة غير صحيح."};}
 const ip=req.headers.get("cf-connecting-ip")||"unknown",lim=env.GUARDIAN_LIMITER.get(env.GUARDIAN_LIMITER.idFromName(ip+"|"+phone));
 const lr=await lim.fetch("https://limit/consume",{method:"POST"});if(lr.status===429)return {status:429,error:"محاولات كثيرة. حاول مرة أخرى بعد 15 دقيقة."};
 const g=await get(env,PRIVATE+"guardian:"+phone);
 if(!g||!g.enabled||typeof b.code!=="string"||!await equal(await hashCode(b.code,g.salt,g.iterations),g.hash))return {status:401,error:"رقم الهاتف أو رمز المتابعة غير صحيح."};
 await lim.fetch("https://limit/reset",{method:"POST"});
 return {token:await parentToken(phone,g.version,env),expiresIn:1200};
}
async function parentStatus(req,env){
 const session=await parentSession(req,env),c=clock(),refs=[];
 for(const a of Object.keys(ACADEMIES))for(const id of Object.keys(session.guardian.players?.[a]||{}))refs.push({a,id});
 const players=await Promise.all(refs.map(async r=>{
  const a=ACADEMIES[r.a],p=(await academyPlayers(r.a,env)).find(x=>String(x.id)===r.id);
  const contact=await get(env,PRIVATE+"contact:"+r.a+":"+r.id);
  if(!p||!contact||contact.phone!==session.phone)return null;
  const [ss,sc]=await Promise.all([get(env,PRIVATE+"session:"+c.date+":"+r.a+":"+r.id),academySchedules(r.a,env)]);
  const sched=matchingSchedule(sc,c);
  return {id:r.id,academy:r.a,academyLabel:a.label,name:p.name||p.fullName||"لاعب",age:p.age||"",group:p.category||p.belt||"",photo:p.photo||"",schedule:sched?{fromTime:sched.fromTime||"",toTime:sched.toTime||"",location:sched.location||"",day:sched.day||c.day}:null,status:stateOf(ss,sched,c)};
 }));
 return {date:c.date,serverTime:c.now,players:players.filter(Boolean)};
}
async function playersAdmin(req,env,url){
 const a=academyKey(url.searchParams.get("academy"));await verifyStaff(req,env,a);
 const rows=await academyPlayers(a,env),out=[];
 for(const p of rows){const c=await get(env,PRIVATE+"contact:"+a+":"+p.id);out.push({id:p.id,name:p.name||p.fullName||"لاعب",age:p.age||"",guardianPhone:c?.display||""});}
 return out;
}
async function linkPlayer(req,env){
 const b=await body(req),a=academyKey(b.academy),staff=await verifyStaff(req,env,a),id=playerKey(b.playerId);
 const p=(await academyPlayers(a,env)).find(x=>String(x.id)===id);if(!p)throw Error("اللاعب غير موجود في الأكاديمية المحددة.");
 const old=await get(env,PRIVATE+"contact:"+a+":"+id),phone=b.phone?phoneKey(b.phone):"";
 if(old?.phone&&old.phone!==phone){
  const og=await get(env,PRIVATE+"guardian:"+old.phone);
  if(og?.players?.[a])delete og.players[a][id];if(og)await put(env,PRIVATE+"guardian:"+old.phone,og);
 }
 if(!phone){await del(env,PRIVATE+"contact:"+a+":"+id);return {ok:true,message:"تم إلغاء ربط ولي الأمر بهذا اللاعب."};}
 const g=await get(env,PRIVATE+"guardian:"+phone)||{players:{},enabled:false};
 g.players=g.players||{};g.players[a]=g.players[a]||{};g.players[a][id]=true;g.display=String(b.phone).trim();g.updatedAt=new Date().toISOString();
 await put(env,PRIVATE+"guardian:"+phone,g);await put(env,PRIVATE+"contact:"+a+":"+id,{phone,display:String(b.phone).trim(),updatedBy:staff.uid});
 return {ok:true,message:"تم ربط اللاعب. أنشئ رمز المتابعة من لوحة المركز."};
}
async function guardians(req,env){
 await verifyStaff(req,env,null,true);return (await list(env,PRIVATE+"guardian:")||[]).map(x=>({phone:x.value.display||x.key.split(":").pop(),enabled:!!x.value.enabled,count:Object.values(x.value.players||{}).reduce((n,v)=>n+Object.keys(v||{}).length,0),updatedAt:x.value.updatedAt||x.value.codeUpdatedAt||""}));
}
async function saveCode(req,env){
 await verifyStaff(req,env,null,true);const b=await body(req),phone=phoneKey(b.phone),g=await get(env,PRIVATE+"guardian:"+phone);
 if(!g)throw Error("لا يوجد لاعب مرتبط بهذا الرقم. أضف الرقم من لوحة الأكاديمية أولًا.");
 g.version=crypto.randomUUID();
 if(b.action==="delete"){g.enabled=false;g.hash=null;g.salt=null;g.iterations=null;g.codeUpdatedAt=new Date().toISOString();await put(env,PRIVATE+"guardian:"+phone,g);return {ok:true,message:"أُلغي الرمز وجميع الجلسات السابقة."};}
 const code=String(b.code||"").trim();if(!/^[A-Za-z0-9]{6,16}$/.test(code))throw Error("رمز المتابعة من 6 إلى 16 حرفًا أو رقمًا.");
 const bytes=crypto.getRandomValues(new Uint8Array(16));let salt="";bytes.forEach(x=>salt+=String.fromCharCode(x));g.salt=b64(salt);g.iterations=210000;g.hash=await hashCode(code,g.salt,g.iterations);g.enabled=true;g.codeUpdatedAt=new Date().toISOString();await put(env,PRIVATE+"guardian:"+phone,g);
 return {ok:true,message:"تم تغيير رمز المتابعة وإبطال الرمز السابق فورًا."};
}
async function attendance(req,env,url){
 if(req.method==="GET"){
  const a=academyKey(url.searchParams.get("academy"));await verifyStaff(req,env,a);
  const c=clock(),date=url.searchParams.get("date")||c.date,rows=await academyPlayers(a,env),sc=await academySchedules(a,env),d=new Date(date+"T12:00:00Z"),day=DAYS[d.getUTCDay()];
  const out=[];for(const p of rows){const s=await get(env,PRIVATE+"session:"+date+":"+a+":"+p.id);out.push({id:p.id,name:p.name||p.fullName||"لاعب",status:stateOf(s,matchingSchedule(sc,{...c,date,day}),{...c,date,day})});}return out;
 }
 const b=await body(req),a=academyKey(b.academy),staff=await verifyStaff(req,env,a),id=playerKey(b.playerId),act=String(b.action||"");
 if(!["checkin","checkout"].includes(act))throw Error("نوع الحركة غير صحيح.");
 const p=(await academyPlayers(a,env)).find(x=>String(x.id)===id);if(!p)throw Error("اللاعب غير موجود.");
 const c=clock(),key=PRIVATE+"session:"+c.date+":"+a+":"+id,s=await get(env,key)||{};
 if(act==="checkin"&&s.in&&!s.out)throw Error("اللاعب مسجل بالفعل داخل التمرين.");
 if(act==="checkout"&&(!s.in||s.out))throw Error("لا يوجد تسجيل دخول مفتوح لهذا اللاعب.");
 const next=act==="checkin"?{in:c.now,out:null,playerName:p.name||p.fullName||"",by:staff.uid}:{...s,out:c.now,outBy:staff.uid};
 await put(env,key,next);return {ok:true,message:act==="checkin"?"تم تسجيل دخول اللاعب.":"تم تسجيل خروج اللاعب.",session:next};
}
async function route(req,env,url){
 const p=url.pathname,m=req.method;
 if(p==="/api/health"&&m==="GET")return {ok:true,academies:Object.keys(ACADEMIES)};
 if(p==="/api/guardian/login"&&m==="POST")return parentLogin(req,env);
 if(p==="/api/guardian/status"&&m==="GET")return parentStatus(req,env);
 if(p==="/api/admin/guardians"&&m==="GET")return guardians(req,env);
 if(p==="/api/admin/guardian-code"&&m==="POST")return saveCode(req,env);
 if(p==="/api/admin/players"&&m==="GET")return playersAdmin(req,env,url);
 if(p==="/api/admin/link-player"&&m==="POST")return linkPlayer(req,env);
 if(p==="/api/admin/attendance"&&(m==="GET"||m==="POST"))return attendance(req,env,url);
 return {status:404,error:"المسار غير موجود."};
}
export default {
 async fetch(req,env){
  const origin=originAllowed(req.headers.get("origin")||"");if(origin===null)return ok({error:"Origin not allowed"},403);
  const url=new URL(req.url);
  if(req.method==="OPTIONS"){const h={"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"Authorization,Content-Type","access-control-max-age":"86400","vary":"Origin"};if(origin)h["access-control-allow-origin"]=origin;return new Response(null,{status:204,headers:h});}
  if(url.pathname.startsWith("/api/")){
   try{const r=await route(req,env,url);if(r&&r.status)return ok({error:r.error},r.status,origin);return ok(r,200,origin);}
   catch(e){const msg=e?.message||"حدث خطأ داخلي.";const code=/صلاحية|سجّل الدخول|جلسة Firebase/.test(msg)?403:/SESSION_SECRET/.test(msg)?503:400;return ok({error:msg},code,origin);}
  }
  return env.ASSETS.fetch(req);
 }
};

export class AttendanceStore {
 constructor(state){this.state=state;}
 async fetch(req){
  const u=new URL(req.url),method=u.pathname,key=u.searchParams.get("key")||"";
  if(method==="/get")return Response.json({value:await this.state.storage.get(key)});
  if(method==="/put"){await this.state.storage.put(key,await req.json());return Response.json({ok:true});}
  if(method==="/delete"){await this.state.storage.delete(key);return Response.json({ok:true});}
  if(method==="/list"){const items=await this.state.storage.list({prefix:key});return Response.json({items:Array.from(items,([k,v])=>({key:k,value:v}))});}
  return new Response("Not found",{status:404});
 }
}
export class GuardianLimiter {
 constructor(state){this.state=state;}
 async fetch(req){
  const path=new URL(req.url).pathname;
  if(path==="/reset"){await this.state.storage.delete("count");return new Response("ok");}
  const now=Date.now(),old=await this.state.storage.get("count");
  const row=!old||now-old.start>900000?{start:now,count:0}:old;
  if(row.count>=5)return new Response("limited",{status:429});
  row.count++;await this.state.storage.put("count",row);return new Response("ok");
 }
}