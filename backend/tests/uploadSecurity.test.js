import fs from 'fs';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';
import {
  extensionForMime,
  fileMatchesMime,
  resolvePathInside,
  validateUploadedFileContents,
} from '../src/utils/uploadSecurity.js';

describe('sécurité des téléversements', () => {
  test.each([
    ['application/pdf', '.pdf'],
    ['image/jpeg', '.jpg'],
    ['image/png', '.png'],
    ['image/webp', '.webp'],
    ['text/html', null],
  ])('impose une extension serveur pour %s', (mime, extension) => {
    expect(extensionForMime(mime)).toBe(extension);
  });

  test.each([
    [Buffer.from('%PDF-1.7'), 'application/pdf'],
    [Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'],
    [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
    [Buffer.from('RIFF1234WEBP'), 'image/webp'],
  ])('accepte une signature réelle correspondant à %s', (content, mime) => {
    expect(fileMatchesMime(content, mime)).toBe(true);
  });

  test('rejette un contenu HTML annoncé comme une image', () => {
    expect(fileMatchesMime(Buffer.from('<script>alert(1)</script>'), 'image/jpeg')).toBe(false);
  });

  test('supprime du disque un fichier dont la signature est falsifiée', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-security-'));
    const filePath = path.join(directory, 'fake.jpg');
    fs.writeFileSync(filePath, '<html>attaque</html>');
    const req = { file: { path: filePath, mimetype: 'image/jpeg' } };
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const next = jest.fn();

    await validateUploadedFileContents(req, { status, json }, next);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'Le contenu du fichier ne correspond pas au format annoncé.',
    });
    expect(next).not.toHaveBeenCalled();
    expect(fs.existsSync(filePath)).toBe(false);
    fs.rmSync(directory, { recursive: true, force: true });
  });
});

describe('protection contre la traversée de chemins', () => {
  test('accepte un document situé dans le dossier privé', () => {
    const resolved = resolvePathInside('storage/documents', 'storage/documents/example.pdf');
    expect(resolved).toBe(path.resolve('storage/documents/example.pdf'));
  });

  test.each([
    'storage/documents/../../.env',
    '../package.json',
    path.resolve('storage/outside.pdf'),
  ])('rejette un chemin sortant du dossier privé : %s', (unsafePath) => {
    expect(resolvePathInside('storage/documents', unsafePath)).toBeNull();
  });
});
