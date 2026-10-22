import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePassword, validatePhoneNumber, hasPermission } from './auth-rules';

test('validatePassword enforces 8+ chars, uppercase, lowercase, number, special char', () => {
  const weak = validatePassword('weak');
  assert.equal(weak.isValid, false);
  assert.equal(weak.hasMinLength, false);

  const missingSpecial = validatePassword('Password123');
  assert.equal(missingSpecial.isValid, false);
  assert.equal(missingSpecial.hasSpecialChar, false);

  const strong = validatePassword('Dispatch@2026Secure!');
  assert.equal(strong.isValid, true);
  assert.equal(strong.errors.length, 0);
});

test('validatePhoneNumber accepts valid formats and rejects malformed inputs', () => {
  const valid1 = validatePhoneNumber('+1 555-234-5678');
  assert.equal(valid1.isValid, true);
  assert.equal(valid1.formatted, '+15552345678');

  const valid2 = validatePhoneNumber('447911123456');
  assert.equal(valid2.isValid, true);
  assert.equal(valid2.formatted, '+447911123456');

  const invalid = validatePhoneNumber('123');
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.error);
});

test('hasPermission enforces role boundaries strictly', () => {
  assert.equal(hasPermission('SUPER_ADMIN', 'MANAGE_SYSTEM'), true);
  assert.equal(hasPermission('SUPER_ADMIN', 'VIEW_AUDIT_LOGS'), true);

  assert.equal(hasPermission('BUSINESS_OWNER', 'CREATE_DISPATCH'), true);
  assert.equal(hasPermission('BUSINESS_OWNER', 'MANAGE_SYSTEM'), false);

  assert.equal(hasPermission('SENDER', 'CREATE_DISPATCH'), true);
  assert.equal(hasPermission('SENDER', 'RECEIVE_DISPATCH'), false);

  assert.equal(hasPermission('RECEIVER', 'RECEIVE_DISPATCH'), true);
  assert.equal(hasPermission('RECEIVER', 'CREATE_DISPATCH'), false);
});
