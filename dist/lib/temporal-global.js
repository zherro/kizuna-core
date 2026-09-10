import { Temporal as TemporalPolyfill } from '@js-temporal/polyfill';
const globalWithTemporal = globalThis;
if (!globalWithTemporal.Temporal) {
    globalWithTemporal.Temporal = TemporalPolyfill;
}
//# sourceMappingURL=temporal-global.js.map