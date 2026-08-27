#!/usr/bin/env node
import prisma from '../src/config/db.js';
import {
  migratePrivateFiles,
  PRIVATE_FILE_MIGRATION_BATCH,
} from '../src/services/privateFileMigrationService.js';

function usage() {
  console.log(
    [
      'Usage: npm run files:migrate -- [--dry-run] [--apply] [--limit N] [--confirm-production]',
      '',
      'The default is a read-only dry-run. --apply encrypts/moves only files',
      'referenced by Document or dispute Image rows and updates those rows.',
      'Staging/production apply requires the explicit --confirm-production switch.',
    ].join('\n')
  );
}

function parseArgs(argv) {
  let dryRun = true;
  let limit = PRIVATE_FILE_MIGRATION_BATCH;
  let confirmProduction = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      usage();
      return null;
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--apply') {
      dryRun = false;
      continue;
    }
    if (arg === '--confirm-production') {
      confirmProduction = true;
      continue;
    }
    if (arg === '--limit') {
      const next = argv[index + 1];
      index += 1;
      const parsed = Number(next);
      if (!Number.isSafeInteger(parsed) || parsed < 1) {
        throw new Error('--limit doit être un entier positif.');
      }
      limit = Math.min(parsed, PRIVATE_FILE_MIGRATION_BATCH);
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.slice('--limit='.length));
      if (!Number.isSafeInteger(parsed) || parsed < 1) {
        throw new Error('--limit doit être un entier positif.');
      }
      limit = Math.min(parsed, PRIVATE_FILE_MIGRATION_BATCH);
      continue;
    }
    throw new Error(`Option inconnue : ${arg}`);
  }

  return { dryRun, limit, confirmProduction };
}

const environment = String(
  process.env.NODE_ENV ||
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_ENVIRONMENT ||
    ''
)
  .trim()
  .toLowerCase();

let options;
try {
  options = parseArgs(process.argv.slice(2));
  if (!options) process.exitCode = 0;
  else if (
    !options.dryRun &&
    ['production', 'staging'].includes(environment) &&
    !options.confirmProduction
  ) {
    throw new Error(
      'Migration staging/production bloquée : exécutez d’abord un dry-run puis ajoutez --confirm-production après sauvegarde vérifiée.'
    );
  }
} catch (error) {
  console.error(`[files:migrate] ${error.message}`);
  // Do not fall through to the migration after an argument or environment
  // guard failure. In particular, a production apply without confirmation
  // must never reach Prisma or touch the filesystem.
  options = null;
  process.exitCode = 2;
}

if (options) {
  try {
    const outcome = await migratePrivateFiles({
      dryRun: options.dryRun,
      limit: options.limit,
      // The callback contains only technical type/id/outcome fields; it never
      // prints paths, original names, emails, or exception text.
      logger: (event) => console.log(JSON.stringify(event)),
    });
    console.log(JSON.stringify({ migration: 'private-files-aes-gcm-v1', ...outcome }));
    if (outcome.detail.failed > 0) process.exitCode = 1;
  } catch (error) {
    console.error('[files:migrate] Échec de la migration. Consultez les journaux internes.');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
