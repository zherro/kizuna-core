import { describe, expect, it } from 'vitest';
import {
  canDo,
  computeAccountStatus,
  defineCapabilities,
  parseAccountLevelsConfig,
  unlocksByLevel,
  type AccountFacts,
} from './index';

const keys = (items: { key: string }[]) => items.map((m) => m.key);

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
    listings: { published: 0, pending: 0 },
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

  it('contato exige email E celular', () => {
    const soEmail = computeAccountStatus(config, facts({ emailVerified: true }));
    expect(soEmail.level).toBe(1);
    expect(keys(soEmail.levels[1]!.missing)).toEqual(['phone']);

    const soCelular = computeAccountStatus(config, facts({ phoneVerified: true }));
    expect(soCelular.level).toBe(1);
    expect(keys(soCelular.levels[1]!.missing)).toEqual(['email']);

    const nenhum = computeAccountStatus(config, facts());
    expect(keys(nenhum.levels[1]!.missing)).toEqual(['email', 'phone']);

    expect(
      computeAccountStatus(config, facts({ emailVerified: true, phoneVerified: true })).level
    ).toBe(2);
  });

  it('é sequencial: perfil completo sem contato verificado continua 1', () => {
    const s = computeAccountStatus(config, facts({ profile: fullProfile }));
    expect(s.level).toBe(1);
    expect(s.levels.find((l) => l.key === 'perfil')).toMatchObject({ met: true, reached: false });
  });

  it('perfil completo + contato = 3; nível desabilitado nunca é alcançado', () => {
    const s = computeAccountStatus(
      config,
      facts({ emailVerified: true, phoneVerified: true, identityVerified: true, profile: fullProfile })
    );
    expect(s.level).toBe(3);
    expect(s.next).toBeNull();
  });

  it('lista o que falta no perfil; CPF inválido conta como faltando', () => {
    const s = computeAccountStatus(
      config,
      facts({
        emailVerified: true,
        phoneVerified: true,
        profile: { ...fullProfile, documentNumber: '111.111.111-11', avatarUrl: '' },
      })
    );
    expect(s.levels.find((l) => l.key === 'perfil')?.missing).toEqual([
      { key: 'avatar', label: 'Foto de perfil', href: '/painel/minha-conta#foto' },
      { key: 'document', label: 'CPF ou CNPJ valido', href: '/painel/minha-conta#dados-pessoais' },
    ]);
  });

  it('contactVerification desliga o celular (só email)', () => {
    const soEmailCfg = parseAccountLevelsConfig({
      levels: config.levels,
      contactVerification: { email: true, phone: false },
    });
    const s = computeAccountStatus(soEmailCfg, facts({ emailVerified: true }));
    expect(s.level).toBe(2);
    expect(keys(computeAccountStatus(soEmailCfg, facts()).levels[1]!.missing)).toEqual(['email']);
  });

  it('missingLinks sobrescreve só a chave informada', () => {
    const c = parseAccountLevelsConfig({
      levels: config.levels,
      missingLinks: { email: '/verificar' },
    });
    expect(c.missingLinks.email).toBe('/verificar');
    expect(c.missingLinks.avatar).toBe('/painel/minha-conta#foto');
    expect(() =>
      parseAccountLevelsConfig({ levels: config.levels, missingLinks: { email: 1 } })
    ).toThrow('missingLinks.email');
  });

  it('status expõe os contatos verificados de fato', () => {
    const s = computeAccountStatus(config, facts({ emailVerified: true }));
    expect(s.contact).toEqual({ emailVerified: true, phoneVerified: false });
  });

  it('documento não exigido não bloqueia', () => {
    const s = computeAccountStatus(
      config,
      facts({
        emailVerified: true,
        phoneVerified: true,
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
    const topo = computeAccountStatus(config, facts({ emailVerified: true, phoneVerified: true, profile: fullProfile }));
    expect(canDo(topo, caps, 'sell').allowed).toBe(false);
  });

  it('ação fora do mapa exige só estar logado', () => {
    expect(canDo(nivel1, caps, 'qualquer').allowed).toBe(true);
    const anon = computeAccountStatus(config, facts({ authenticated: false }));
    expect(canDo(anon, caps, 'qualquer').allowed).toBe(false);
  });
});

describe('listing_published', () => {
  const cfg5 = parseAccountLevelsConfig({
    levels: [
      { key: 'conta', level: 1, title: 'Conta', requirement: 'authenticated' },
      { key: 'contato', level: 2, title: 'Contato', requirement: 'contact_verified' },
      { key: 'perfil', level: 3, title: 'Perfil', requirement: 'profile_complete' },
      { key: 'anunciante', level: 4, title: 'Anunciante', requirement: 'listing_published' },
      {
        key: 'identidade',
        level: 5,
        title: 'Identidade',
        requirement: 'identity_verified',
        enabled: false,
      },
    ],
  });
  const pronto = { emailVerified: true, phoneVerified: true, profile: fullProfile };

  it('sem anúncio: falta publicar', () => {
    const s = computeAccountStatus(cfg5, facts(pronto));
    expect(s.level).toBe(3);
    expect(s.next?.key).toBe('anunciante');
    expect(keys(s.next!.missing)).toEqual(['listing']);
  });

  it('só pendente: em análise', () => {
    const s = computeAccountStatus(
      cfg5,
      facts({ ...pronto, listings: { published: 0, pending: 1 } })
    );
    expect(s.level).toBe(3);
    expect(keys(s.next!.missing)).toEqual(['listingPending']);
  });

  it('publicado: nível 4, e o 5 desligado nunca é alcançado', () => {
    const s = computeAccountStatus(
      cfg5,
      facts({ ...pronto, listings: { published: 1, pending: 0 } })
    );
    expect(s.level).toBe(4);
    expect(s.levelKey).toBe('anunciante');
    expect(s.next).toBeNull();
  });

  it('canDo service.create no nível 2 lista só o perfil como pendente', () => {
    const caps5 = defineCapabilities(cfg5, { 'service.create': 'perfil' });
    const s = computeAccountStatus(cfg5, facts({ emailVerified: true, phoneVerified: true }));
    const r = canDo(s, caps5, 'service.create');
    expect(r.allowed).toBe(false);
    expect(r.pending.map((l) => l.key)).toEqual(['perfil']);
  });
});

describe('unlocksByLevel', () => {
  it('agrupa rótulos por nível, ignora ação sem rótulo e não repete', () => {
    const out = unlocksByLevel(
      { like: 'conta', save: 'conta', review: 'contato', 'service.create': 'perfil', x: 'perfil' },
      { like: 'Curtir', save: 'Curtir', review: 'Avaliar', 'service.create': 'Publicar anuncios' }
    );
    expect(out).toEqual({
      conta: ['Curtir'],
      contato: ['Avaliar'],
      perfil: ['Publicar anuncios'],
    });
  });
});
