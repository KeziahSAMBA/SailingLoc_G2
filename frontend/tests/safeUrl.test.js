import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedHttpsUrl, requireStripeUrl } from '../src/utils/safeUrl.js';

test('accepts Stripe HTTPS links and their subdomains', () => {
  assert.equal(isAllowedHttpsUrl('https://connect.stripe.com/setup', ['stripe.com']), true);
  assert.equal(requireStripeUrl('https://dashboard.stripe.com/test'), 'https://dashboard.stripe.com/test');
});

test('rejects DOM-XSS and lookalike URLs', () => {
  const malicious = [
    'javascript:alert(document.cookie)',
    'data:text/html,<script>alert(1)</script>',
    'http://connect.stripe.com/setup',
    'https://stripe.com.attacker.example/phishing',
    'https://notstripe.com/phishing',
    'not a url',
  ];

  for (const value of malicious) {
    assert.equal(isAllowedHttpsUrl(value, ['stripe.com']), false);
    assert.throws(() => requireStripeUrl(value), /non autorisée/);
  }
});
