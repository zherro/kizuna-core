import type { ReactNode } from 'react';
import { Label } from '../../ui/label';

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--ui-radius-card-lg,1.5rem)] border border-border/60 bg-card p-5 md:p-6">
      <header className="mb-5">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** Rótulo + controle + dica/erro. Campos opcionais levam "(opcional)"; obrigatórios não levam nada. */
export function Field({
  label,
  htmlFor,
  optional,
  hint,
  error,
  aside,
  children,
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {optional ? (
            <span className="ml-1 font-normal text-muted-foreground">(opcional)</span>
          ) : null}
        </Label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
