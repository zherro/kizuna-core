import type { ServiceRecord } from './service-type';
export declare function fileUrl(id: string | number): string;
/** First image url for a service's card/hero — `extras.coverFileId`, falling back to the first of
 * `extras.images`. `services` has no dedicated image columns yet, so both live in `extras`.
 * Shared by the ad detail page and the provider profile page. */
export declare function coverImage(service: Pick<ServiceRecord, 'extras'>): string | null;
export declare function formatServicePrice(startingPrice: number, priceUnit: string): string;
//# sourceMappingURL=service-helpers.d.ts.map