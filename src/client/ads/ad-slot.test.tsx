// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let pathname = '/cuiaba/bares';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
const trackAd = vi.fn();
const loadAdPool = vi.fn();
vi.mock('./ads-api', () => ({ loadAdPool: () => loadAdPool(), trackAd: (p: unknown) => trackAd(p) }));

import { GOOGLE_CREATIVE_ID } from '../../shared/ads';
import { AdSlot, __resetAdSlotCounter } from './ad-slot';

const creative = {
  id: 'c1', format: 'banner', kind: 'imagem', imageUrl: 'https://x/a.png', alt: 'Anúncio A',
  linkUrl: 'https://x', label: 'A', weight: 1, startsAt: null, endsAt: null, cities: [], slots: [], active: true,
};
const slotCfg = { slug: 'home-meio', enabled: true, media: ['imagem', 'gif', 'google'], googleWeight: 0, googleAdUnit: null, rotateSeconds: 0 };

let observers: Array<{ cb: IntersectionObserverCallback }> = [];
class FakeIO {
  constructor(public cb: IntersectionObserverCallback) { observers.push(this); }
  observe() {}
  unobserve() {}
  disconnect() { observers = observers.filter((o) => o !== this); }
}
const setRatio = (r: number) =>
  act(() => observers.forEach((o) => o.cb([{ isIntersecting: r > 0, intersectionRatio: r } as IntersectionObserverEntry], {} as IntersectionObserver)));
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  vi.useFakeTimers();
  observers = [];
  document.getElementById('kizuna-adsbygoogle')?.remove();
  pathname = '/cuiaba/bares';
  trackAd.mockReset();
  loadAdPool.mockReset().mockResolvedValue({ slots: [slotCfg], creatives: [creative] });
  __resetAdSlotCounter();
  vi.stubGlobal('IntersectionObserver', FakeIO);
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('AdSlot', () => {
  it('1. primeiro render é null e só decide após o efeito', async () => {
    const { container } = render(<AdSlot slot="home-meio" />);
    expect(container.firstChild).toBeNull();
    await flush();
    expect(container.firstChild).not.toBeNull();
  });

  it('2. slug fora do catálogo, slot ausente/desabilitado ou sem candidatos colapsa', async () => {
    const a = render(<AdSlot slot="nao-existe" />);
    await flush();
    expect(a.container.firstChild).toBeNull();

    loadAdPool.mockResolvedValue({ slots: [], creatives: [creative] });
    const b = render(<AdSlot slot="home-meio" />);
    await flush();
    expect(b.container.firstChild).toBeNull();

    loadAdPool.mockResolvedValue({ slots: [{ ...slotCfg, enabled: false }], creatives: [creative] });
    __resetAdSlotCounter();
    const c = render(<AdSlot slot="home-meio" />);
    await flush();
    expect(c.container.firstChild).toBeNull();

    loadAdPool.mockResolvedValue({ slots: [slotCfg], creatives: [] });
    __resetAdSlotCounter();
    const d = render(<AdSlot slot="home-meio" />);
    await flush();
    expect(d.container.firstChild).toBeNull();
  });

  it('3. criativo próprio: link sponsored, img com alt, selo e min-height', async () => {
    const { container } = render(<AdSlot slot="home-meio" />);
    await flush();
    const link = container.querySelector('a')!;
    expect(link.getAttribute('rel')).toBe('sponsored noopener noreferrer');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(screen.getByAltText('Anúncio A')).toBeTruthy();
    expect(screen.getByText('Patrocinado')).toBeTruthy();
    expect(container.querySelector<HTMLElement>('[style*="min-height"]')!.style.minHeight).toBe('140px');
  });

  it('4. impressão só com ratio >= 0.5 por 1 s, com page = routePattern', async () => {
    render(<AdSlot slot="home-meio" />);
    await flush();
    setRatio(0.3);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(trackAd).not.toHaveBeenCalled();
    setRatio(0.6);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(trackAd).toHaveBeenCalledTimes(1);
    expect(trackAd).toHaveBeenCalledWith({ slot: 'home-meio', creativeId: 'c1', page: '/[cidade]/[id]', event: 'impression' });
  });

  it('5. clique rastreia; Google não tem link nem clique', async () => {
    const { container, unmount } = render(<AdSlot slot="home-meio" />);
    await flush();
    act(() => { container.querySelector('a')!.click(); });
    expect(trackAd).toHaveBeenCalledWith({ slot: 'home-meio', creativeId: 'c1', page: '/[cidade]/[id]', event: 'click' });
    unmount();

    loadAdPool.mockResolvedValue({ slots: [{ ...slotCfg, googleWeight: 1, googleAdUnit: '123' }], creatives: [] });
    __resetAdSlotCounter();
    const g = render(<AdSlot slot="home-meio" adsenseClient="ca-pub-1" />);
    await flush();
    expect(g.container.querySelector('a')).toBeNull();
    expect(g.container.querySelector('ins.adsbygoogle')).not.toBeNull();
    expect(g.container.querySelector('[data-ad-kind="google"]')).not.toBeNull();
  });

  it('6. rotateSeconds troca o item só com aba visível e reconta impressão', async () => {
    const c2 = { ...creative, id: 'c2', alt: 'Anúncio B' };
    loadAdPool.mockResolvedValue({ slots: [{ ...slotCfg, rotateSeconds: 5 }], creatives: [creative, c2] });
    const { container } = render(<AdSlot slot="home-meio" />);
    await flush();
    const first = container.querySelector('img')!.getAttribute('alt');
    setRatio(1);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(trackAd).toHaveBeenCalledTimes(1);

    let state = 'hidden';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(container.querySelector('img')!.getAttribute('alt')).toBe(first);

    state = 'visible';
    act(() => { vi.advanceTimersByTime(5000); });
    expect(container.querySelector('img')!.getAttribute('alt')).not.toBe(first);
    setRatio(1);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(trackAd).toHaveBeenCalledTimes(2);
  });

  it('7. maxPerPage: o 4º slot da mesma página colapsa; novo pathname zera', async () => {
    const r = render(
      <>
        <AdSlot slot="home-meio" /><AdSlot slot="home-meio" /><AdSlot slot="home-meio" /><AdSlot slot="home-meio" />
      </>,
    );
    await flush();
    expect(r.container.querySelectorAll('aside').length).toBe(3);
    r.unmount();

    pathname = '/busca';
    const r2 = render(<AdSlot slot="home-meio" />);
    await flush();
    expect(r2.container.querySelectorAll('aside').length).toBe(1);
  });

  it('8. allowGoogle=false ou sem adsenseClient: Google fora dos candidatos', async () => {
    loadAdPool.mockResolvedValue({ slots: [{ ...slotCfg, googleWeight: 1, googleAdUnit: '123' }], creatives: [] });
    const a = render(<AdSlot slot="home-meio" adsenseClient="ca-pub-1" allowGoogle={false} />);
    await flush();
    expect(a.container.firstChild).toBeNull();
    a.unmount();
    __resetAdSlotCounter();
    const b = render(<AdSlot slot="home-meio" />);
    await flush();
    expect(b.container.firstChild).toBeNull();
  });

  it('A. slots vazios não gastam cota; remontar libera', async () => {
    const r = render(
      <>
        <AdSlot slot="home-destaque" /><AdSlot slot="home-destaque" /><AdSlot slot="home-destaque" />
        <AdSlot slot="home-meio" />
      </>,
    );
    await flush();
    expect(r.container.querySelectorAll('aside').length).toBe(1);
    r.unmount();
    for (let i = 0; i < 3; i++) {
      const x = render(<AdSlot slot="home-meio" />);
      await flush();
      expect(x.container.querySelectorAll('aside').length).toBe(1);
      x.unmount();
    }
  });

  it('D. rotateSeconds com 1 candidato não reconta impressão', async () => {
    loadAdPool.mockResolvedValue({ slots: [{ ...slotCfg, rotateSeconds: 5 }], creatives: [creative] });
    render(<AdSlot slot="home-meio" />);
    await flush();
    setRatio(1);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(trackAd).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(15000); });
    setRatio(1);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(trackAd).toHaveBeenCalledTimes(1);
  });

  it('Google: impressão com GOOGLE_CREATIVE_ID e script do AdSense só quando permitido, uma vez', async () => {
    loadAdPool.mockResolvedValue({ slots: [{ ...slotCfg, googleWeight: 1, googleAdUnit: '123' }], creatives: [] });
    const a = render(<AdSlot slot="home-meio" adsenseClient="ca-pub-1" allowGoogle={false} />);
    await flush();
    a.unmount();
    __resetAdSlotCounter();
    const b = render(<AdSlot slot="home-meio" />);
    await flush();
    b.unmount();
    expect(document.getElementById('kizuna-adsbygoogle')).toBeNull();
    __resetAdSlotCounter();
    const c = render(<><AdSlot slot="home-meio" adsenseClient="ca-pub-1" /><AdSlot slot="home-meio" adsenseClient="ca-pub-1" /></>);
    await flush();
    expect(document.querySelectorAll('#kizuna-adsbygoogle').length).toBe(1);
    setRatio(1);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(trackAd).toHaveBeenCalledWith({ slot: 'home-meio', creativeId: GOOGLE_CREATIVE_ID, page: '/[cidade]/[id]', event: 'impression' });
    c.unmount();
  });

  it('inline não carrega o container de página; default carrega', async () => {
    const a = render(<AdSlot slot="home-meio" inline />);
    await flush();
    expect(a.container.querySelector('aside')?.className).not.toMatch(/max-w-\[1600px\]|px-4/);
    a.unmount();
    __resetAdSlotCounter();
    const b = render(<AdSlot slot="home-meio" />);
    await flush();
    expect(b.container.querySelector('aside')?.className).toMatch(/max-w-\[1600px\]/);
    b.unmount();
  });
});
