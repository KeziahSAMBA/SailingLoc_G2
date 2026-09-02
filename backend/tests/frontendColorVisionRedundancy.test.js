import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CSS = readFileSync(resolve(ROOT, 'frontend/src/index.css'), 'utf8');

const STATUS_COMPONENTS = [
  'frontend/src/context/ToastContext.jsx',
  'frontend/src/components/documents/DocumentsManager.jsx',
  'frontend/src/components/locataire/LocataireDashboard.jsx',
  'frontend/src/components/locataire/LocataireReservations.jsx',
  'frontend/src/components/locataire/LocataireDepenses.jsx',
  'frontend/src/components/proprietaire/ProprietaireDashboard.jsx',
  'frontend/src/components/proprietaire/ProprietaireReservations.jsx',
  'frontend/src/components/proprietaire/ProprietaireBoats.jsx',
  'frontend/src/components/proprietaire/ProprietaireReviews.jsx',
  'frontend/src/components/proprietaire/ProprietaireRevenus.jsx',
  'frontend/src/components/admin/AdminBookingsPage.jsx',
  'frontend/src/components/admin/AdminCommentsPage.jsx',
  'frontend/src/components/admin/AdminContactPage.jsx',
  'frontend/src/components/admin/AdminCronJobsPage.jsx',
  'frontend/src/components/admin/AdminCronRunsPage.jsx',
  'frontend/src/components/admin/AdminDocumentsPage.jsx',
  'frontend/src/components/admin/AdminLogsPage.jsx',
  'frontend/src/components/admin/AdminPublicationPage.jsx',
  'frontend/src/components/admin/AdminTransactionsPage.jsx',
  'frontend/src/components/admin/AdminUsersPage.jsx',
  'frontend/src/pages/HomePageProprio.jsx',
];

describe('redondance non colorimétrique des états', () => {
  it('déclare des contours distincts pour chaque catégorie d’état', () => {
    expect(CSS).toMatch(
      /\.status-indicator\.status-indicator--success\s*\{[\s\S]*?border-style:\s*solid;[\s\S]*?border-width:\s*2px;/u
    );
    expect(CSS).toMatch(
      /\.status-indicator\.status-indicator--warning\s*\{[\s\S]*?border-style:\s*dashed;[\s\S]*?border-width:\s*2px;/u
    );
    expect(CSS).toMatch(
      /\.status-indicator\.status-indicator--danger\s*\{[\s\S]*?border-style:\s*double;[\s\S]*?border-width:\s*3px;/u
    );
    expect(CSS).toMatch(
      /\.status-indicator\.status-indicator--info\s*\{[\s\S]*?border-style:\s*dotted;[\s\S]*?border-width:\s*2px;/u
    );
    expect(CSS).toMatch(
      /\.status-indicator\.status-indicator--neutral\s*\{[\s\S]*?border-style:\s*solid;[\s\S]*?border-width:\s*1px;/u
    );
  });

  it('conserve un indicateur explicite dans chaque parcours métier', () => {
    for (const relativePath of STATUS_COMPONENTS) {
      const source = readFileSync(resolve(ROOT, relativePath), 'utf8');
      expect(source).toContain('status-indicator');
    }
  });

  it('conserve les icônes déjà présentes dans les toasts et paiements', () => {
    const toast = readFileSync(resolve(ROOT, 'frontend/src/context/ToastContext.jsx'), 'utf8');
    const expenses = readFileSync(
      resolve(ROOT, 'frontend/src/components/locataire/LocataireDepenses.jsx'),
      'utf8'
    );
    expect(toast).toContain('status-indicator--has-icon');
    expect(toast).toContain('ICONS[toast.type]');
    expect(expenses).toContain('status-indicator--has-icon');
    expect(expenses).toContain('STATUS_ICON');
  });
});
