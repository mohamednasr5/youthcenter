/* Public access layer — Firebase Realtime Database only. */
import {ref,get,onValue,query,orderByChild,limitToLast} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import {db,TIERS} from './firebase-config.js';
const ROOT='charityWall';
const asList=v=>Object.entries(v||{}).map(([id,data])=>({id,...data}));
function timeout(p,ms,label){let t;return Promise.race([p,new Promise((_,rej)=>{t=setTimeout(()=>rej(new Error('انتهت مهلة الاتصال أثناء تحميل '+label)),ms);})]).finally(()=>clearTimeout(t));}
async function read(path,label){const s=await timeout(get(ref(db,path)),12000,label);return s.val();}
export async function loadTiers(){try{const v=await read(ROOT+'/settings/tiers','فئات الطوب');return v&&Array.isArray(v.list)?v.list:TIERS;}catch(e){console.error('[Charity Wall RTDB] tiers',e);throw e;}}
export async function loadBricks(onPage){const v=await read(ROOT+'/bricks','طوب الحائط');const a=asList(v).sort((x,y)=>Number(x.index||0)-Number(y.index||0));if(onPage)onPage(a.length,a.length);return a;}
export async function loadDonors(){const v=await read(ROOT+'/donors','المتبرعين');return asList(v).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ar'));}
export async function loadExpenses(){const v=await read(ROOT+'/expenses','المصروفات');return asList(v).sort((a,b)=>Number(b.date||b.createdAt||0)-Number(a.date||a.createdAt||0));}
export function subscribeNewBricks(afterIndex,cb,onError=()=>{}){return onValue(query(ref(db,ROOT+'/bricks'),orderByChild('index'),limitToLast(30)),s=>{const fresh=asList(s.val()).filter(b=>Number(b.index)>afterIndex).sort((a,b)=>a.index-b.index);if(fresh.length)cb(fresh);},onError);}
export function subscribeSummary(cb,onError=()=>{}){return onValue(ref(db,ROOT+'/settings/public_summary'),s=>{if(s.exists())cb(s.val());},onError);}
export function brickStats(bricks,tiers){const c={};(tiers||TIERS).forEach(t=>c[t.id]=0);(bricks||[]).forEach(b=>{if(c[b.brickType]!==undefined)c[b.brickType]++;});return c;}
