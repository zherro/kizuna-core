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
export { isOnboardingCompletedServer } from './onboarding';
export { getStorageService } from './storage-service';
export { apiError } from './api-error';
// `sendEmail` / `EmailTemplate` are NOT re-exported here on purpose — import them from
// `@kizuna/core/server/email` so a project that doesn't send email never pulls `nodemailer`.
export type { PermissionMap } from '../types/auth';

export { checkKizunaEnv, type EnvCheck, type MissingEnv } from '../lib/env-guard';
