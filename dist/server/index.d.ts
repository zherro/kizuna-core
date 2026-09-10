export { SESSION_COOKIE_NAME, signSession, verifySession, getTokenFromCookies, getAuthHeaderFromCookies, getServiceAuthHeader, getSession, maskEmail, getDisplayNameFromEmail, isValidEmail, getDisplayName, isConfigError, type SessionPayload, } from './auth';
export { createLoginHandler, createRegisterHandler, createLogoutHandler, createMeHandler, type LoginRequestBody, type RegisterRequestBody, type LogoutRequestBody, } from './auth-handlers';
export { listResource, createResource, getResourceById, updateResource, deleteResource, serverFetchResource, isRpcResource, executeRpcResource, } from './postgrest-crud';
export { pgrstTable, pgrstRpc } from './postrest/conn';
export { isOnboardingCompletedServer } from './onboarding';
export { getStorageService } from './storage-service';
export { apiError } from './api-error';
export { isCaptchaEnabled, verifyCaptcha, type VerifyCaptchaResult } from './captcha';
export type { PermissionMap } from '../types/auth';
export { checkKizunaEnv, type EnvCheck, type MissingEnv } from '../lib/env-guard';
export { checkLockout, recordLoginFailure, clearLoginFailures, LOCKOUT_TIERS_ENV, } from './login-lockout';
//# sourceMappingURL=index.d.ts.map