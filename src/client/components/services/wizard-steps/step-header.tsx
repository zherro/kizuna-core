import type { ReactNode } from 'react';
import { PorQueIsso } from './por-que-isso';
import { Typography } from '../../ui/typography';

/**
 * The header every wizard step opens with: an optional small kicker, a large plain-language
 * question, one supporting line, and an optional "por que pedimos isso?" disclosure. Position in
 * the flow is shown by the rail / mobile progress bar, not a number here.
 */
export function StepHeader({
  kicker,
  title,
  subtitle,
  why,
}: {
  /** Kept for call-site compatibility; position is shown by the rail, not the header. */
  stepNumber?: number;
  totalSteps?: number;
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
  why?: ReactNode;
}) {
  return (
    <header className="space-y-2.5">
      {kicker ? <p className="text-xs font-medium text-muted-foreground">{kicker}</p> : null}

      <Typography.H3 weight='light'>
        {title}
      </Typography.H3>

      {subtitle ? (
        <Typography.P color="muted" measure>{subtitle}</Typography.P>
      ) : null}

      {why ? <PorQueIsso>{why}</PorQueIsso> : null}
    </header>
  );
}
