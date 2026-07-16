import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Chiffrement au repos des documents sensibles (justificatifs, actes de
// francisation) en AES-256-GCM — chiffrement authentifié : un fichier altéré
// ou chiffré avec une autre clé est rejeté au déchiffrement.
//
// Format sur disque : MAGIC(6) | IV(12) | TAG(16) | contenu chiffré.
// Les fichiers déposés avant l'activation du chiffrement n'ont pas l'en-tête
// magique : ils sont servis tels quels (rétrocompatibilité, aucune migration
// obligatoire).
//
// La clé vient de FILE_ENCRYPTION_KEY (64 caractères hexadécimaux = 32 octets,
// générés avec `openssl rand -hex 32`). Une clé différente par environnement ;
// si elle est perdue, les fichiers chiffrés sont définitivement illisibles.

const MAGIC = Buffer.from('SLENC1');
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

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
    stored.length > MAGIC.length + IV_LENGTH + TAG_LENGTH &&
    stored.subarray(0, MAGIC.length).equals(MAGIC)
  );
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
// l'en-tête magique, tel quel sinon (fichier antérieur au chiffrement).
export async function readDecrypted(filePath) {
  const stored = await fs.promises.readFile(filePath);
  return isEncrypted(stored) ? decryptBuffer(stored) : stored;
}
