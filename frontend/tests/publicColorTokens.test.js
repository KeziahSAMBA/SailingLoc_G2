import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const migratedRoots = [
  'src/components/common',
  'src/components/auth',
  'src/components/account',
  'src/components/documents',
  'src/components/messages',
  'src/pages',
];
const privateRoots = [
  'src/components/locataire',
  'src/components/proprietaire',
  'src/components/admin',
];
const authenticatedRoots = [
  'src/components/auth',
  'src/components/account',
  'src/components/documents',
  'src/components/messages',
];
const privatePageFiles = [
  'src/pages/AdminCreateUserPage.jsx',
  'src/pages/AdminLoginPage.jsx',
  'src/pages/ForgotPasswordPage.jsx',
  'src/pages/MyDocumentsPage.jsx',
  'src/pages/ResetPasswordPage.jsx',
  'src/pages/VerifyEmailPage.jsx',
  'src/pages/HomePageProprio.jsx',
];
const assetAllowlist = new Set(['FlagIcons.jsx']);
const allowedRaw = new Set(
  JSON.parse(
    '["#00247d","#0055a4","#0a3172","#0a527a","#0d3d8c","#16a34a","#333","#5ab4ec","#7dd3fc","#94a3b8","#abd4ff","#cf142b","#e05252","#ef4135","#ef4444","#f59e0b","#fca5a5","#fff","#ffffff","rgb(0,78,87)","rgb(000/45%)","rgb(255255255)","rgb(255255255/78%)","rgba(0,0,0,0.05)","rgba(0,0,0,0.1)","rgba(0,0,0,0.15)","rgba(0,0,0,0.18)","rgba(0,0,0,0.2)","rgba(0,0,0,0.25)","rgba(0,0,0,0.28)","rgba(0,0,0,0.35)","rgba(0,0,0,0.4)","rgba(0,0,0,0.45)","rgba(0,0,0,0.5)","rgba(0,0,0,0.6)","rgba(10,49,114,0.06)","rgba(10,49,114,0.08)","rgba(10,49,114,0.15)","rgba(10,49,114,0.3)","rgba(10,49,114,0.95)","rgba(14,165,233,0.15)","rgba(14,165,233,0.25)","rgba(14,165,233,0.3)","rgba(14,165,233,0.35)","rgba(14,165,233,0.5)","rgba(14,165,233,0.55)","rgba(14,165,233,0.8)","rgba(14,165,233,0.95)","rgba(2,44,74,0.18)","rgba(2,44,74,0.25)","rgba(2,44,74,0.35)","rgba(20,20,30,0.85)","rgba(224,82,82,0.08)","rgba(255,255,255,0.05)","rgba(255,255,255,0.1)","rgba(255,255,255,0.15)","rgba(255,255,255,0.2)","rgba(255,255,255,0.25)","rgba(255,255,255,0.3)","rgba(255,255,255,0.4)","rgba(255,255,255,0.45)","rgba(255,255,255,0.5)","rgba(255,255,255,0.6)","rgba(255,255,255,0.7)","rgba(255,255,255,0.95)","rgba(255,255,255,0.98)","rgba(3,24,30,0.62)","rgba(3,24,30,0.72)","rgba(3,35,39,0.72)","rgba(3,35,39,0.8)","rgba(51,51,51,0.4)","rgba(90,180,236,0.2)","rgba(90,180,236,0.45)"]'
  )
);
// Stripe Elements est une iframe : les variables CSS de l'application ne la
// traversent pas. Ces valeurs sont l'exception visuelle explicitement testée.
for (const stripeIframeColor of ['#f8fafc', '#f87171', 'rgba(203,213,225,0.65)']) {
  allowedRaw.add(stripeIframeColor);
}

function filesBelow(relative) {
  const absolute = path.join(root, relative);
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relative, entry.name);
    return entry.isDirectory()
      ? filesBelow(child)
      : /\.(?:js|jsx)$/.test(entry.name)
        ? [child]
        : [];
  });
}

