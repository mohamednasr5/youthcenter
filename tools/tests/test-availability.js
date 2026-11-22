/* test-availability.js — يتحقق أن النسخة العامة من الحجز لا تسرب بيانات العملاء الخاصة */
const path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL:', m); } };

(async () => {
  const core = await import(path.join(__dirname, '..', '..', 'pitch-booking', 'js', 'availability-core.mjs'));
  const { availabilityFromBooking, PRIVATE_FIELDS } = core;

  console.log('1) النسخة العامة تحذف الهاتف والملاحظات والمدفوعات');
  {
    const full = {
      bookingId: 'b1', date: '2026-12-01', startTime: '18:00', endTime: '19:00',
      durationMinutes: 60, startTimestamp: 1, endTimestamp: 2, period: 'ليلي',
      status: 'pending', matchType: 'standard',
      customerName: 'فريق النجوم', teamOneName: 'النجوم', teamTwoName: 'الهلال',
      teamOneCaptain: 'أ', teamTwoCaptain: 'ب',
      customerPhone: '01000000000', phone: '01000000000', notes: 'ملاحظة خاصة',
      totalPrice: 180, paidAmount: 50, remainingAmount: 130
    };
    const stub = availabilityFromBooking(full);
    for (const f of PRIVATE_FIELDS) ok(stub[f] === undefined, `الحقل الخاص ${f} محذوف`);
    ok(stub.customerName === 'فريق النجوم', 'اسم العرض العام محفوظ');
    ok(stub.startTime === '18:00' && stub.endTime === '19:00', 'المواعيد محفوظة');
    ok(stub.status === 'pending', 'الحالة محفوظة');
    ok(typeof stub.updatedAt === 'number', 'updatedAt موجود');
  }

  console.log('2) القيم الافتراضية والحالات الطرفية');
  {
    ok(availabilityFromBooking(null) === null, 'null يعيد null');
    ok(availabilityFromBooking(undefined) === null, 'undefined يعيد null');
    const stub = availabilityFromBooking({ startTime: '20:00' }, 'auto-id');
    ok(stub.bookingId === 'auto-id', 'bookingId يؤخذ من المعامل الاحتياطي');
    ok(stub.status === 'pending', 'الحالة الافتراضية pending');
    ok(!('customerPhone' in stub), 'لا مفاتيح خاصة فارغة');
  }

  console.log('3) القواعد تمنع الحقول الخاصة في availability');
  {
    const fs = require('fs');
    const rules = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'database.rules.json'), 'utf8'));
    const avail = rules.rules.pitch_booking.availability;
    ok(avail && avail['.read'] === true, 'availability مقروءة علناً');
    const validate = avail['$date']['$bookingId']['.validate'];
    for (const f of PRIVATE_FIELDS) ok(validate.includes(`'${f}'`), `القواعد تمنع ${f}`);
    ok(rules.rules.pitch_booking.bookings['.read'] !== true, 'bookings لم تعد مقروءة علناً');
  }

  console.log(`\nالنتيجة: ${pass} نجح، ${fail} فشل`);
  process.exit(fail ? 1 : 0);
})();
