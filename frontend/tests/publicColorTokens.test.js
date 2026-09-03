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

// Dette visuelle historique figée au niveau du fichier et du nombre
// d'occurrences. Ce manifeste empêche qu'une exception soit réutilisée dans un
// autre composant. Chaque entrée doit disparaître lorsque le composant est
// migré ; elle ne doit jamais être élargie pour faire passer un nouveau code.
const RAW_EXCEPTION_COUNTS = {
  'src/components/common/BoatReviews.jsx': {
    'rgba(255,255,255,0.1)': 1,
    'rgba(255,255,255,0.2)': 1,
    'rgba(0,0,0,0.4)': 1,
  },
  'src/components/common/Carrousel.jsx': { '#333': 1, 'rgba(51,51,51,0.4)': 1 },
  'src/components/common/ClientReviews.jsx': {
    'rgba(255,255,255,0.1)': 1,
    'rgba(255,255,255,0.2)': 1,
    'rgba(0,0,0,0.4)': 2,
  },
  'src/components/common/CookieConsentBanner.jsx': { 'rgba(0,0,0,0.15)': 1 },
  'src/components/common/FilAriane.jsx': {
    '#0a527a': 2,
    'rgba(255,255,255,0.1)': 1,
    'rgba(255,255,255,0.3)': 1,
    '#0a3172': 2,
    'rgba(14,165,233,0.95)': 2,
  },
  'src/components/common/FilterBar.jsx': {
    'rgba(14,165,233,0.95)': 1,
    '#0a527a': 5,
    'rgba(255,255,255,0.1)': 1,
    'rgba(0,0,0,0.05)': 1,
    'rgba(255,255,255,0.3)': 1,
    'rgba(0,0,0,0.1)': 1,
    'rgba(255,255,255,0.98)': 1,
    'rgba(0,0,0,0.25)': 1,
  },
  'src/components/common/Footer.jsx': {
    '#fff': 2,
    'rgba(255,255,255,0.5)': 2,
    'rgba(0,0,0,0.6)': 2,
    'rgba(90,180,236,0.2)': 1,
    'rgba(255,255,255,0.15)': 1,
  },
  'src/components/common/GhostButton.jsx': { 'rgba(10,49,114,0.3)': 1, 'rgba(0,0,0,0.5)': 1 },

  'src/components/common/Header/shared/FlagIcons.jsx': {
    '#0055a4': 1,
    '#ffffff': 1,
    '#ef4135': 1,
    '#00247d': 1,
    '#fff': 2,
    '#cf142b': 2,
  },

  'src/components/common/Header/shared/SettingsMenu.jsx': {
    'rgba(255,255,255,0.5)': 1,
  },

  'src/components/common/InvoiceButton.jsx': { '#abd4ff': 1 },
  'src/components/common/MapView.jsx': {
    'rgba(2,44,74,0.25)': 1,
    'rgba(2,44,74,0.35)': 2,
    'rgba(2,44,74,0.18)': 1,
  },
  'src/components/common/PageLoadGateScreen.jsx': {
    'rgba(3,24,30,0.72)': 1,
    'rgba(3,35,39,0.8)': 1,
  },
  'src/components/common/SearchBar.jsx': {
    'rgba(0,0,0,0.45)': 1,
    'rgba(255,255,255,0.1)': 1,
    'rgba(0,0,0,0.05)': 1,
    'rgba(255,255,255,0.15)': 1,
    'rgba(255,255,255,0.3)': 1,
    'rgba(0,0,0,0.1)': 1,
  },
  'src/components/common/ShareButton.jsx': {
    'rgba(20,20,30,0.85)': 1,
    'rgba(255,255,255,0.2)': 1,
    'rgba(0,0,0,0.4)': 1,
  },
  'src/components/common/Spinner.jsx': { '#5ab4ec': 1 },
  'src/pages/AboutPage.jsx': {
    'rgba(0,0,0,0.18)': 2,
    'rgba(3,24,30,0.62)': 1,
    'rgba(3,35,39,0.72)': 1,
  },
  'src/pages/CategoryPage.jsx': {
    'rgba(0,0,0,0.5)': 2,
    'rgb(255255255)': 1,
    'rgb(000/45%)': 2,
    'rgb(255255255/78%)': 1,
    'rgba(14,165,233,0.35)': 2,
    'rgba(14,165,233,0.15)': 4,
    'rgba(255,255,255,0.5)': 1,
    'rgba(14,165,233,0.8)': 1,
    'rgba(14,165,233,0.5)': 1,
    'rgba(255,255,255,0.1)': 3,
    'rgba(255,255,255,0.3)': 4,
    '#ffffff': 3,
    'rgba(14,165,233,0.55)': 1,
    'rgba(10,49,114,0.95)': 1,
    'rgba(0,0,0,0.28)': 1,
    'rgba(0,0,0,0.4)': 1,
    'rgba(255,255,255,0.2)': 1,
  },
  'src/pages/ContactPage.jsx': {
    'rgba(0,0,0,0.18)': 4,
    'rgba(3,24,30,0.62)': 1,
    'rgba(3,35,39,0.72)': 1,
    'rgba(14,165,233,0.55)': 1,
    'rgba(14,165,233,0.35)': 1,
    'rgba(10,49,114,0.95)': 1,
  },
  'src/pages/HomePage.jsx': {
    'rgb(0,78,87)': 1,
    'rgba(14,165,233,0.3)': 1,
    'rgba(0,0,0,0.25)': 1,
    'rgba(14,165,233,0.95)': 1,
  },
  'src/pages/legal/LegalLayout.jsx': {
    'rgba(3,24,30,0.62)': 1,
    'rgba(3,35,39,0.72)': 1,
    'rgba(0,0,0,0.18)': 1,
  },
  'src/pages/NotFoundPage.jsx': {
    '#fff': 2,
    'rgba(255,255,255,0.15)': 1,
    'rgba(90,180,236,0.45)': 1,
    '#5ab4ec': 4,
    'rgba(255,255,255,0.2)': 1,
    'rgba(255,255,255,0.6)': 1,
  },
  'src/pages/ProductPage.jsx': {
    'rgba(255,255,255,0.1)': 3,
    'rgba(255,255,255,0.2)': 3,
    'rgba(0,0,0,0.5)': 2,
    'rgba(0,0,0,0.4)': 3,
    'rgba(14,165,233,0.15)': 2,
    '#ffffff': 1,
    'rgba(255,255,255,0.3)': 3,
    'rgba(14,165,233,0.55)': 1,
    'rgba(14,165,233,0.35)': 1,
    'rgba(10,49,114,0.95)': 1,
  },
  'src/pages/ReservationPage.jsx': {
    '#ffffff': 1,
    'rgba(255,255,255,0.4)': 1,
    '#7dd3fc': 2,
    '#fca5a5': 1,
    '#f0f9fc': 1,
    'rgba(190,218,229,0.65)': 1,
    '#4baedc': 1,
    '#ad4278': 3,
    '#f6f3fc': 1,
    'rgba(205,194,222,0.65)': 1,
    '#9679d0': 1,
    '#fcf7ef': 1,
    'rgba(238,221,205,0.65)': 1,
    '#e08327': 1,
    '#f8fafc': 1,
    'rgba(203,213,225,0.65)': 1,
    '#f87171': 1,
    '#eff9ff': 1,
    'rgba(193,220,231,0.65)': 1,
    '#90ddf6': 1,
    '#f3a6ce': 3,
    '#f9f5ff': 1,
    'rgba(220,207,237,0.65)': 1,
    '#e2d5ff': 1,
    '#fff7eb': 1,
    'rgba(237,211,187,0.65)': 1,
    '#ffd7a0': 1,
  },
};

