import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashString, hashFile } from './hash.mjs';

describe('hashString', () => {
  it('é estável e prefixado', () => {
    expect(hashString('abc')).toBe(
      'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });
});

describe('hashFile', () => {
  it('normaliza CRLF para LF antes de hashear', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kz-'));
    const lf = join(dir, 'lf.txt');
    const crlf = join(dir, 'crlf.txt');
    writeFileSync(lf, 'a\nb\n');
    writeFileSync(crlf, 'a\r\nb\r\n');
    expect(hashFile(crlf)).toBe(hashFile(lf));
    rmSync(dir, { recursive: true, force: true });
  });

  it('lança ENOENT para arquivo ausente', () => {
    expect(() => hashFile('/nao/existe.txt')).toThrowError(/ENOENT/);
  });
});
