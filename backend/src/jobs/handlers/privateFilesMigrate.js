import {
  PRIVATE_FILE_MIGRATION_BATCH,
  countPrivateFilesToMigrate,
  migratePrivateFiles,
  scanPrivateFiles,
} from '../../services/privateFileMigrationService.js';

// Deliberately disabled and simulated by default. The first production run
// must be an explicit operator decision after a backup and a dry-run review.
export default {
  key: 'files.migrate',
  category: 'files',
  defaultSchedule: '0 3 * * 0',
  defaultEnabled: false,
  defaultDryRun: true,
  defaultParams: { limit: PRIVATE_FILE_MIGRATION_BATCH },
  maxBatch: PRIVATE_FILE_MIGRATION_BATCH,
  count: () => countPrivateFilesToMigrate(),
  targets: async ({ params }) =>
    (await scanPrivateFiles({ limit: params?.limit })).map(
      (item) => `${item.kind}:${item.row[item.kind === 'document' ? 'id_document' : 'id_image']}`
    ),
  run: ({ params }) => migratePrivateFiles({ dryRun: false, limit: params?.limit }),
};
