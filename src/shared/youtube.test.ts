import { describe, expect, it } from 'vitest';
import { youtubeEmbedUrl, youtubeVideoId } from './youtube';

describe('youtube', () => {
  it('extrai o id dos formatos comuns', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
      'youtu.be/dQw4w9WgXcQ',
      'https://m.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      'dQw4w9WgXcQ',
    ]) {
      expect(youtubeVideoId(url)).toBe('dQw4w9WgXcQ');
    }
  });
  it('recusa outros sites e ids inválidos', () => {
    expect(youtubeVideoId('https://vimeo.com/123')).toBeNull();
    expect(youtubeVideoId('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(youtubeVideoId('https://youtube.com/watch?v="><script>')).toBeNull();
    expect(youtubeEmbedUrl('youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
});
