import { isCaptchaEnabled } from '../../../server/captcha';
import { CAPTCHA_FLAG_GLOBAL } from './captcha-config';

/**
 * Server component para o `<body>` do layout raiz. Quando o captcha está desligado em runtime
 * (`AUTH_CAPTCHA_ENABLED=false`) mas a chave pública existe no build, grava a flag no `window`
 * antes da hidratação — assim widget e trava do botão somem sem rebuild. Para reativar: apagar
 * a variável e reiniciar. Com captcha ligado (ou sem chave), não renderiza nada.
 */
export function CaptchaFlagScript() {
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || isCaptchaEnabled()) return null;
  return <script dangerouslySetInnerHTML={{ __html: `window.${CAPTCHA_FLAG_GLOBAL}=false;` }} />;
}
