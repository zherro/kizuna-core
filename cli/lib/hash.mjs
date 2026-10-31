import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export function hashString(text) {
  return 'sha256:' + createHash('sha256').update(text, 'utf8').digest('hex');
}

export function hashFile(absPath) {
  const raw = readFileSync(absPath, 'utf8'); // lança {code:'ENOENT'} se ausente
  return hashString(raw.replace(/\r\n/g, '\n'));
}
