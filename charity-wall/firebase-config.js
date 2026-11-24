/* Firebase configuration — Realtime Database is the only database used by Charity Wall. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
export const firebaseConfig = {
 apiKey:'AIzaSyDJYIKnZNBMZuXhVAhP4irqjLuzP4jQ16g', authDomain:'academia-e6d7b.firebaseapp.com',
 databaseURL:'https://academia-e6d7b-default-rtdb.firebaseio.com', projectId:'academia-e6d7b',
 storageBucket:'academia-e6d7b.firebasestorage.app', messagingSenderId:'679214276618',
 appId:'1:679214276618:web:f34c9e48d83e338facfff3', measurementId:'G-ME9ZF20CZ0'
};
export const app=initializeApp(firebaseConfig);
export const db=getDatabase(app);
export const auth=getAuth(app);
export const storage=getStorage(app);
export const TIERS=[
{id:'clay',label:'طين',color:0xa0714f,cssColor:'#a0714f',min:0,max:999.99,metalness:0,roughness:.92,emissive:0x1a0f08,text:'#ffe9d6',order:1},
{id:'red',label:'حمراء',color:0xb3432c,cssColor:'#b3432c',min:1000,max:2999.99,metalness:.05,roughness:.72,emissive:0x2a0a05,text:'#ffe2da',order:2},
{id:'silver',label:'فضية',color:0xc9d2dd,cssColor:'#c9d2dd',min:3000,max:4999.99,metalness:.95,roughness:.22,emissive:0x0d1118,text:'#101828',order:3},
{id:'gold',label:'ذهبية',color:0xf0b542,cssColor:'#f0b542',min:5000,max:10000,metalness:1,roughness:.18,emissive:0x4a2e00,text:'#2b1a00',order:4},
{id:'diamond',label:'ماسية',color:0xd9f4ff,cssColor:'#d9f4ff',min:10000.01,max:999999999,metalness:.55,roughness:.04,emissive:0x123244,text:'#062033',order:5}
];
export const TIER_IDS=TIERS.map(t=>t.id);
export function tierForAmount(total,list=TIERS){const t=list.find(x=>Number(total)>=Number(x.min)&&Number(total)<=Number(x.max));return t?t.id:'clay';}
export function tierById(id,list=TIERS){return list.find(t=>t.id===id)||list[0];}
export function egp(n){return (Number(n)||0).toLocaleString('ar-EG',{maximumFractionDigits:0})+' ج.م';}
export function fmtDate(v){if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'});}
