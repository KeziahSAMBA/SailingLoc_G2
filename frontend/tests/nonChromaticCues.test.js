import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const source = (relative) => readFileSync(path.join(root, relative), 'utf8');

test('les commandes de carrousel et les cartes sont utilisables au clavier', () => {
  const carrousel = source('src/components/common/Carrousel.jsx');

  assert.match(carrousel, /<motion\.button/);
  assert.match(carrousel, /aria-current=\{activeIndex === i \? 'true' : undefined\}/);
  assert.match(carrousel, /role=\{onSlideClick \? 'link' : undefined\}/);
  assert.match(carrousel, /onKeyDown=\{\(event\) => activateSlideWithKeyboard/);
  assert.match(carrousel, /focus-visible:ring-2 focus-visible:ring-brand/);
});

test('les choix actifs possèdent un repère indépendant de la couleur', () => {
  const files = [
    'src/components/common/ClientReviews.jsx',
    'src/components/auth/LoginForm.jsx',
    'src/components/auth/RegisterForm.jsx',
    'src/components/common/Pagination.jsx',
    'src/components/messages/Messenger.jsx',
    'src/components/locataire/LocataireReservations.jsx',
    'src/components/proprietaire/ProprietaireReservations.jsx',
  ];

  for (const file of files) {
    const content = source(file);
    assert.match(content, /non-color-active/, `${file} doit exposer un repère d'état`);
  }

  const css = source('src/index.css');
  assert.match(css, /\.non-color-active\s*\{[\s\S]*box-shadow:\s*inset/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
});

test('les erreurs et le calendrier exposent leurs relations accessibles', () => {
  const reset = source('src/pages/ResetPasswordPage.jsx');
  const account = source('src/components/account/AccountForm.jsx');
  const documents = source('src/components/documents/DocumentsManager.jsx');
  const admin = source('src/components/admin/AdminDashboard.jsx');
  const calendar = source('src/components/common/DateRangePicker.jsx');

  assert.match(reset, /id="reset-confirm-error"/);
  assert.match(reset, /ariaDescribedBy=\{errors\.confirmPassword \? 'reset-confirm-error'/);
  assert.match(account, /aria-describedby=\{errors\.first_name \? 'account-first-name-error'/);
  assert.match(account, /id="account-confirm-password-error"/);
  assert.match(documents, /<p role="alert"/);
  assert.match(admin, /<div\s+role="alert"/);
  assert.match(calendar, /aria-label=\{t\('searchBar\.previousMonth'\)\}/);
  assert.match(calendar, /aria-label=\{t\('searchBar\.nextMonth'\)\}/);
  assert.match(
    source('src/index.css'),
    /calendar-day\.calendar-day--range[\s\S]*border-style: dotted/
  );
});

test('les filtres et le graphe administrateur sont décrits sans modifier leur flux', () => {
  const filterBar = source('src/components/common/FilterBar.jsx');
  const reviews = source('src/components/common/ClientReviews.jsx');
  const dashboard = source('src/components/admin/AdminDashboard.jsx');

  assert.match(filterBar, /role="button"/);
  assert.match(filterBar, /onKeyDown=\{handleHeaderKeyDown\}/);
  assert.match(filterBar, /aria-controls="category-filter-panel"/);
  assert.match(reviews, /aria-pressed=\{roleFilter === opt\.value\}/);
  assert.match(dashboard, /role="img"/);
  assert.match(dashboard, /aria-describedby="admin-bookings-status-chart-description"/);
  assert.match(dashboard, /id="admin-bookings-status-chart-description"/);
});
