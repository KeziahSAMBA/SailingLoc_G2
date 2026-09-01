import fs from 'fs';
import path from 'path';
import * as fileSecurity from '../utils/fileSecurity.js';

function resolverFor(isPublic) {
  return isPublic ? fileSecurity.resolveStoredPublicFilePath : fileSecurity.resolveStoredFilePath;
}

async function existingResolverFor(isPublic) {
  return isPublic
    ? fileSecurity.resolveExistingPublicFile
    : fileSecurity.resolveExistingPrivateFile;
}

function lexicalIdentity(value, kind, isPublic) {
  try {
    const resolver = resolverFor(isPublic);
    if (typeof resolver !== 'function') return null;
    const resolved = resolver(value, kind);
    // Windows compares paths case-insensitively. Normalising separators also
    // makes references from old POSIX-style URLs comparable on both systems.
    const normalized = path.resolve(resolved).replace(/\\/g, '/');
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
  } catch {
    return null;
  }
}

async function identitiesFor(value, kind, isPublic) {
  const identities = new Set();
  const lexical = lexicalIdentity(value, kind, isPublic);
  if (lexical) identities.add(`path:${lexical}`);
  try {
    const resolveExisting = await existingResolverFor(isPublic);
    if (typeof resolveExisting !== 'function') return identities;
    const real = await resolveExisting(value, kind);
    const normalized = path.resolve(real).replace(/\\/g, '/');
    identities.add(`real:${process.platform === 'win32' ? normalized.toLowerCase() : normalized}`);
  } catch {
    // A missing or malformed reference is not unlinkable; retain the lexical
    // identity only so a duplicate row still protects the surviving file.
  }
  return identities;
}

function referenceId(ref) {
  return ref?.id === undefined || ref?.id === null ? null : String(ref.id);
}

/**
 * Remove files only when every known reference to their physical path belongs
 * to the rows being removed. Callers pass all references for the relevant
 * model, not only the rows selected for deletion. This prevents account purge,
 * document replacement, and boat deletion from deleting a shared object.
 */
export async function removeUnreferencedFiles(
  files,
  { kind, isPublic = false, references = [], removedIds = new Set() } = {}
) {
  if (!Array.isArray(files) || files.length === 0) return 0;

  const referenceIdentityMap = [];
  for (const ref of references) {
    const id = referenceId(ref);
    const value = ref?.value;
    if (!id || !value) continue;
    const identities = await identitiesFor(value, kind, isPublic);
    if (identities.size > 0) referenceIdentityMap.push({ id, identities });
  }

  const removed = new Set([...removedIds].map((id) => String(id)));
  const deletedIdentities = new Set();
  let count = 0;

  for (const file of files) {
    const value = file?.value ?? file;
    if (!value) continue;
    const identities = await identitiesFor(value, kind, isPublic);
    if (identities.size === 0) continue;

    // A reference is shared if it overlaps by either a lexical path or a
    // realpath. The latter catches symlink aliases while the former still
    // protects duplicate rows when the source has already disappeared.
    const shared = referenceIdentityMap.some(
      (ref) =>
        !removed.has(ref.id) && [...identities].some((identity) => ref.identities.has(identity))
    );
    if (shared || [...identities].some((identity) => deletedIdentities.has(identity))) continue;

    try {
      const resolveExisting = await existingResolverFor(isPublic);
      const safePath = await resolveExisting(value, kind, { lexical: true });
      await fs.promises.unlink(safePath);
      count += 1;
      for (const identity of identities) deletedIdentities.add(identity);
    } catch {
      // Best-effort cleanup: malformed paths, races, and absent files must not
      // abort the surrounding database anonymisation/replace transaction.
    }
  }
  return count;
}

export function asFileReference(id, value) {
  return { id: String(id), value };
}
