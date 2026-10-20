'use client';

import { useEffect, useState } from 'react';

/**
 * Props do <img> do avatar: sem Referer (as fotos do Google, lh3.googleusercontent.com, vêm do
 * login OAuth e costumam falhar com Referer de outra origem) e `onError` para cair nas iniciais.
 */
export function avatarImgProps(onError: () => void) {
  return { referrerPolicy: 'no-referrer' as const, onError };
}

/**
 * URL da foto do usuário logado (`user_data.avatar_url`); string vazia enquanto carrega,
 * sem foto ou sem `userId`. Erros de rede contam como "sem foto".
 */
export function useUserAvatarUrl(userId: string | number | null | undefined): string {
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (!userId) {
      setAvatarUrl('');
      return;
    }
    let active = true;
    fetch('/api/resources/user_data?page=1&pageSize=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: Array<{ avatarUrl?: unknown }> } | null) => {
        const url = d?.items?.[0]?.avatarUrl;
        if (active && typeof url === 'string') setAvatarUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);

  return avatarUrl;
}
