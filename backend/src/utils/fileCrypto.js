import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Chiffrement au repos des documents sensibles (justificatifs, actes de
// francisation) en AES-256-GCM — chiffrement authentifié : un fichier altéré
// ou chiffré avec une autre clé est rejeté au déchiffrement.
//
// Format sur disque : MAGIC(6) | IV(12) | TAG(16) | contenu chiffré.
// Les fichiers déposés avant l'activation du chiffrement n'ont pas l'en-tête
// magique. Ils restent lisibles en développement le temps de la migration,
// mais un déploiement staging/production refuse par défaut de les servir.
//
// La clé vient de FILE_ENCRYPTION_KEY (64 caractères hexadécimaux = 32 octets,
// générés avec `openssl rand -hex 32`). Une clé différente par environnement ;
// si elle est perdue, les fichiers chiffrés sont définitivement illisibles.

const MAGIC = Buffer.from('SLENC1');
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_LENGTH = MAGIC.length + IV_LENGTH + TAG_LENGTH;

function getKey() {
  const hex = process.env.FILE_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw Object.assign(
      new Error(
        'FILE_ENCRYPTION_KEY absente ou invalide (attendu : 64 caractères hexadécimaux — `openssl rand -hex 32`).'
      ),
      { status: 500 }
    );
  }
  return Buffer.from(hex, 'hex');
}

// Chiffre un buffer et renvoie le contenu prêt à écrire sur disque.
export function encryptBuffer(plain) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted]);
}

// Déchiffre un contenu au format SLENC1. Jette si le fichier a été altéré
// (tag GCM invalide) ou chiffré avec une autre clé.
export function decryptBuffer(stored) {
  const iv = stored.subarray(MAGIC.length, MAGIC.length + IV_LENGTH);
  const tag = stored.subarray(MAGIC.length + IV_LENGTH, MAGIC.length + IV_LENGTH + TAG_LENGTH);
  const encrypted = stored.subarray(MAGIC.length + IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function isEncrypted(stored) {
  return (
    Buffer.isBuffer(stored) &&
    stored.length >= HEADER_LENGTH &&
    stored.subarray(0, MAGIC.length).equals(MAGIC)
  );
}

function isProductionLike() {
  return ['production', 'staging'].includes(
    String(process.env.NODE_ENV || '')
      .trim()
      .toLowerCase()
  );
}

// Cleartext compatibility is intentionally opt-in outside development. The
// migration command reads the bytes directly and therefore never needs this
// escape hatch. `ALLOW_LEGACY_CLEAR_FILE_READ=true` is a short-lived rollback
// switch for a controlled maintenance window, not a production default.
export function allowLegacyCleartextRead() {
  const configured = String(process.env.ALLOW_LEGACY_CLEAR_FILE_READ || '')
    .trim()
    .toLowerCase();
  if (configured === 'true') return true;
  if (configured === 'false') return false;
  return !isProductionLike();
}

// Écrit `plain` chiffré à `destPath` (écriture atomique : fichier temporaire
// puis rename, pour ne jamais laisser un fichier partiel).
export async function writeEncrypted(plain, destPath) {
  const tmpPath = `${destPath}.tmp-${crypto.randomBytes(4).toString('hex')}`;
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  await fs.promises.writeFile(tmpPath, encryptBuffer(plain));
  await fs.promises.rename(tmpPath, destPath);
}

// Chiffre en place un fichier déjà écrit en clair par multer (cas de l'acte de
// francisation, uploadé avec les photos du bateau). No-op s'il est déjà chiffré.
export async function encryptFileInPlace(filePath) {
  const content = await fs.promises.readFile(filePath);
  if (isEncrypted(content)) return;
  await writeEncrypted(content, filePath);
}

// Lit un fichier et renvoie son contenu en clair : déchiffré s'il porte
// l'en-tête magique. En production/staging, un fichier sans en-tête est
// refusé par défaut afin qu'une migration incomplète ne réintroduise pas une
// lecture de données sensibles en clair.
export async function readDecrypted(filePath) {
  const stored = await fs.promises.readFile(filePath);
  if (isEncrypted(stored)) return decryptBuffer(stored);
  if (!allowLegacyCleartextRead()) {
    throw Object.assign(new Error('Fichier privé non chiffré.'), {
      status: 503,
      code: 'LEGACY_CLEAR_FILE',
    });
  }
  return stored;
}
