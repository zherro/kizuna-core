import { Temporal as TemporalPolyfill } from '@js-temporal/polyfill';

type GlobalWithTemporal = typeof globalThis & {
  Temporal?: typeof TemporalPolyfill;
};

const globalWithTemporal = globalThis as GlobalWithTemporal;

if (!globalWithTemporal.Temporal) {
  globalWithTemporal.Temporal = TemporalPolyfill;
}
