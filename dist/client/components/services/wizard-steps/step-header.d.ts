import type { ReactNode } from 'react';
/**
 * The header every wizard step opens with: an optional small kicker, a large plain-language
 * question, one supporting line, and an optional "por que pedimos isso?" disclosure. Position in
 * the flow is shown by the rail / mobile progress bar, not a number here.
 */
export declare function StepHeader({ kicker, title, subtitle, why, }: {
    /** Kept for call-site compatibility; position is shown by the rail, not the header. */
    stepNumber?: number;
    totalSteps?: number;
    kicker?: string;
    title: string;
    subtitle?: ReactNode;
    why?: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=step-header.d.ts.map