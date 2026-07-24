import { describe, expect, it } from '@jest/globals';
import { escapeHtml, safeMailSubject } from '../src/services/emailService.js';

describe('HTML and email content injection protection', () => {
  it('escapes executable HTML before inserting user content into an email', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
    );
    expect(escapeHtml(`'"><script>alert(1)</script>`)).not.toContain('<script>');
  });

  it('removes line breaks used for email header injection', () => {
    const malicious = 'Bateau test\r\nBcc: attacker@example.com\u2028X-Test: injected';
    const subject = safeMailSubject(malicious);

    expect(subject).toBe('Bateau test Bcc: attacker@example.com X-Test: injected');
    expect(subject).not.toMatch(/[\r\n\u2028\u2029]/);
  });

  it('limits dynamic email subject length', () => {
    expect(safeMailSubject('x'.repeat(500))).toHaveLength(200);
  });
});
