import { describe, expect, it } from 'vitest';
import { contactChannelFromHref, isAnalyticsChannel } from './channel';

describe('contactChannelFromHref', () => {
  it('deduz o canal pelo href', () => {
    expect(contactChannelFromHref('tel:+5565999990000')).toBe('phone');
    expect(contactChannelFromHref('mailto:a@b.com')).toBe('email');
    expect(contactChannelFromHref('https://wa.me/5565999990000?text=oi')).toBe('whatsapp');
    expect(contactChannelFromHref('https://api.whatsapp.com/send?phone=55')).toBe('whatsapp');
    expect(contactChannelFromHref('whatsapp://send?phone=55')).toBe('whatsapp');
    expect(contactChannelFromHref('https://www.instagram.com/boracuiaba')).toBe('instagram');
    expect(contactChannelFromHref('https://exemplo.com.br')).toBe('site');
    expect(contactChannelFromHref('https://wa.me.golpe.com/x')).toBe('site');
    expect(contactChannelFromHref('')).toBe('other');
    expect(contactChannelFromHref(undefined)).toBe('other');
  });

  it('isAnalyticsChannel só aceita a lista', () => {
    expect(isAnalyticsChannel('purchase')).toBe(true);
    expect(isAnalyticsChannel('sms')).toBe(false);
    expect(isAnalyticsChannel({ type: 'click' })).toBe(false);
  });
});
