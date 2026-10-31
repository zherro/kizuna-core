import type { ReactNode } from 'react';
type MediaResultCardProps = {
    /** Cover image URL. `null`/`undefined` shows the plain gradient background instead. */
    image?: string | null;
    imageAlt: string;
    /** e.g. a "sponsored"/"featured" badge. */
    badgeTopLeft?: ReactNode;
    /** e.g. a category badge. */
    badgeTopRight?: ReactNode;
    title: string;
    subtitle?: string;
    /** Row rendered between the title block and the footer — an avatar+name row, a rating, etc.
     * Caller builds the full content; the card only positions it. */
    leading?: ReactNode;
    /** Bottom row of the card — typically a price on the left and a CTA on the right. Caller
     * builds the full content; the card only provides the layout slot. */
    footer: ReactNode;
    /** When set, the whole card becomes a link (e.g. to the result's detail page). */
    href?: string;
    className?: string;
};
export declare function MediaResultCard({ image, imageAlt, badgeTopLeft, badgeTopRight, title, subtitle, leading, footer, href, className, }: Readonly<MediaResultCardProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=media-result-card.d.ts.map