import { it, expect } from 'vitest';
import { renderDivergence } from './banner.mjs';

it('sem divergência retorna vazio', () => {
  const lock = { kizunaCore: { version: '0.5.0', sha: 'abc' }, template: { version: '0.5.0' }, plugins: {} };
  expect(renderDivergence({
    lock, liveVersion: '0.5.0', liveSha: 'abc', liveTemplateVersion: '0.5.0',
    pluginDeltas: [], logText: '',
  })).toBe('');
});

it('bump de versão aparece no banner', () => {
  const lock = { kizunaCore: { version: '0.4.0', sha: 'abc' }, template: { version: '0.4.0' }, plugins: {} };
  const out = renderDivergence({
    lock, liveVersion: '0.6.0', liveSha: 'def', liveTemplateVersion: '0.5.0',
    pluginDeltas: [{ name: 'messaging', from: 4, to: 6 }], logText: '- feat(chat): rotas',
  });
  expect(out).toContain('0.4.0');
  expect(out).toContain('0.6.0');
  expect(out).toContain('messaging 4 → 6');
  expect(out).toContain('feat(chat): rotas');
  expect(out).toContain('kizuna -- update');
});
