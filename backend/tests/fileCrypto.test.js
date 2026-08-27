import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  encryptBuffer,
  decryptBuffer,
  isEncrypted,
  writeEncrypted,
  encryptFileInPlace,
  readDecrypted,
} from '../src/utils/fileCrypto.js';

// Clé de test (64 hex = 32 octets) — indépendante des .env.
const TEST_KEY = 'a'.repeat(64);

let tmpDir;

beforeAll(() => {
  process.env.FILE_ENCRYPTION_KEY = TEST_KEY;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filecrypto-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('fileCrypto', () => {
  const plain = Buffer.from('contenu confidentiel : permis bateau %PDF-1.4');

  it('chiffre puis déchiffre à l’identique (round-trip)', () => {
    const stored = encryptBuffer(plain);
    expect(isEncrypted(stored)).toBe(true);
    // Le contenu en clair n'apparaît pas dans le fichier chiffré.
    expect(stored.includes('permis bateau')).toBe(false);
    expect(decryptBuffer(stored).equals(plain)).toBe(true);
  });

  it('rejette un fichier altéré (tag GCM invalide)', () => {
    const stored = encryptBuffer(plain);
    stored[stored.length - 1] ^= 0xff; // corrompt le dernier octet du contenu
    expect(() => decryptBuffer(stored)).toThrow();
  });

  it('rejette le déchiffrement avec une autre clé', () => {
    const stored = encryptBuffer(plain);
    process.env.FILE_ENCRYPTION_KEY = 'b'.repeat(64);
    expect(() => decryptBuffer(stored)).toThrow();
    process.env.FILE_ENCRYPTION_KEY = TEST_KEY;
  });

  it('écrit chiffré sur disque et relit en clair', async () => {
    const dest = path.join(tmpDir, 'doc.pdf');
    await writeEncrypted(plain, dest);
    // Sur disque : chiffré.
    expect(isEncrypted(fs.readFileSync(dest))).toBe(true);
    // À la lecture : déchiffré.
    expect((await readDecrypted(dest)).equals(plain)).toBe(true);
  });

  it('sert tels quels les fichiers antérieurs au chiffrement (rétrocompatibilité)', async () => {
    const legacy = path.join(tmpDir, 'legacy.pdf');
    fs.writeFileSync(legacy, plain);
    expect((await readDecrypted(legacy)).equals(plain)).toBe(true);
  });

  it.each(['staging', 'production'])(
    'refuse toujours le cleartext en %s, même avec le secours explicitement activé',
    async (environment) => {
      const legacy = path.join(tmpDir, `legacy-${environment}.pdf`);
      fs.writeFileSync(legacy, plain);
      const previousEnvironment = process.env.NODE_ENV;
      const previousSwitch = process.env.ALLOW_LEGACY_CLEAR_FILE_READ;
      process.env.NODE_ENV = environment;
      process.env.ALLOW_LEGACY_CLEAR_FILE_READ = 'true';
      try {
        await expect(readDecrypted(legacy)).rejects.toMatchObject({
          code: 'LEGACY_CLEAR_FILE',
          status: 503,
        });
      } finally {
        process.env.NODE_ENV = previousEnvironment;
        if (previousSwitch === undefined) delete process.env.ALLOW_LEGACY_CLEAR_FILE_READ;
        else process.env.ALLOW_LEGACY_CLEAR_FILE_READ = previousSwitch;
      }
    }
  );

  it('encryptFileInPlace chiffre un fichier en clair et est idempotent', async () => {
    const file = path.join(tmpDir, 'acte.pdf');
    fs.writeFileSync(file, plain);
    await encryptFileInPlace(file);
    const once = fs.readFileSync(file);
    expect(isEncrypted(once)).toBe(true);
    // Second appel : no-op (pas de double chiffrement).
    await encryptFileInPlace(file);
    expect(fs.readFileSync(file).equals(once)).toBe(true);
    expect((await readDecrypted(file)).equals(plain)).toBe(true);
  });

  it('erreur claire si la clé est absente ou invalide', () => {
    delete process.env.FILE_ENCRYPTION_KEY;
    expect(() => encryptBuffer(plain)).toThrow(/FILE_ENCRYPTION_KEY/);
    process.env.FILE_ENCRYPTION_KEY = 'trop-courte';
    expect(() => encryptBuffer(plain)).toThrow(/FILE_ENCRYPTION_KEY/);
    process.env.FILE_ENCRYPTION_KEY = TEST_KEY;
  });
});
