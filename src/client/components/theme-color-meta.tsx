'use client';

import { useEffect } from 'react';

/**
 * Mantém a barra do navegador no mobile (`<meta name="theme-color">`) com a MESMA cor do fundo da
 * página — que é a do header (`bg-background`). O valor estático do layout (kizuna.config.json →
 * `theme.metaColor` / `theme.metaColorDark`) cobre só a 1ª pintura; daqui em diante a cor vem do
 * `background-color` calculado do `<body>`, e é refeita quando o `<html>` troca de classe
 * (`dark`) ou de `data-theme-color` (seletor de tema) e quando o sistema muda claro/escuro.
 *
 * Atualiza TODAS as metas theme-color (a versão com `media` claro/escuro também), senão o navegador
 * continuaria usando a da mídia do sistema quando o usuário força o outro modo no app.
 */
export function ThemeColorMeta() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;

    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const color = toHex(getComputedStyle(document.body).backgroundColor);
        if (!color) return;
        let metas = Array.from(
          document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        );
        if (metas.length === 0) {
          const meta = document.createElement('meta');
          meta.name = 'theme-color';
          document.head.appendChild(meta);
          metas = [meta];
        }
        for (const meta of metas) {
          if (meta.content !== color) meta.content = color;
        }
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class', 'data-theme-color', 'style'],
    });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener('change', apply);
    };
  }, []);

  return null;
}

/** Qualquer cor CSS (oklch, lab, rgb…) → `#rrggbb`, via canvas. `null` se transparente/ inválida. */
function toHex(cssColor: string): string | null {
  if (!cssColor || cssColor === 'transparent') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  if (a === 0) return null;
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}