const TAILWIND_EXCEPTION_COUNTS = {
  'src/components/common/Carrousel.jsx': {
    'border-black/40': 1,
    'bg-slate-800': 3,
    'border-black/10': 1,
  },
  'src/components/common/FavoriteButton.jsx': { 'text-red-500': 1 },
  'src/components/common/FilAriane.jsx': {
    'text-[#0a527a]': 2,
    'text-sky-700': 2,
    'text-gray-900': 1,
  },
  'src/components/common/FilterBar.jsx': {
    'accent-sky-500': 2,
    'text-[#0a527a]': 5,
    'text-sky-800': 1,
    'divide-gray-100': 1,
  },
  'src/components/common/Footer.jsx': { 'text-pink-400': 1, 'text-yellow-400/70': 1 },
  'src/components/common/Header/shared/HeaderDropdown.jsx': {
    'ring-slate-200': 1,
    'border-slate-100': 1,
    'text-red-600': 1,
    'bg-red-50': 1,
    'text-slate-700': 1,
  },
  'src/components/common/InvoiceButton.jsx': {
    'bg-slate-900/90': 1,
    'text-slate-950': 1,
    'bg-[#abd4ff]': 1,
  },
  'src/components/common/ReviewFilterBar.jsx': { 'border-sky-400': 1, 'text-gray-900': 2 },
  'src/components/common/ReviewPagination.jsx': { 'border-sky-400': 1, 'text-sky-300': 1 },
  'src/pages/CategoryPage.jsx': {
    'border-sky-400': 1,
    'ring-sky-400/60': 1,
    'bg-slate-800': 2,
    'bg-[rgba(14,165,233,0.55)]': 1,
    'bg-[rgba(10,49,114,0.95)]': 1,
  },
  'src/pages/ContactPage.jsx': { 'bg-[rgba(14,165,233,0.55)]': 1, 'bg-[rgba(10,49,114,0.95)]': 1 },
  'src/pages/HomePage.jsx': { 'to-[rgb(0,78,87)]': 1 },
  'src/pages/ProductPage.jsx': {
    'bg-slate-800': 1,
    'text-red-300': 1,
    'bg-[rgba(14,165,233,0.55)]': 1,
    'bg-[rgba(10,49,114,0.95)]': 1,
  },
  'src/pages/ReservationPage.jsx': { 'bg-slate-800': 1, 'text-sky-300': 1, 'text-sky-200': 1 },
};

