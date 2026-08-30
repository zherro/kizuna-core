# kizuna-core: Auth Client Setup

## Componentes Fornecidos

### 1. **AuthProvider**

```typescript
import { AuthProvider } from '@kizuna/core';

export default function RootLayout({ children }) {
  // Get session from server
  const session = await getSession();

  return (
    <html>
      <body>
        <AuthProvider initialUser={session}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 2. **useAuth Hook**

```typescript
'use client';
import { useAuth } from '@kizuna/core';

export function UserMenu() {
  const { user, logout, setUser } = useAuth();

  if (!user) return null;

  return (
    <div>
      <p>Bem-vindo, {user.name}</p>
      <button onClick={logout}>Sair</button>
    </div>
  );
}
```

### 3. **LoginPageContent**

Componente template sem dependências de UI (use seu próprio Button, Input, etc).

```typescript
// src/app/login/page.tsx
'use client';
import { LoginPageContent } from '@kizuna/core';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoginPageContent redirectTo="/painel" />
    </div>
  );
}
```

### 4. **RegisterPageContent**

Similar ao LoginPageContent, reutilizável.

```typescript
// src/app/registre-se/page.tsx
'use client';
import { RegisterPageContent } from '@kizuna/core';

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <RegisterPageContent redirectTo="/painel" />
    </div>
  );
}
```

### 5. **ProtectedRoute**

Proteção de rotas client-side.

```typescript
'use client';
import { ProtectedRoute } from '@kizuna/core';

export function AdminPage() {
  return (
    <ProtectedRoute requiredPermission="admin" requiredAction="edit">
      <div>Conteúdo só para admins com edit</div>
    </ProtectedRoute>
  );
}
```

---

## AuthUser Type

```typescript
interface AuthUser {
  user_id: string;
  display_name?: string;
  login?: string;
  tenant_type?: string;
  perms?: PermissionMap;

  // Computed
  name: string; // display_name ou login normalizado
  subtitle: string;
  initials: string; // AA (primeiras letras)
  canManageCatalog: boolean; // tenant_type === 'ADMIN'
  hasPerm: (resource, action?) => bool; // Verifica permissão no JWT
}
```

---

## Setup Passo a Passo

### 1. Envolver App com AuthProvider

**`src/app/layout.tsx`:**

```typescript
import { AuthProvider } from '@kizuna/core';
import { getSession } from '@kizuna/core/server';

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html>
      <body>
        <AuthProvider initialUser={session}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 2. Criar Rotas de Auth

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

### 3. Criar Páginas de Login/Register

**`src/app/login/page.tsx`:**

```typescript
'use client';
import { LoginPageContent } from '@kizuna/core';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <LoginPageContent />
    </div>
  );
}
```

**`src/app/registre-se/page.tsx`:**

```typescript
'use client';
import { RegisterPageContent } from '@kizuna/core';

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <RegisterPageContent />
    </div>
  );
}
```

### 4. Proteger Rotas

**`src/app/painel/layout.tsx`:**

```typescript
import { ProtectedRoute } from '@kizuna/core/client';

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div>{children}</div>
    </ProtectedRoute>
  );
}
```

### 5. Usar useAuth em Componentes

```typescript
'use client';
import { useAuth } from '@kizuna/core';

export function UserProfile() {
  const { user, logout } = useAuth();

  if (!user) return <p>Carregando...</p>;

  return (
    <div>
      <p>Usuário: {user.name}</p>
      <p>Email: {user.login}</p>
      <p>Tenant: {user.user_id}</p>
      <p>Initials: {user.initials}</p>
      {user.canManageCatalog && <p>Admin</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## Permission Checks

```typescript
const { user } = useAuth();

// Verificar permissão
if (user?.hasPerm('services', 'edit')) {
  // Mostrar botão editar
}

if (user?.hasPerm('services')) {
  // Padrão: 'view'
}

// Usar em ProtectedRoute
<ProtectedRoute
  requiredPermission="services"
  requiredAction="delete"
>
  <DeleteButton />
</ProtectedRoute>
```

---

## Customização

### Estilizar LoginPageContent

LoginPageContent é apenas um template. Novo projeto pode:

1. **Renderizar com CSS próprio:**

   ```typescript
   <LoginPageContent />
   // Adicionar CSS em globals.css
   ```

2. **Criar versão customizada:**

   ```typescript
   // src/components/auth/custom-login.tsx
   'use client';
   import { useAuth, type PublicSession } from '@kizuna/core';
   import { MyButton } from '@/components/ui/my-button';

   export function CustomLogin() {
     // Implementação customizada
   }
   ```

3. **Importar FormComponent completo do foco-total** e adaptar

---

## Checklist: Setup Auth Client

- [ ] AuthProvider wrappeia app no layout root
- [ ] 3 rotas de auth implementadas (login, register, logout)
- [ ] Páginas de login/register criadas
- [ ] useAuth testada em browser
- [ ] Logout funciona (limpa cookie + redireciona)
- [ ] ProtectedRoute protege /painel
- [ ] Permissões verificam corretamente
