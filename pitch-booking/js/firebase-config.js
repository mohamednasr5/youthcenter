/**
 * firebase-config.js - Firebase Modular Initialization
 * Ahmadiah Pitch Manager — يعمل الآن على قاعدة Firebase الموحدة (academia-e6d7b)
 * جميع بيانات الملعب تحت العقدة: pitch_booking/*
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  onValue, 
  update, 
  remove, 
  push, 
  runTransaction 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export const firebaseConfig = {
  apiKey: "AIzaSyDJYIKnZNBMZuXhVAhP4irqjLuzP4jQ16g",
  authDomain: "academia-e6d7b.firebaseapp.com",
  databaseURL: "https://academia-e6d7b-default-rtdb.firebaseio.com",
  projectId: "academia-e6d7b",
  storageBucket: "academia-e6d7b.firebasestorage.app",
  messagingSenderId: "679214276618",
  appId: "1:679214276618:web:f34c9e48d83e338facfff3",
  measurementId: "G-ME9ZF20CZ0"
};

// جذر بيانات الملعب داخل القاعدة الموحدة (يمنع التعارض مع matchResults الخاصة بأكاديمية كرة القدم)
export const PITCH_ROOT = 'pitch_booking';

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Database References Helper
const P = (path) => ref(db, `${PITCH_ROOT}/${path}`);
export const dbRefs = {
  settings: () => P('settings'),
  bookings: (date) => date ? P(`bookings/${date}`) : P('bookings'),
  bookingItem: (date, id) => P(`bookings/${date}/${id}`),
  expenses: (date) => date ? P(`expenses/${date}`) : P('expenses'),
  expenseItem: (date, id) => P(`expenses/${date}/${id}`),
  payments: () => P('payments'),
  telegramSubscribers: () => P('telegramSubscribers'),
  matchResults: () => P('matchResults'),
  auditLogs: () => P('auditLogs'),
  adminUsers: () => P('adminUsers'),
  // أسرار لا تُقرأ علناً (توكن تيليجرام / هاش الدخول القديم) — خارج settings العامة
  secret: (key) => ref(db, `pitch_private/${key}`)
};

export {
  ref,
  set,
  get,
  onValue,
  update,
  remove,
  push,
  runTransaction,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
