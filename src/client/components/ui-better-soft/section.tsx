import type { ReactNode } from 'react';

type SectionProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
};

export function Section({ icon, title, description, children }: Readonly<SectionProps>) {
  return (
    <section className="rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
          {icon}
        </span>
        <div>
          <h2 className="text-base font-bold sm:text-lg">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </header>
      {children}
    </section>
  );
}
