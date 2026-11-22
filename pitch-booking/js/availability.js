/**
 * availability.js — النسخة العامة المصغّرة من الحجوزات (بدون بيانات العملاء الخاصة)
 *
 * المشكلة: pitch_booking/bookings تحتوي اسم العميل وهاتفه وملاحظاته، وكانت مقروءة علناً.
 * الحل: سجل كامل خاص بالإدارة في pitch_booking/bookings (قراءة للمسؤول فقط بعد نشر القواعد)،
 *       ونسخة عامة مصغّرة في pitch_booking/availability تعرض المواعيد المحجوزة فقط.
 *
 * الحقول الممنوعة في النسخة العامة (تفرضها database.rules.json أيضاً):
 *   customerPhone / phone / notes / totalPrice / paidAmount / remainingAmount
 */

import { dbRefs, set, remove, onValue } from './firebase-config.js';
import { availabilityFromBooking } from './availability-core.mjs';

export { availabilityFromBooking };

/**
 * يزامن سجل التوفر العام مع حالة الحجز. مرّر booking = null لحذف السجل.
 * لا يرمي أخطاء: فشل المزامنة يُسجَّل فقط حتى لا يُفشل عملية الحجز نفسها.
 */
export async function syncAvailability(date, bookingId, booking) {
  try {
    const itemRef = dbRefs.availabilityItem(date, bookingId);
    if (!booking) {
      await remove(itemRef);
    } else {
      await set(itemRef, availabilityFromBooking(booking, bookingId));
    }
  } catch (error) {
    console.warn('[availability] تعذرت مزامنة النسخة العامة للحجز', bookingId, error);
  }
}

/**
 * اشتراك قراءة عامة لحجوزات يوم واحد:
 * يقرأ من availability (المسار العام الآمن)، ويعود تلقائياً إلى bookings الكاملة
 * عندما لا تكون النسخة العامة قد أُنشئت بعد (قبل تشغيل tools/backfill-availability.mjs).
 * بعد نشر القواعد تُرفض قراءة bookings للزائر — تُعامل كيوم فارغ.
 * يُرجع دالة إلغاء الاشتراك.
 */
export function subscribePublicDayBookings(dateKey, onData, onError) {
  let fallbackUnsub = null;
  const stopFallback = () => { if (fallbackUnsub) { fallbackUnsub(); fallbackUnsub = null; } };

  const unsubAvailability = onValue(dbRefs.availability(dateKey), (snapshot) => {
    if (snapshot.exists()) {
      stopFallback();
      onData(snapshot.val() || {});
    } else if (!fallbackUnsub) {
      fallbackUnsub = onValue(dbRefs.bookings(dateKey),
        (legacySnap) => onData(legacySnap.val() || {}),
        (error) => {
          if (error && error.code === 'PERMISSION_DENIED') {
            // القواعد الجديدة نشطة ولا توجد حجوزات لهذا اليوم في النسخة العامة = يوم فارغ
            onData({});
          } else if (onError) {
            onError(error);
          }
        });
    }
  }, (error) => { if (onError) onError(error); });

  return () => { unsubAvailability(); stopFallback(); };
}