const DIRECT_TAILWIND =
  /\b(?:text|bg|border|ring|from|via|to|divide|placeholder|fill|stroke|decoration|accent|shadow)-(?:slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d+)?(?:\/\d+)?|\b(?:text|bg|border|ring|from|via|to|divide|placeholder|fill|stroke|decoration|accent|shadow)-\[(?:#|rgba?|hsla?|oklch|color)[^\]]+\]/giu;

function exceptionJustification(file, literal) {
  if (file.endsWith('FlagIcons.jsx')) return 'couleur constitutive du drapeau, asset non thémable';
  if (file.endsWith('ReservationPage.jsx'))
    return 'style isolé de Stripe Elements ou palette calculée transmise à son iframe';
  if (/rgba|black|slate-800|slate-900|#333/u.test(literal))
    return 'overlay, ombre ou fallback superposé à un média';
  return 'dette visuelle historique localisée et figée avant migration vers un token';
}

const EXCEPTION_MANIFEST = [
  ...Object.entries(RAW_EXCEPTION_COUNTS).flatMap(([file, entries]) =>
    Object.entries(entries).map(([literal, nombreExact]) => ({
      file,
      literal,
      nombreExact,
      justification: exceptionJustification(file, literal),
      kind: 'literal',
    }))
  ),
  ...Object.entries(TAILWIND_EXCEPTION_COUNTS).flatMap(([file, entries]) =>
    Object.entries(entries).map(([literal, nombreExact]) => ({
      file,
      literal,
      nombreExact,
      justification: exceptionJustification(file, literal),
      kind: 'tailwind',
    }))
  ),
];

function count(values) {
  return values.reduce((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});
}

function expectedFor(file, kind) {
  return Object.fromEntries(
    EXCEPTION_MANIFEST.filter((entry) => entry.file === file && entry.kind === kind).map(
      ({ literal, nombreExact }) => [literal, nombreExact]
    )
  );
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

test('la navigation du header référence les tokens contextuels de contraste', () => {
  const requiredTokens = {
    'src/components/common/Header/Header.jsx': [
      '--sl-on-dark',
      '--sl-header-panel-scrolled-separator',
      '--sl-glass',
    ],
    'src/components/common/Header/DashboardHeader.jsx': [
      '--sl-on-dark',
      '--sl-header-panel-scrolled-separator',
      '--sl-header-badge-text',
    ],
    'src/components/common/Header/shared/BurgerIcon.jsx': ['bg-on-dark'],
    'src/components/common/Header/shared/HeaderShell.jsx': [
      '--sl-brand-navy',
      '--sl-glass',
      '--sl-brand',
    ],
    'src/components/common/Header/shared/PanelLink.jsx': [
      '--sl-header-panel-scrolled-text',
      '--sl-header-panel-scrolled-hover',
      '--sl-header-panel-danger',
    ],
    'src/components/common/Header/shared/SidePanel.jsx': [
      '--sl-surface',
      '--sl-overlay',
      '--sl-glass',
    ],
    'src/components/common/Header/shared/hoverUnderline.js': ['--sl-on-dark'],
  };

  for (const [relative, tokens] of Object.entries(requiredTokens)) {
    const source = readFileSync(path.join(root, relative), 'utf8');
    for (const token of tokens) {
      assert.ok(source.includes(token), `${relative}: token de header absent: ${token}`);
    }
  }
});

test('aucune nouvelle couleur brute ne contourne les tokens dans les fichiers migrés', () => {
  for (const relative of migratedRoots.flatMap(filesBelow)) {
    const portableRelative = relative.replaceAll('\\', '/');
    const originalSource = readFileSync(path.join(root, relative), 'utf8').toLowerCase();
    const source = originalSource.replaceAll(/\s/g, '');
    const colors = (
      source.match(/#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|oklch|color)\([^)]*\)/gu) || []
    ).filter((color) => !color.includes('var('));
    assert.deepEqual(
      count(colors),
      expectedFor(portableRelative, 'literal'),
      `${portableRelative}: inventaire de couleurs brutes modifié`
    );

    const tailwind = originalSource.match(DIRECT_TAILWIND) || [];
    assert.deepEqual(
      count(tailwind),
      expectedFor(portableRelative, 'tailwind'),
      `${portableRelative}: inventaire de classes Tailwind directes modifié`
    );
  }
});

test('chaque exception est précise, justifiée et correspond à un fichier analysé', () => {
  const files = new Set(
    migratedRoots.flatMap(filesBelow).map((file) => file.replaceAll('\\', '/'))
  );
  const keys = new Set();
  for (const exception of EXCEPTION_MANIFEST) {
    assert.ok(files.has(exception.file), `fichier d'exception absent: ${exception.file}`);
    assert.ok(exception.nombreExact > 0, `compte invalide: ${exception.file} ${exception.literal}`);
    assert.ok(
      exception.justification.length >= 20,
      `justification insuffisante: ${exception.file}`
    );
    const key = `${exception.kind}:${exception.file}:${exception.literal}`;
    assert.ok(!keys.has(key), `exception dupliquée: ${key}`);
    keys.add(key);
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
