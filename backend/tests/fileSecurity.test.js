import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  inspectUploadedFile,
  resolveExistingUploadedFile,
  resolveUploadedFilePath,
  resolveStoredFilePath,
  safeDisplayName,
} from '../src/utils/fileSecurity.js';

let tmpDir;
let previousUploadsDir;
let previousDocumentsDir;
let previousDisputesDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filesecurity-'));
  previousUploadsDir = process.env.UPLOADS_DIR;
  previousDocumentsDir = process.env.DOCUMENTS_DIR;
  previousDisputesDir = process.env.DISPUTES_DIR;
  process.env.UPLOADS_DIR = path.join(tmpDir, 'uploads');
  process.env.DOCUMENTS_DIR = path.join(tmpDir, 'documents');
  process.env.DISPUTES_DIR = path.join(tmpDir, 'disputes');
  fs.mkdirSync(path.join(process.env.UPLOADS_DIR, 'boats'), { recursive: true });
  fs.mkdirSync(path.join(process.env.UPLOADS_DIR, 'avatars'), { recursive: true });
  fs.mkdirSync(process.env.DOCUMENTS_DIR, { recursive: true });
  fs.mkdirSync(process.env.DISPUTES_DIR, { recursive: true });
});

afterAll(() => {
  if (previousUploadsDir === undefined) delete process.env.UPLOADS_DIR;
  else process.env.UPLOADS_DIR = previousUploadsDir;
  if (previousDocumentsDir === undefined) delete process.env.DOCUMENTS_DIR;
  else process.env.DOCUMENTS_DIR = previousDocumentsDir;
  if (previousDisputesDir === undefined) delete process.env.DISPUTES_DIR;
  else process.env.DISPUTES_DIR = previousDisputesDir;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('fileSecurity', () => {
  it('normalise les séparateurs de chemin Windows et POSIX pour les noms affichés', () => {
    expect(safeDisplayName('../evil.pdf', 'application/pdf')).toBe('evil.pdf');
    expect(safeDisplayName('..\\evil.pdf', 'application/pdf')).toBe('evil.pdf');
    expect(safeDisplayName('/documents/contrat final.pdf', 'application/pdf')).toBe(
      'contrat final.pdf'
    );
    expect(safeDisplayName('C:\\documents\\contrat final.pdf', 'application/pdf')).toBe(
      'contrat final.pdf'
    );
  });

  it('vérifie les octets et neutralise le nom original', async () => {
    const filePath = path.join(process.env.DOCUMENTS_DIR, 'upload.pdf');
    fs.writeFileSync(filePath, Buffer.from('%PDF-1.7\n'));
    const metadata = await inspectUploadedFile(
      {
        path: filePath,
        filename: 'upload.pdf',
        size: fs.statSync(filePath).size,
        originalname: '../justificatif.pdf',
        mimetype: 'application/pdf',
      },
      'document'
    );

    expect(metadata.mimeType).toBe('application/pdf');
    expect(metadata.safeName).toBe('justificatif.pdf');
    expect(safeDisplayName('..\\evil\r\n.pdf', 'application/pdf')).toBe('evil.pdf');
  });

  it('refuse un contenu dont la signature ne correspond pas au MIME', async () => {
    const filePath = path.join(process.env.DOCUMENTS_DIR, 'not-a-pdf.pdf');
    fs.writeFileSync(filePath, Buffer.from('not a PDF'));
    await expect(
      inspectUploadedFile(
        {
          path: filePath,
          filename: 'not-a-pdf.pdf',
          size: fs.statSync(filePath).size,
          originalname: 'document.pdf',
          mimetype: 'application/pdf',
        },
        'document'
      )
    ).rejects.toMatchObject({ code: 'INVALID_FILE', status: 400 });
  });

  it('confine les chemins aux répertoires privés configurés', () => {
    const stored = path.join(tmpDir, 'documents', 'safe.pdf');
    expect(resolveStoredFilePath(stored, 'document')).toBe(path.resolve(stored));
    expect(() => resolveStoredFilePath(path.join(tmpDir, 'secret.pdf'), 'document')).toThrow();
    expect(() => resolveStoredFilePath('../secret.pdf', 'document')).toThrow();
  });

  it('reconstruit les chemins d’upload dans les quatre répertoires autorisés', () => {
    const cases = [
      ['boat', path.join(process.env.UPLOADS_DIR, 'boats'), 'photo.jpg'],
      ['avatar', path.join(process.env.UPLOADS_DIR, 'avatars'), 'profil.png'],
      ['document', process.env.DOCUMENTS_DIR, 'permis.pdf'],
      ['dispute', process.env.DISPUTES_DIR, 'preuve.webp'],
    ];

    for (const [kind, root, filename] of cases) {
      const file = { filename, path: path.join(root, filename) };
      expect(resolveUploadedFilePath(file, kind)).toBe(path.resolve(root, filename));
    }
  });

  it('refuse les chemins extérieurs, absolus, traversants et extensions inattendues', () => {
    expect(() => resolveUploadedFilePath('../evil.jpg', 'boat')).toThrow();
    expect(() => resolveUploadedFilePath(path.join(tmpDir, 'evil.jpg'), 'boat')).toThrow();
    expect(() =>
      resolveUploadedFilePath(
        { filename: '../evil.jpg', path: path.join(process.env.UPLOADS_DIR, 'boats', 'evil.jpg') },
        'boat'
      )
    ).toThrow();
    expect(() =>
      resolveUploadedFilePath(
        { filename: 'evil.svg', path: path.join(process.env.UPLOADS_DIR, 'boats', 'evil.svg') },
        'boat'
      )
    ).toThrow();
  });

  it('refuse un lien symbolique avant lecture ou suppression', async () => {
    const target = path.join(process.env.UPLOADS_DIR, 'boats', 'real.jpg');
    const link = path.join(process.env.UPLOADS_DIR, 'boats', 'link.jpg');
    fs.writeFileSync(target, Buffer.from([0xff, 0xd8, 0xff]));
    try {
      fs.symlinkSync(target, link);
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOSYS'].includes(error?.code)) return;
      throw error;
    }

    await expect(
      resolveExistingUploadedFile({ filename: 'link.jpg', path: link }, 'boat')
    ).rejects.toThrow(/symbolique/i);
  });
});
