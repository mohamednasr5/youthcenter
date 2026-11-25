const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const assert = require('node:assert/strict');

const admin = read('charity-wall/admin/admin.js');
const donorStart = admin.indexOf('async function addDonor(data){');
const donorEnd = admin.indexOf('async function updateDonor(', donorStart);
assert.ok(donorStart >= 0 && donorEnd > donorStart, 'addDonor function must exist');
const donorFn = admin.slice(donorStart, donorEnd);
assert.match(donorFn, /donors\//, 'donor creation must write donor records');
assert.match(donorFn, /donors_private\//, 'donor creation must write private donor details');
assert.doesNotMatch(donorFn, /updateSummary\s*\(/, 'adding a donor must not recalculate finance totals');
assert.doesNotMatch(donorFn, /rref\(['"]expenses/, 'adding a donor must never write to expenses');

const donorHandlerStart = admin.indexOf("$('#donorForm').addEventListener('submit'");
const donorHandlerEnd = admin.indexOf('/* تعديل متبرع', donorHandlerStart);
assert.ok(donorHandlerStart >= 0 && donorHandlerEnd > donorHandlerStart, 'donor form handler must exist');
const donorHandler = admin.slice(donorHandlerStart, donorHandlerEnd);
assert.match(donorHandler, /stopPropagation\(\)/, 'donor submit must be isolated from other forms');
assert.match(donorHandler, /تعذرت إضافة المتبرع/, 'donor errors must be visible');

const alias = read('charity-wall/admin.html');
assert.match(alias, /admin\/index\.html/, 'standalone admin route must forward to the protected admin app');
const adminPage = read('charity-wall/admin/index.html');
assert.match(adminPage, /id="loginScreen"/, 'standalone admin page must retain its login gate');

const notFound = read('404.html');
assert.match(notFound, /الصفحة المطلوبة غير موجودة/, '404 page must explain the missing page');
assert.match(notFound, /مركز شباب الأحمدية موجودين دايمًا/, '404 page must carry the center message');
assert.match(notFound, /@keyframes shoot/, '404 page must animate the football shot');
assert.match(notFound, /@keyframes goalPop/, '404 page must animate the goal celebration');

/* ─── عودة الطوبة لمكانها بعد 5 ثوانٍ (إصلاح اختفائها بعد الفتح/التحطيم) ─── */
const wall3d = read('charity-wall/wall-3d.js');
assert.match(
  wall3d, /matrix:\s*finalMatrix/,
  'entry matrix must store the full-scale finalMatrix — storing the shrunk fly-in matrix (0.001) made bricks vanish on first tap and never return after smash'
);
assert.doesNotMatch(
  wall3d, /matrix:\s*dummy\.matrix\.clone\(\)/,
  'must never persist the shrunken dummy matrix as the brick base'
);
assert.match(
  wall3d, /popBrick\(group, entry/,
  'first tap must pop the brick out of the wall and return it after 5 seconds'
);
assert.match(
  wall3d, /labelBaseZ/,
  'brick entry must remember the label rest position so the nameplate follows the popped brick home'
);

const anims = read('charity-wall/animations.js');
assert.match(anims, /export function killPop/, 'pop animation must be cancellable (killPop) for hammer combos');
assert.match(anims, /scl\.x < 0\.5/, 'shake/rebuild/pop must guard against corrupted near-zero scale matrices');

console.log('✓ Charity Wall donor isolation, standalone admin route, animated 404, and brick-return tests passed');
