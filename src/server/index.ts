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
  type LoginRequestBody,
  type RegisterRequestBody,
  type LogoutRequestBody,
} from './auth-handlers';

export { pgrstTable, pgrstRpc } from './postrest/conn';
export { getStorageService } from './storage-service';
export { apiError } from './api-error';
export type { PermissionMap } from '../types/auth';
