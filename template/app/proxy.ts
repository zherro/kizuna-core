import { createKizunaProxy } from '@kizuna/core/server/proxy';

export const proxy = createKizunaProxy({
  protectedPrefixes: ['/painel'],
  authPages: ['/login', '/registre-se'],
});

export const config = {
  matcher: ['/painel/:path*', '/login', '/registre-se'],
};
