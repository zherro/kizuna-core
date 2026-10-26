import { describe, it, expect } from 'vitest';
import { classifyDevice } from './device';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ANDROID_MOBILE =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const ANDROID_TABLET =
  'Mozilla/5.0 (Linux; Android 14; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

describe('classifyDevice', () => {
  it('iPhone vira mobile', () => {
    expect(classifyDevice(IPHONE, 390)).toBe('mobile');
  });
  it('iPad vira tablet', () => {
    expect(classifyDevice(IPAD, 820)).toBe('tablet');
  });
  it('Android com Mobile vira mobile', () => {
    expect(classifyDevice(ANDROID_MOBILE, 412)).toBe('mobile');
  });
  it('Android sem Mobile vira tablet', () => {
    expect(classifyDevice(ANDROID_TABLET, 800)).toBe('tablet');
  });
  it('Chrome desktop com 1440 vira desktop', () => {
    expect(classifyDevice(CHROME_DESKTOP, 1440)).toBe('desktop');
  });
  it('UA vazio decide pela largura', () => {
    expect(classifyDevice('', 500)).toBe('mobile');
    expect(classifyDevice('', 800)).toBe('tablet');
    expect(classifyDevice('', 1280)).toBe('desktop');
  });
});
