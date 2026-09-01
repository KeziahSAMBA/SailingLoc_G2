import fs from 'fs';
import path from 'path';
import prisma from '../../config/db.js';
import { inspectImagePurgeFile } from '../../utils/fileSecurity.js';

const HOUR_MS = 3600000;
const MAX_BATCH = 5000;

// Jamais « documents » : ces fichiers vivent dans Document.file_url, pas dans
// Image. Les balayer contre les lignes Image les supprimerait tous.
const SWEPT_DIRS = [
  { dir: 'boats', kind: 'boat' },
  { dir: 'disputes', kind: 'dispute' },
  { dir: 'avatars', kind: 'avatar' },
];

const clampHours = (value) => {
  const hours = Number(value);
  return Number.isFinite(hours) && hours >= 1 ? Math.trunc(hours) : 24;
};

const uploadsRoot = () => process.env.UPLOADS_DIR || 'uploads';
const portablePath = (value) => String(value).replace(/\\/g, '/');

// Le seul critère est l'absence de ligne Image : un fichier référencé est
// épargné quel que soit son âge. L'ancienneté ne fait entrer personne, elle
// écarte seulement les envois dont la ligne n'est pas encore commitée.
async function findOrphanTargets(params = {}, now = new Date()) {
  const newestAllowed = now.getTime() - clampHours(params.minAgeHours) * HOUR_MS;
  const rows = await prisma.image.findMany({ select: { url: true } });
  const referenced = new Set(
    rows.map((row) => path.posix.basename(String(row.url || '').replace(/\\/g, '/')))
  );

  const orphans = [];
  for (const { dir, kind } of SWEPT_DIRS) {
    // Cron targets are persisted in logs and displayed by the admin UI. Keep
    // them portable across Windows workers and POSIX containers; Node accepts
    // forward slashes for filesystem operations on both platforms.
    const base = portablePath(path.join(uploadsRoot(), dir));
    let entries;
    try {
      entries = await fs.promises.readdir(base);
    } catch {
      continue;
    }

    for (const name of entries) {
      if (referenced.has(name)) continue;
      try {
        const inspected = await inspectImagePurgeFile(name, kind);
        if (inspected.stat.mtimeMs <= newestAllowed) {
          orphans.push({ displayPath: portablePath(path.join(base, name)), name, kind });
        }
      } catch {
        continue;
      }
    }
  }

  return orphans.sort((a, b) => a.displayPath.localeCompare(b.displayPath));
}

export async function findOrphanFiles(params = {}, now = new Date()) {
  return (await findOrphanTargets(params, now)).map(({ displayPath }) => displayPath);
}

export default {
  key: 'images.purge',
  category: 'images',
  // Hebdomadaire : un balayage disque n'a pas à tourner toutes les nuits.
  defaultSchedule: '0 5 * * 0',
  // Elle supprime sur un critère d'absence : double bascule manuelle.
  defaultEnabled: false,
  defaultDryRun: true,
  defaultParams: { minAgeHours: 24 },
  maxBatch: MAX_BATCH,

  count: async ({ params, now }) => (await findOrphanFiles(params, now)).length,

  // Seule tâche dont la cible est un nom de fichier : c'est ici le seul
  // identifiant possible. Ceux-ci sont générés par multer (horodatage + aléa),
  // ils ne portent aucune donnée personnelle — ce qui ne vaudrait pas pour un
  // document, raison de plus pour exclure ce dossier.
  targets: async ({ params, now, take }) => (await findOrphanFiles(params, now)).slice(0, take),

  async run({ params, now }) {
    const orphans = await findOrphanTargets(params, now);
    let removed = 0;

    for (const file of orphans.slice(0, MAX_BATCH)) {
      try {
        // Revalidate immediately before unlinking so a path swapped for a
        // symlink between discovery and deletion is rejected.
        const inspected = await inspectImagePurgeFile(file.name, file.kind);
        await fs.promises.unlink(inspected.path);
        removed += 1;
      } catch {
        continue;
      }
    }

    return { affected: removed, detail: { files: removed } };
  },
};
