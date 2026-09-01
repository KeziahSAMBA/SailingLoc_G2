import assert from 'node:assert/strict';
import { normalizeSpectatorPath, withSpectatorMode } from '../src/utils/spectatorUrl.js';

const ORIGIN = 'https://app.example.test';

assert.equal(normalizeSpectatorPath('/admin', ORIGIN), '/admin');
assert.equal(
  normalizeSpectatorPath('/admin?tab=users&sort=asc', ORIGIN),
  '/admin?tab=users&sort=asc'
);
assert.equal(normalizeSpectatorPath('admin?tab=users', ORIGIN), '/admin?tab=users');
assert.equal(normalizeSpectatorPath('/\\evil.com', ORIGIN), '/');
assert.equal(normalizeSpectatorPath('//evil.example.test', ORIGIN), '/');
assert.equal(normalizeSpectatorPath('https://evil.example.test', ORIGIN), '/');
assert.equal(normalizeSpectatorPath('javascript:alert(1)', ORIGIN), '/');
assert.equal(normalizeSpectatorPath('/admin\u0000', ORIGIN), '/');
assert.equal(normalizeSpectatorPath('/admin%00', ORIGIN), '/');
assert.equal(normalizeSpectatorPath('https://user:password@app.example.test/admin', ORIGIN), '/');
assert.equal(normalizeSpectatorPath('/admin%5C%5Cevil', ORIGIN), '/');
assert.equal(
  withSpectatorMode('/admin?tab=users', 'owner', ORIGIN),
  '/admin?tab=users&spectator=owner'
);
assert.equal(withSpectatorMode('/admin#users', 'owner', ORIGIN), '/admin?spectator=owner#users');
assert.equal(
  withSpectatorMode('https://evil.example.test/admin', 'owner', ORIGIN),
  '/?spectator=owner'
);
assert.equal(withSpectatorMode('/admin', 'owner', ORIGIN), '/admin?spectator=owner');
