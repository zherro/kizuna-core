'use client';

import Link from 'next/link';
import type { RefObject } from 'react';
import { Camera, ChevronRight, ExternalLink, Loader2, UserRound } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { AccountStatus } from '../../../../shared/account-levels';

type Props = {
  fullName: string;
  displayName: string;
  avatarUrl: string;
  avatarUploading: boolean;
  avatarError: string | null;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Perfil público só existe depois do primeiro save (senão /prestador/<nome> dá 404). */
  publicProfileAvailable: boolean;
  levelStatus: AccountStatus | null;
  levelsHref?: string;
};

export function ProfileHeader({
  fullName,
  displayName,
  avatarUrl,
  avatarUploading,
  avatarError,
  avatarInputRef,
  onAvatarChange,
  publicProfileAvailable,
  levelStatus,
  levelsHref = '/painel/onboarding',
}: Props) {
  const current = levelStatus?.levels.find((l) => l.key === levelStatus.levelKey);

  return (
    <section
      id="foto"
      className="scroll-mt-24 rounded-[var(--ui-radius-card-lg,1.5rem)] border border-border/60 bg-card p-5 md:p-6"
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={avatarUploading}
          aria-label={avatarUrl ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
          className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-muted ring-4 ring-background transition disabled:opacity-60"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="mx-auto h-10 w-10 text-muted-foreground" />
          )}
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity',
              avatarUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
            )}
          >
            {avatarUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          </span>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onAvatarChange}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{fullName.trim() || 'Seu nome'}</p>
          <p className="truncate text-sm text-muted-foreground">
            {displayName ? `@${displayName}` : 'Escolha um nome de exibição'}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm sm:justify-start">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
            >
              {avatarUrl ? 'Trocar foto' : 'Adicionar foto'}
            </button>
            {publicProfileAvailable && displayName ? (
              <a
                href={`/prestador/${displayName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver perfil público
              </a>
            ) : null}
          </div>
          <p className={cn('mt-1 text-xs', avatarError ? 'text-destructive' : 'text-muted-foreground')}>
            {avatarError ?? 'JPG, PNG ou WebP, até 2 MB. A foto é salva na hora.'}
          </p>
        </div>

        {levelStatus ? (
          <Link
            href={levelsHref}
            className="w-full rounded-[var(--ui-radius-card-sm,0.75rem)] bg-muted/50 px-4 py-3 text-left transition-colors hover:bg-muted sm:w-52"
          >
            <span className="flex items-center justify-between text-xs text-muted-foreground">
              Nivel {levelStatus.level} de {levelStatus.levels.length}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
            <span className="mt-0.5 block truncate text-sm font-medium">
              {current?.title ?? 'Visitante'}
            </span>
            <span className="mt-2 flex gap-1" aria-hidden>
              {levelStatus.levels.map((l) => (
                <span
                  key={l.key}
                  className={cn(
                    'h-1 flex-1 rounded-full',
                    l.reached ? 'bg-primary' : 'bg-border',
                    l.enabled === false && 'opacity-40'
                  )}
                />
              ))}
            </span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
