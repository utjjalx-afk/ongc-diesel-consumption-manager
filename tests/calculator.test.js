import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDutyAndOt, allocateJobToCrew, generateMonthlyStatements, generateYearlyStatements } from '../src/otFdeCalculator.js';
import { hashPassword, verifyPassword, migratePasswords } from '../src/auth.js';

test('OT counts only time actually worked outside the normal window', () => {
  for (const [start, end, expected] of [
    ['06:00', '07:00', 1], ['18:00', '19:00', 1], ['08:30', '16:30', 0],
    ['07:30', '17:30', 2], ['20:00', '02:00', 6], ['08:30', '08:30', 0]
  ]) assert.equal(calculateDutyAndOt(start, end).otHours, expected);
  assert.throws(() => calculateDutyAndOt('25:00', '16:30'));
  assert.throws(() => calculateDutyAndOt('06:00', '07:00', { manualOtHours: -1 }));
});

test('monthly and annual claims retain the job rate after a pay revision', () => {
  const roster = { A: { name: 'Test', otRate: 100 } };
  const job = allocateJobToCrew({ date: '2025-01-01', depTime: '08:30', arrTime: '18:30', crewCodes: ['A'] }, roster);
  roster.A.otRate = 200;
  assert.equal(generateMonthlyStatements([job], roster, '2025-01').ot.A.totalOtAmount, 200);
  assert.equal(generateYearlyStatements([job], roster, '2025').summary.totalOtAmount, 200);
  assert.equal(allocateJobToCrew({ ...job, arrTime: '19:30' }, roster).memberAllocations[0].otRate, 100);
  assert.throws(() => allocateJobToCrew({ ...job, crewCodes: ['A', 'A'] }, roster));
});

test('password migration removes clear text and aliases; comparison is case sensitive', () => {
  const db = migratePasswords({ users: [{ password: 'TestPassword', altPasswords: ['old'] }] });
  assert.equal(db.users[0].password, undefined);
  assert.equal(db.users[0].altPasswords, undefined);
  assert(verifyPassword('TestPassword', db.users[0].passwordHash));
  assert(!verifyPassword('testpassword', db.users[0].passwordHash));
  assert.notEqual(hashPassword('same'), hashPassword('same'));
});
