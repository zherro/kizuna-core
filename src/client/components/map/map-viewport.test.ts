import { describe, expect, it } from 'vitest';
import { MAX_ZOOM, TILE, clampZoom, computeFrame, fitView, project, unproject } from './map-viewport';

const CUIABA = { lat: -15.601, lng: -56.097 };

describe('projeção Web Mercator', () => {
  it('origem do mundo: lng -180 fica em x=0 e a linha do Equador no meio', () => {
    expect(project({ lat: 0, lng: -180 })).toEqual({ x: 0, y: TILE / 2 });
    expect(project({ lat: 0, lng: 180 }).x).toBeCloseTo(TILE);
  });

  it('unproject desfaz project', () => {
    const back = unproject(project(CUIABA));
    expect(back.lat).toBeCloseTo(CUIABA.lat, 6);
    expect(back.lng).toBeCloseTo(CUIABA.lng, 6);
  });
});

describe('fitView', () => {
  it('um ponto só: centra nele e não passa do zoom máximo pedido', () => {
    const p = project(CUIABA);
    const v = fitView([p], 800, 600, { maxZoom: 15 });
    expect(v.zoom).toBe(15);
    expect(v.center).toEqual(p);
  });

  it('vários pontos: enquadra todos dentro do quadro, com margem', () => {
    const pts = [project({ lat: -15.5, lng: -56.2 }), project({ lat: -15.7, lng: -55.9 })];
    const v = fitView(pts, 800, 600, { padding: 50 });
    const frame = computeFrame(v, { w: 800, h: 600 });
    for (const ll of [
      { lat: -15.5, lng: -56.2 },
      { lat: -15.7, lng: -55.9 },
    ]) {
      const s = frame.at(ll);
      expect(s.x).toBeGreaterThanOrEqual(49);
      expect(s.x).toBeLessThanOrEqual(751);
      expect(s.y).toBeGreaterThanOrEqual(49);
      expect(s.y).toBeLessThanOrEqual(551);
    }
  });

  it('respeita os limites de zoom', () => {
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(-5)).toBe(3);
  });
});

describe('computeFrame', () => {
  it('o centro da vista cai no meio do quadro e há tiles cobrindo-o', () => {
    const view = { center: project(CUIABA), zoom: 12 };
    const frame = computeFrame(view, { w: 800, h: 600 });
    const c = frame.at(CUIABA);
    expect(c.x).toBeCloseTo(400, 3);
    expect(c.y).toBeCloseTo(300, 3);
    expect(frame.tiles.length).toBeGreaterThanOrEqual(6);
    expect(frame.tiles[0].src).toMatch(/^https:\/\/tile\.openstreetmap\.org\/12\/\d+\/\d+\.png$/);
  });

  it('zoom fracionário usa o tile do zoom inteiro, esticado', () => {
    const frame = computeFrame({ center: project(CUIABA), zoom: 12.5 }, { w: 400, h: 400 });
    expect(frame.tileSize).toBeCloseTo(TILE * 2 ** 0.5);
    expect(frame.tiles[0].src).toContain('/12/');
  });
});