test('les tokens publics conservent les valeurs historiques du thème clair', () => {
  const css = readFileSync(path.join(root, 'src/index.css'), 'utf8');
  for (const declaration of [
    '--sl-page: 248 250 252',
    '--sl-surface: 255 255 255',
    '--sl-content: 15 23 42',
    '--sl-brand: 90 180 236',
    '--sl-brand-navy: 10 49 114',
    '--sl-action: 14 165 233',
  ]) {
    assert.ok(css.includes(declaration), `token absent ou altéré: ${declaration}`);
  }
});

test('les tokens privés conservent les teintes historiques du thème clair', () => {
  const css = readFileSync(path.join(root, 'src/index.css'), 'utf8');
  for (const declaration of [
    '--sl-brand-hover: 74 163 219',
    '--sl-action-pale: 186 230 253',
    '--sl-action-soft: 125 211 252',
    '--sl-action-bright: 56 189 248',
    '--sl-action-deep: 3 105 161',
    '--sl-dark-muted: 51 65 85',
    '--sl-dark-strong: 2 6 23',
    '--sl-content-bright: 241 245 249',
    '--sl-content-light: 226 232 240',
    '--sl-content-media: 209 213 219',
    '--sl-content-soft: 203 213 225',
    '--sl-content-subtle: 148 163 184',
    '--sl-success-base: 16 185 129',
    '--sl-success-bright: 52 211 153',
    '--sl-success-soft: 110 231 183',
    '--sl-success-deep: 5 150 105',
    '--sl-warning-base: 245 158 11',
    '--sl-warning-bright: 251 191 36',
    '--sl-warning-soft: 252 211 77',
    '--sl-warning-pale: 253 230 138',
    '--sl-danger-base: 239 68 68',
    '--sl-danger-bright: 248 113 113',
    '--sl-danger-soft: 252 165 165',
    '--sl-danger-pale: 254 202 202',
    '--sl-chart-violet: 167 139 250',
  ]) {
    assert.ok(css.includes(declaration), `token privé absent ou altéré: ${declaration}`);
  }
});

test('aucune nouvelle couleur brute ne contourne les tokens dans les fichiers migrés', () => {
  for (const relative of migratedRoots.flatMap(filesBelow)) {
    if (assetAllowlist.has(path.basename(relative))) continue;
    const source = readFileSync(path.join(root, relative), 'utf8')
      .toLowerCase()
      .replaceAll(/\s/g, '');
    const colors = (source.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/g) || []).filter(
      (color) => !color.includes('var(')
    );
    for (const color of colors)
      assert.ok(allowedRaw.has(color), `${relative}: couleur brute non autorisée ${color}`);
  }
});

test('les espaces privés n’utilisent que les tokens de couleur déclarés', () => {
  // Les espaces privés n’ont aucune exception : même les graphiques et les
  // états de tableau doivent référencer les tokens, afin de rester migrables.
  const privateColorPattern =
    /\b(?:text|bg|border|ring|from|via|to|divide|placeholder|fill|stroke|decoration|accent|shadow)-(?:slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d+)?(?:\/\d+)?|\b(?:text|bg|border|ring|from|via|to|divide|placeholder|fill|stroke|decoration|accent|shadow)-\[#(?:[0-9a-f]{3,8})\]/gi;

  for (const relative of [
    ...privateRoots.flatMap(filesBelow),
    ...authenticatedRoots.flatMap(filesBelow),
    ...privatePageFiles,
  ]) {
    const source = readFileSync(path.join(root, relative), 'utf8');
    const rawColors = (source.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi) || []).filter(
      (color) => !color.toLowerCase().includes('var(')
    );
    assert.equal(rawColors.length, 0, `${relative}: couleur brute privée non autorisée`);

    const rawTailwindColors = source.match(privateColorPattern) || [];
    assert.equal(
      rawTailwindColors.length,
      0,
      `${relative}: classes de couleur privées non tokenisées: ${rawTailwindColors.join(', ')}`
    );
  }
});
