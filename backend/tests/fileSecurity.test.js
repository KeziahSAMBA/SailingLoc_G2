import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  inspectUploadedFile,
  resolveStoredFilePath,
  safeDisplayName,
} from '../src/utils/fileSecurity.js';

let tmpDir;
let previousDocumentsDir;
let previousDisputesDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filesecurity-'));
  previousDocumentsDir = process.env.DOCUMENTS_DIR;
  previousDisputesDir = process.env.DISPUTES_DIR;
  process.env.DOCUMENTS_DIR = path.join(tmpDir, 'documents');
  process.env.DISPUTES_DIR = path.join(tmpDir, 'disputes');
  fs.mkdirSync(process.env.DOCUMENTS_DIR, { recursive: true });
  fs.mkdirSync(process.env.DISPUTES_DIR, { recursive: true });
});

afterAll(() => {
  if (previousDocumentsDir === undefined) delete process.env.DOCUMENTS_DIR;
  else process.env.DOCUMENTS_DIR = previousDocumentsDir;
  if (previousDisputesDir === undefined) delete process.env.DISPUTES_DIR;
  else process.env.DISPUTES_DIR = previousDisputesDir;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('fileSecurity', () => {
  it('vérifie les octets et neutralise le nom original', async () => {
    const filePath = path.join(tmpDir, 'upload.bin');
    fs.writeFileSync(filePath, Buffer.from('%PDF-1.7\n'));
    const metadata = await inspectUploadedFile(
      {
        path: filePath,
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
    const filePath = path.join(tmpDir, 'not-a-pdf');
    fs.writeFileSync(filePath, Buffer.from('not a PDF'));
    await expect(
      inspectUploadedFile(
        {
          path: filePath,
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
});
