import { Typography } from '../../ui/typography';

type StepIntroProps = {
  title: string;
  subtitle?: string;
};

/** Small header for a single step of a wizard: title + optional subtitle. */
export function StepIntro({ title, subtitle }: Readonly<StepIntroProps>) {
  return (
    <header className="space-y-1">
      <Typography.H2 weight="medium">{title}</Typography.H2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </header>
  );
}
