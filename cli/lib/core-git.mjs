// Consultas git ao clone do kizuna-core, todas via execFileSync('git', ...).

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function git(coreDir, args) {
  return execFileSync('git', ['-C', coreDir, ...args], { encoding: 'utf8' }).trim();
}

export function head(coreDir) {
  return git(coreDir, ['rev-parse', 'HEAD']);
}

export function currentBranch(coreDir) {
  return git(coreDir, ['rev-parse', '--abbrev-ref', 'HEAD']);
}

export function isDetached(coreDir) {
  return currentBranch(coreDir) === 'HEAD';
}

export function pull(coreDir) {
  git(coreDir, ['pull', '--ff-only']);
}

// git log --oneline <fromSha>..HEAD ; '' se fromSha for inválido.
export function logRange(coreDir, fromSha) {
  try {
    return git(coreDir, ['log', '--oneline', `${fromSha}..HEAD`]);
  } catch {
    return '';
  }
}

// Lê <core>/VERSION (trim). '0.0.0' se ausente.
export function readVersion(coreDir) {
  try {
    return readFileSync(join(coreDir, 'VERSION'), 'utf8').trim();
  } catch {
    return '0.0.0';
  }
}
