'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { useAuth } from '../providers/auth-provider';
import { avatarImgProps, useUserAvatarUrl } from '../hooks/use-user-avatar-url';

/**
 * Atalho de conta do cabeçalho: só a foto do usuário (`user_data.avatar_url`; sem foto, as iniciais)
 * e leva à gestão do perfil. Substitui o "Sair"/nome soltos no header — o logout fica no menu.
 */
export function HeaderAvatarLink({
  href = '/painel/minha-conta',
  label = 'Minha conta',
  className,
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const avatarUrl = useUserAvatarUrl(user?.user_id);
  const [failedAvatar, setFailedAvatar] = useState('');
  const showAvatar = avatarUrl !== '' && failedAvatar !== avatarUrl;

  if (!user) return null;

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/15',
        className
      )}
    >
      {showAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          {...avatarImgProps(() => setFailedAvatar(avatarUrl))}
        />
      ) : (
        user.initials
      )}
    </Link>
  );
}
