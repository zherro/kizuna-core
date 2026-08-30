# kizuna-core: Auth Server Setup

## Autenticação no Core

O core fornece:

### 1. **JWT Helper Functions**

```typescript
// src/server/auth.ts
signSession(payload); // Gera JWT
verifySession(token); // Verifica JWT
getSession(); // Lê sessão do cookie
getTokenFromCookies(); // Extrai token
getAuthHeaderFromCookies(); // Monta header "Bearer ..."
```

### 2. **Route Handler Factories**

```typescript
// src/server/auth-handlers.ts
createLoginHandler(pgrstRpc); // Factory para POST /login
createRegisterHandler(pgrstRpc); // Factory para POST /register
createLogoutHandler(); // Factory para POST /logout
```

### 3. **Helper Functions**

```typescript
maskEmail(email); // "user@example.com" → "us***@example.com"
getDisplayNameFromEmail(email); // "john.doe@example.com" → "John Doe"
getDisplayName(name, email); // Fallback: nome ou email normalizado
isValidEmail(email); // Validação de email
isConfigError(message); // Verifica se erro é config
```

---

## Como Usar em Novo Projeto

### 1. Configurar ENV

```bash
# .env.local
JWT_SECRET=seu-secret-de-32-caracteres-ou-mais
POSTGREST_URL=http://localhost:3000
```

### 2. Criar Handlers (em novo projeto)

**`src/app/api/auth/login/route.ts`:**

```typescript
import { createLoginHandler } from '@kizuna/core/server';
import { pgrstRpc } from '@/lib/postgrest-client';

const handleLogin = createLoginHandler(pgrstRpc);

export async function POST(request: Request) {
  return handleLogin(request);
}
```

**`src/app/api/auth/register/route.ts`:**

```typescript
import { createRegisterHandler } from '@kizuna/core/server';
import { pgrstRpc } from '@/lib/postgrest-client';

const handleRegister = createRegisterHandler(pgrstRpc);

export async function POST(request: Request) {
  return handleRegister(request);
}
```

**`src/app/api/auth/logout/route.ts`:**

```typescript
import { createLogoutHandler } from '@kizuna/core/server';

const handleLogout = createLogoutHandler();

export async function POST(request: Request) {
  return handleLogout(request);
}
```

### 3. Setup PostgREST RPC

Novo projeto precisa definir 2 RPCs no PostgreSQL:

```sql
-- fun_auth__login_with_perms(p_login, p_password)
-- Retorna: { user_id, tenant_id, tenant_type, perms }

-- fun_auth__signup_bootstrap(p_login, p_password)
-- Retorna: { user_id, tenant_id }
```

### 4. Usar getSession() em Server Components

```typescript
// src/app/painel/page.tsx
import { getSession } from '@kizuna/core/server';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      Bem-vindo, {session.display_name}!
      Tenant: {session.tenant_id}
    </div>
  );
}
```

### 5. Passar Session para Client (via AuthProvider)

```typescript
// src/app/layout.tsx
import { AuthProvider } from '@kizuna/core/client';
import { getSession } from '@kizuna/core/server';

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html>
      <body>
        <AuthProvider initialSession={session}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## Session Payload (JWT)

```typescript
type SessionPayload = {
  user_id: string; // UUID do usuário
  tenant_id: string; // UUID do tenant (multi-tenant)
  tenant_type?: string; // 'admin', 'provider', 'customer', etc
  role?: string; // 'auth_user' (default)
  login?: string; // Email
  display_name?: string; // Nome normalizado
  perms?: PermissionMap; // { [resource]: { view, edit, delete } }
};
```

---

## Cookie Seguro

O handler seta cookie com:

- ✅ `httpOnly: true` — Inacessível via JavaScript
- ✅ `sameSite: 'lax'` — CSRF protection
- ✅ `secure: true` (produção) — HTTPS only
- ✅ `path: '/'` — Disponível em toda a app

---

## Fluxo Completo

```
1. Usuário POST /api/auth/login { email, password }
   ↓
2. Novo projeto chama: pgrstRpc('fun_auth__login_with_perms', ...)
   ↓
3. PostgREST chama RPC no PostgreSQL
   ↓
4. RPC valida senha, retorna { user_id, tenant_id, perms }
   ↓
5. Core gera JWT: signSession({ user_id, tenant_id, ... })
   ↓
6. Seta cookie + retorna user data
   ↓
7. Cliente armazena session (via AuthProvider)
```

---

## Checklist: Setup Auth no Novo Projeto

- [ ] JWT_SECRET definida em .env
- [ ] 2 RPCs implementadas no PostgreSQL
- [ ] 3 routes de auth criadas (login, register, logout)
- [ ] pgrstRpc passada para handlers
- [ ] AuthProvider wrappeia app
- [ ] getSession() testada em server component
- [ ] Login/register testados no browser
