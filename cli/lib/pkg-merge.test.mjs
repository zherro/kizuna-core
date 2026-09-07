import { describe, it, expect } from 'vitest';
import { mergePackageJson } from './pkg-merge.mjs';

const empty = { dependencies: {}, devDependencies: {}, scripts: {} };

it('adiciona dep ausente e registra ownership', () => {
  const { result, ownedKeys } = mergePackageJson(
    { dependencies: { react: '19.2.4' } },
    { dependencies: { sonner: '^2.0.7' } },
    empty
  );
  expect(result.dependencies).toEqual({ react: '19.2.4', sonner: '^2.0.7' });
  expect(ownedKeys.dependencies).toEqual({ sonner: '^2.0.7' });
});

it('atualiza dep que o core controlava', () => {
  const { result } = mergePackageJson(
    { dependencies: { next: '16.2.5' } },
    { dependencies: { next: '16.2.6' } },
    { ...empty, dependencies: { next: '16.2.5' } }
  );
  expect(result.dependencies.next).toBe('16.2.6');
});

it('mantém dep que o usuário mexeu e registra conflito', () => {
  const { result, conflicts } = mergePackageJson(
    { dependencies: { next: '17.0.0-canary' } },
    { dependencies: { next: '16.2.6' } },
    { ...empty, dependencies: { next: '16.2.5' } }
  );
  expect(result.dependencies.next).toBe('17.0.0-canary');
  expect(conflicts).toEqual([
    { section: 'dependencies', key: 'next', ours: '17.0.0-canary', theirs: '16.2.6' },
  ]);
});

it('nunca remove dep do usuário', () => {
  const { result } = mergePackageJson(
    { dependencies: { lodash: '^4' } },
    { dependencies: {} },
    empty
  );
  expect(result.dependencies.lodash).toBe('^4');
});

it('scripts: adiciona por nome', () => {
  const { result, ownedKeys } = mergePackageJson(
    { scripts: { dev: 'next dev' } },
    { scripts: { kizuna: 'node kizuna-core/cli', predev: 'node kizuna-core/cli check' } },
    empty
  );
  expect(result.scripts).toEqual({
    dev: 'next dev',
    kizuna: 'node kizuna-core/cli',
    predev: 'node kizuna-core/cli check',
  });
  expect(ownedKeys.scripts).toEqual({
    kizuna: 'node kizuna-core/cli',
    predev: 'node kizuna-core/cli check',
  });
});
