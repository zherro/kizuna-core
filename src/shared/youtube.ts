/** Id de vídeo do YouTube: 11 caracteres de [A-Za-z0-9_-]. */
const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Id do vídeo a partir de um link do YouTube (watch, youtu.be, embed, shorts, live, nocookie) ou
 * do próprio id. Qualquer outra coisa → `null`.
 */
export function youtubeVideoId(input: string | null | undefined): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;
  if (ID.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      id = m ? m[1] : null;
    }
  }
  return id && ID.test(id) ? id : null;
}

/** URL de embed (domínio sem cookies) ou `null` se não for YouTube. */
export function youtubeEmbedUrl(input: string | null | undefined): string | null {
  const id = youtubeVideoId(input);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
