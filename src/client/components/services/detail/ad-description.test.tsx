import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdDescription, isHtmlDescription, sanitizeDescriptionHtml } from './ad-description';

describe('isHtmlDescription', () => {
  it('distingue HTML de editor de Markdown', () => {
    expect(isHtmlDescription('<p>Olá</p>')).toBe(true);
    expect(isHtmlDescription('Texto com **negrito**\n\n- item')).toBe(false);
    expect(isHtmlDescription('1 < 2 e 3 > 1')).toBe(false);
  });
});

describe('sanitizeDescriptionHtml', () => {
  it('remove script/estilo, atributos e handlers', () => {
    const out = sanitizeDescriptionHtml(
      '<p onclick="x()" style="color:red">Oi</p><script>alert(1)</script><img src=x onerror=alert(1)><iframe src="//x"></iframe>'
    );
    expect(out).toBe('<p>Oi</p>');
  });
  it('mantém só links http/https/mailto e põe rel noopener', () => {
    const ok = sanitizeDescriptionHtml('<a href="https://a.com/x?y=1&z=2" onclick="x">a</a>');
    expect(ok).toContain('href="https://a.com/x?y=1&z=2"');
    expect(ok).toContain('rel="noopener noreferrer"');
    expect(ok).not.toContain('onclick');
    expect(sanitizeDescriptionHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitizeDescriptionHtml('<a href=" JaVaScRiPt:alert(1)">x</a>')).toBe('<a>x</a>');
  });
  it('escapa texto que parece tag', () => {
    expect(sanitizeDescriptionHtml('<p>a &amp; b < c</p>')).toBe('<p>a &amp; b &lt; c</p>');
    expect(sanitizeDescriptionHtml('<p>&lt;script&gt;</p>')).toBe('<p>&lt;script&gt;</p>');
  });
  it('rebaixa títulos para h3', () => {
    expect(sanitizeDescriptionHtml('<h1>T</h1>')).toBe('<h3>T</h3>');
  });
});

describe('AdDescription', () => {
  it('renderiza Markdown (negrito, lista, link externo seguro)', () => {
    const html = renderToStaticMarkup(
      <AdDescription text={'**Quando:** 10 de outubro\n\n- item um\n- item dois\n\n[site](https://exemplo.com)'} />
    );
    expect(html).toContain('<strong');
    expect(html).toContain('<li');
    expect(html).toContain('href="https://exemplo.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });
  it('não emite HTML cru nem javascript: do Markdown', () => {
    const html = renderToStaticMarkup(
      <AdDescription text={'oi [x](javascript:alert(1)) e texto cru'} />
    );
    expect(html).not.toMatch(/href="javascript:/i);
  });
  it('mantém o caminho HTML (sanitizado) para HTML legado', () => {
    const html = renderToStaticMarkup(
      <AdDescription text={'<p>Olá <strong>mundo</strong></p><script>x</script>'} />
    );
    expect(html).toContain('<p>Olá <strong>mundo</strong></p>');
    expect(html).not.toContain('<script');
  });
  it('vazio → nada', () => {
    expect(renderToStaticMarkup(<AdDescription text="  " />)).toBe('');
  });
});

describe('sanitizeDescriptionHtml — vídeo do YouTube', () => {
  it('iframe do YouTube vira embed seguro; outros iframes somem', () => {
    const out = sanitizeDescriptionHtml(
      '<p>Oi</p><iframe class="ql-video" frameborder="0" allowfullscreen="true" src="https://www.youtube.com/embed/dQw4w9WgXcQ?showinfo=0" onload="x()"></iframe><iframe src="https://evil.com/x"></iframe>'
    );
    expect(out).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(out).not.toContain('evil.com');
    expect(out).not.toContain('onload');
    expect(out.match(/<iframe/g)).toHaveLength(1);
  });
});
