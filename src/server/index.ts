export {
  SESSION_COOKIE_NAME,
  signSession,
  verifySession,
  getTokenFromCookies,
  getAuthHeaderFromCookies,
  getServiceAuthHeader,
  getSession,
  maskEmail,
  getDisplayNameFromEmail,
  isValidEmail,
  getDisplayName,
  isConfigError,
  type SessionPayload,
} from './auth';

export {
  createLoginHandler,
  createRegisterHandler,
  createLogoutHandler,
  createMeHandler,
  type LoginRequestBody,
  type RegisterRequestBody,
  type LogoutRequestBody,
} from './auth-handlers';

export {
  listResource,
  createResource,
  getResourceById,
  updateResource,
  deleteResource,
  serverFetchResource,
  isRpcResource,
  executeRpcResource,
} from './postgrest-crud';

export { pgrstTable, pgrstRpc } from './postrest/conn';
export { getStorageService } from './storage-service';
export { apiError } from './api-error';
export type { PermissionMap } from '../types/auth';

export { checkKizunaEnv, type EnvCheck, type MissingEnv } from '../lib/env-guard';
