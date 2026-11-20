// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendTrack, trackEvent } from './analytics-api';
import { __resetUtmMemo, getSessionUtm, UTM_STORAGE_KEY } from './utm-session';

const ID = '0b1d5a1e-7c3e-4a9a-9d0e-2f5f6a7b8c9d';
const fetchMock = vi.fn();

beforeEach(() => {
  sessionStorage.clear();
  __resetUtmMemo();
  window.history.replaceState(null, '', '/');
  fetchMock.mockReset().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const lastBody = () => JSON.parse(fetchMock.mock.calls.at(-1)![1].body as string) as Record<string, unknown>;

describe('getSessionUtm', () => {
  it('URL com utm grava na sessão; sem utm devolve o guardado; nova campanha substitui', () => {
    expect(getSessionUtm()).toBeNull();
    window.history.replaceState(null, '', '/?utm_source=insta&utm_medium=Stories');
    expect(getSessionUtm()).toEqual({ source: 'instagram', medium: 'stories' });
    window.history.replaceState(null, '', '/busca');
    expect(getSessionUtm()).toEqual({ source: 'instagram', medium: 'stories' });
    window.history.replaceState(null, '', '/hoje?utm_source=wa');
    expect(getSessionUtm()).toEqual({ source: 'whatsapp' });
  });

  it('valor adulterado no storage é revalidado', () => {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify({ source: 'IG', campaign: '<x>' }));
    expect(getSessionUtm()).toEqual({ source: 'instagram', campaign: 'x' });
    sessionStorage.setItem(UTM_STORAGE_KEY, 'not json');
    expect(getSessionUtm()).toBeNull();
  });
});

describe('sendTrack com utm e canal', () => {
  it('anexa p_utm_* da sessão aos eventos de view', () => {
    window.history.replaceState(null, '', '/?utm_source=ig&utm_campaign=agenda');
    sendTrack({ entityType: 'service', entityId: ID, event: 'view', visibleMs: 1600 });
    expect(lastBody()).toMatchObject({ p_utm_source: 'instagram', p_utm_campaign: 'agenda' });
    expect('p_utm_medium' in lastBody()).toBe(false);
  });

  it('sem utm não manda as chaves (corpo igual ao de antes)', () => {
    sendTrack({ entityType: 'service', entityId: ID, event: 'view', visibleMs: 1600 });
    expect(Object.keys(lastBody()).some((k) => k.startsWith('p_utm_'))).toBe(false);
    expect('p_channel' in lastBody()).toBe(false);
  });

  it('p_channel só no contact_click e só canal conhecido', () => {
    trackEvent({ entityType: 'service', entityId: ID, event: 'contact_click', channel: 'whatsapp' });
    expect(lastBody().p_channel).toBe('whatsapp');
    trackEvent({ entityType: 'service', entityId: ID, event: 'favorite', channel: 'whatsapp' });
    expect('p_channel' in lastBody()).toBe(false);
    trackEvent({ entityType: 'service', entityId: ID, event: 'contact_click', channel: 'sms' as never });
    expect('p_channel' in lastBody()).toBe(false);
  });
});
