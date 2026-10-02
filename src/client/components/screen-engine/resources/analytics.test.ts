import { describe, expect, it } from 'vitest';
import { rpcAuthMode } from '../../../../server/rpc-auth';
import { resourceAnalytics, rpcAnalytics } from './analytics';

describe('analytics resources', () => {
  it('a escrita é RPC pública com sessão opcional', () => {
    expect(rpcAuthMode(rpcAnalytics.fn_analytics_track)).toBe('optional');
  });

  it('a leitura exige login e aceita páginas grandes', () => {
    const cfg = resourceAnalytics.analytics_events;
    expect(cfg.table).toBe('analytics_events');
    expect(cfg.listRequiresAuth).not.toBe(false);
    expect(cfg.maxPageSize).toBe(1000);
    expect(cfg.returnCountPreferDisabled).toBe(true);
    expect(cfg.select).toBe('entity_id,visitor_hash,day,event_type,source');
  });
});
