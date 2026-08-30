/** One row from auth.group_permissions, keyed by resource (e.g. 'categorias', 'aprovacoes'). */
export type PermissionActions = { view?: boolean; edit?: boolean; delete?: boolean };
export type PermissionMap = Record<string, PermissionActions>;

export type UserSession = {
  user_id: string;
  email?: string;
  name?: string;
  tenant_id: string;
  tenant_type?: string;
  role: string;
  login?: string;
  display_name?: string;
  is_root?: boolean;
  perms?: PermissionMap;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
};

export type AuthContext = {
  user: UserSession | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserSession | null) => void;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterData = {
  email: string;
  password: string;
  name: string;
  tenant_id?: string;
};

export type AuthResponse = {
  user: UserSession;
  message?: string;
};

export type PermissionCheck = {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  tenant_id: string;
  user_role: string;
};

export type PermissionResult = {
  allowed: boolean;
  reason?: string;
};
