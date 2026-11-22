/**
 * availability-core.mjs — منطق خالص (بدون اعتماديات) لبناء النسخة العامة من الحجز.
 * يستورده المتصفح (availability.js) واختبارات Node (tools/tests/test-availability.js).
 */

/* الحقول المسموح بها في النسخة العامة — أي حقل آخر يُحذف */
export const PUBLIC_FIELDS = [
  'bookingId', 'date', 'startTime', 'endTime', 'durationMinutes',
  'startTimestamp', 'endTimestamp', 'period', 'status', 'matchType',
  'customerName', 'teamOneName', 'teamTwoName', 'teamOneCaptain', 'teamTwoCaptain'
];

/* حقول خاصة يجب ألا تتسرب أبداً إلى النسخة العامة */
export const PRIVATE_FIELDS = [
  'customerPhone', 'phone', 'notes', 'totalPrice', 'paidAmount', 'remainingAmount'
];

/**
 * يبني سجل التوفر العام من حجز كامل. يعيد null إن لم يوجد حجز.
 * لا يضمّن أي بيانات تواصل أو دفع أو ملاحظات مهما وردت في المصدر.
 */
export function availabilityFromBooking(booking, fallbackId = null) {
  if (!booking || typeof booking !== 'object') return null;
  const stub = {};
  for (const key of PUBLIC_FIELDS) {
    if (booking[key] !== undefined) stub[key] = booking[key];
  }
  if (!stub.bookingId && fallbackId) stub.bookingId = fallbackId;
  stub.status = stub.status || 'pending';
  stub.updatedAt = Date.now();
  return stub;
}
