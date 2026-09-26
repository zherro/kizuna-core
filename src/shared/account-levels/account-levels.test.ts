import { describe, expect, it } from 'vitest';
import {
  canDo,
  computeAccountStatus,
  defineCapabilities,
  parseAccountLevelsConfig,
  type AccountFacts,
} from './index';

const config = parseAccountLevelsConfig({
  levels: [
    { key: 'conta', level: 1, title: 'Conta', requirement: 'authenticated' },
    { key: 'contato', level: 2, title: 'Contato', requirement: 'contact_verified' },
    { key: 'perfil', level: 3, title: 'Perfil', requirement: 'profile_complete' },
    {
      key: 'identidade',
      level: 4,
      title: 'Identidade',
      requirement: 'identity_verified',
      enabled: false,
    },
  ],
});

const caps = defineCapabilities(config, {
  like: 'conta',
  review: 'contato',
  'service.create': 'perfil',
  sell: 'identidade',
});

const fullProfile = {
  fullName: 'Maria Souza',
  avatarUrl: '/a.png',
  documentType: 'cpf',
  documentNumber: '529.982.247-25',
  state: 'MT',
  city: 'Cuiaba',
  zipCode: '78000-000',
};

function facts(patch: Partial<AccountFacts> = {}): AccountFacts {
  return {
    authenticated: true,
    emailVerified: false,
    phoneVerified: false,
    identityVerified: false,
    documentRequired: true,
    profile: {},
    ...patch,
  };
}

describe('parseAccountLevelsConfig', () => {
  it('ordena por level e aplica padrões', () => {
    const c = parseAccountLevelsConfig({
      levels: [
        { key: 'b', level: 2, title: 'B', requirement: 'contact_verified' },
        { key: 'a', level: 1, title: 'A', requirement: 'authenticated' },
      ],
    });
    expect(c.levels.map((l) => l.key)).toEqual(['a', 'b']);
    expect(c.levels[0]).toMatchObject({ onboardingOrder: 1, profileOrder: 1, enabled: true });
  });

  it.each([
    [{ levels: [] }, 'ao menos um nivel'],
    [
      { levels: [{ key: 'A', level: 1, title: 'x', requirement: 'authenticated' }] },
      'key invalida',
    ],
    [{ levels: [{ key: 'a', level: 0, title: 'x', requirement: 'authenticated' }] }, '>= 1'],
    [{ levels: [{ key: 'a', level: 1, title: 'x', requirement: 'magia' }] }, 'desconhecido'],
    [
      {
        levels: [
          { key: 'a', level: 1, title: 'x', requirement: 'authenticated' },
          { key: 'a', level: 2, title: 'y', requirement: 'authenticated' },
        ],
      },
      'repetida',
    ],
  ])('recusa config inválida (%#)', (raw, msg) => {
    expect(() => parseAccountLevelsConfig(raw)).toThrow(msg);
  });

  it('defineCapabilities recusa nível inexistente', () => {
    expect(() => defineCapabilities(config, { x: 'nao-existe' })).toThrow('nao existe');
  });
});

describe('computeAccountStatus', () => {
  it('visitante = 0', () => {
    const s = computeAccountStatus(config, facts({ authenticated: false, emailVerified: true }));
    expect(s.level).toBe(0);
    expect(s.next?.key).toBe('conta');
  });

  it('recém-cadastrado = 1, próximo = contato', () => {
    const s = computeAccountStatus(config, facts());
    expect(s.level).toBe(1);
    expect(s.next?.key).toBe('contato');
  });

  it('email OU telefone verificado = 2', () => {
    expect(computeAccountStatus(config, facts({ phoneVerified: true })).level).toBe(2);
    expect(computeAccountStatus(config, facts({ emailVerified: true })).level).toBe(2);
  });

  it('é sequencial: perfil completo sem contato verificado continua 1', () => {
    const s = computeAccountStatus(config, facts({ profile: fullProfile }));
    expect(s.level).toBe(1);
    expect(s.levels.find((l) => l.key === 'perfil')).toMatchObject({ met: true, reached: false });
  });

  it('perfil completo + contato = 3; nível desabilitado nunca é alcançado', () => {
    const s = computeAccountStatus(
      config,
      facts({ emailVerified: true, identityVerified: true, profile: fullProfile })
    );
    expect(s.level).toBe(3);
    expect(s.next).toBeNull();
  });

  it('lista o que falta no perfil; CPF inválido conta como faltando', () => {
    const s = computeAccountStatus(
      config,
      facts({
        emailVerified: true,
        profile: { ...fullProfile, documentNumber: '111.111.111-11', avatarUrl: '' },
      })
    );
    expect(s.levels.find((l) => l.key === 'perfil')?.missing).toEqual([
      'Foto de perfil',
      'CPF ou CNPJ valido',
    ]);
  });

  it('documento não exigido não bloqueia', () => {
    const s = computeAccountStatus(
      config,
      facts({
        emailVerified: true,
        documentRequired: false,
        profile: { ...fullProfile, documentNumber: null },
      })
    );
    expect(s.level).toBe(3);
  });
});

describe('canDo', () => {
  const nivel1 = computeAccountStatus(config, facts());

  it('libera quando o nível basta', () => {
    expect(canDo(nivel1, caps, 'like').allowed).toBe(true);
  });

  it('bloqueia e lista os níveis pendentes até o exigido', () => {
    const r = canDo(nivel1, caps, 'service.create');
    expect(r.allowed).toBe(false);
    expect(r.required?.key).toBe('perfil');
    expect(r.pending.map((l) => l.key)).toEqual(['contato', 'perfil']);
  });

  it('nível desabilitado bloqueia sempre', () => {
    const topo = computeAccountStatus(config, facts({ emailVerified: true, profile: fullProfile }));
    expect(canDo(topo, caps, 'sell').allowed).toBe(false);
  });

  it('ação fora do mapa exige só estar logado', () => {
    expect(canDo(nivel1, caps, 'qualquer').allowed).toBe(true);
    const anon = computeAccountStatus(config, facts({ authenticated: false }));
    expect(canDo(anon, caps, 'qualquer').allowed).toBe(false);
  });
});
