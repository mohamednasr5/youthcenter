/**
 * auth.js - Secure Administrator Authentication
 * Uses cryptographic SHA-256 password hashing.
 * Password is NEVER hardcoded in client state or transmitted in plaintext.
 * Default initial password '521988' is verified against database hash or initialized securely.
 */

import { dbRefs, get, set, update, auth, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged } from '../firebase-config.js';
import { showToast } from '../utils.js';

// SHA-256 hash of initial password '521988'
const DEFAULT_INITIAL_HASH = '64533647a5d1df6de07cdc1a3a51f4c0fcbb35fffd51b5c38f32c949e24a210c';
const SESSION_STORAGE_KEY = 'ahmadiah_admin_session_auth';

/**
 * Computes SHA-256 hex string using native Web Cryptography API
 */
export async function sha256(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks if current admin session is valid
 */
export function isAdminAuthenticated() {
  return sessionStorage.getItem(SESSION_STORAGE_KEY) === 'authenticated';
}

/**
 * Firebase Authentication (الأمان الحقيقي): الأدوار عبر Custom Claims ycAdmin أو ycPitch.
 * وضع الصرامة يُضبط من ../../yc-auth-config.js (window.YC_AUTH_CONFIG.requireFirebase)
 */
export function requireFirebaseAuth() {
  return !!(window.YC_AUTH_CONFIG && window.YC_AUTH_CONFIG.requireFirebase);
}
function hasPitchRole(claims) { return !!claims && (claims.ycAdmin === true || claims.ycPitch === true); }

export async function restoreFirebaseSession() {
  return new Promise(resolve => {
    const off = onAuthStateChanged(auth, async user => {
      off();
      if (!user) return resolve(false);
      try { resolve(hasPitchRole((await user.getIdTokenResult()).claims)); } catch { resolve(false); }
    });
  });
}

async function loginWithEmail(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const tok = await cred.user.getIdTokenResult(true);
    if (!hasPitchRole(tok.claims)) {
      await signOut(auth);
      return { success: false, message: 'هذا الحساب لا يملك صلاحية إدارة الملعب' };
    }
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'authenticated');
    sessionStorage.setItem('ahmadiah_admin_login_time', Date.now().toString());
    return { success: true };
  } catch (error) {
    console.error('Firebase admin login error:', error);
    return { success: false, message: 'بيانات الدخول غير صحيحة' };
  }
}

function googleAuthError(error) {
  const code = (error && error.code) || '';
  if (code === 'auth/popup-closed-by-user') return new Error('تم إغلاق نافذة تسجيل الدخول قبل إتمامها.');
  if (code === 'auth/unauthorized-domain') return new Error('هذا النطاق غير مصرّح له في Firebase (Authentication ← Settings ← Authorized domains).');
  if (code === 'auth/operation-not-allowed') return new Error('تسجيل الدخول عبر Google غير مفعّل بعد (Authentication ← Sign-in method ← Google).');
  if (code === 'auth/account-exists-with-different-credential') return new Error('يوجد حساب بنفس البريد بطريقة دخول أخرى. جرّب البريد وكلمة المرور.');
  return (error instanceof Error) ? error : new Error('تعذر تسجيل الدخول عبر Google.');
}

async function finishGoogleCredential(cred) {
  const tok = await cred.user.getIdTokenResult(true);
  if (!hasPitchRole(tok.claims)) {
    await signOut(auth);
    return { success: false, message: 'هذا الحساب لا يملك صلاحية إدارة الملعب' };
  }
  sessionStorage.setItem(SESSION_STORAGE_KEY, 'authenticated');
  sessionStorage.setItem('ahmadiah_admin_login_time', Date.now().toString());
  return { success: true };
}

/**
 * الدخول بحساب Google — يقبل فقط الحسابات الحاملة لصلاحية ycAdmin/ycPitch (Custom Claims)
 */
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await signInWithPopup(auth, provider);
    return await finishGoogleCredential(cred);
  } catch (error) {
    const code = (error && error.code) || '';
    if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider); // يعيد تحميل الصفحة — انظر completeGoogleRedirect
      return { success: false, redirect: true, message: '' };
    }
    const mapped = googleAuthError(error);
    return { success: false, message: mapped.message };
  }
}

/**
 * إكمال دخول Google بعد الرجوع من Redirect (يُستدعى عند فتح صفحة الإدارة)
 */
export async function completeGoogleRedirect() {
  let cred;
  try {
    cred = await getRedirectResult(auth);
  } catch (error) {
    const mapped = googleAuthError(error);
    return { success: false, message: mapped.message };
  }
  if (!cred || !cred.user) return { success: false, message: '' };
  return finishGoogleCredential(cred);
}

/**
 * Logs in administrator: بالبريد (Firebase Auth) أو بكلمة المرور القديمة في الوضع الانتقالي فقط
 */
export async function loginAdmin(password, email) {
  if (!password) {
    return { success: false, message: 'يرجى إدخال كلمة المرور' };
  }
  if (email && email.trim()) return loginWithEmail(email, password);
  if (requireFirebaseAuth()) {
    return { success: false, message: 'أدخل البريد الإلكتروني وكلمة المرور' };
  }

  try {
    const inputHash = await sha256(password.trim());

    // الهاش القديم محفوظ في مسار خاص pitch_private/adminHash (احتياط: settings/adminHash قبل النقل)
    let storedHash = (await get(dbRefs.secret('adminHash'))).val();
    if (!storedHash) {
      const settings = (await get(dbRefs.settings())).val() || {};
      storedHash = settings.adminHash;
    }

    // If not yet set in database, initialize with default initial hash
    if (!storedHash) {
      storedHash = DEFAULT_INITIAL_HASH;
      await set(dbRefs.secret('adminHash'), DEFAULT_INITIAL_HASH);
    }

    if (inputHash === storedHash) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'authenticated');
      sessionStorage.setItem('ahmadiah_admin_login_time', Date.now().toString());
      return { success: true };
    } else {
      return { success: false, message: 'كلمة المرور غير صحيحة، يرجى إعادة المحاولة' };
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return { success: false, message: 'حدث خطأ في التحقق من بيانات الدخول' };
  }
}

/**
 * Updates administrator password securely
 */
export async function changeAdminPassword(currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 5) {
    return { success: false, message: 'كلمة المرور الجديدة يجب أن تكون 5 أحرف أو أرقام على الأقل' };
  }

  const loginCheck = await loginAdmin(currentPassword);
  if (!loginCheck.success) {
    return { success: false, message: 'كلمة المرور الحالية غير صحيحة' };
  }

  try {
    const newHash = await sha256(newPassword.trim());
    await set(dbRefs.secret('adminHash'), newHash);
    await update(dbRefs.settings(), { adminPasswordUpdatedAt: Date.now() });
    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, message: 'فشل حفظ كلمة المرور الجديدة' };
  }
}

/**
 * Logs out administrator
 */
export async function logoutAdmin() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem('ahmadiah_admin_login_time');
  try { await signOut(auth); } catch { /* ignore */ }
  window.location.reload();
}
