export {
  SESSION_COOKIE_NAME,
  signSession,
  verifySession,
  getTokenFromCookies,
  getAuthHeaderFromCookies,
  getServiceAuthHeader,
  getSession,
  sessionCookieOptions,
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
  createOAuthStartHandler,
  createOAuthCallbackHandler,
  createAuthProvidersHandler,
} from './oauth-handlers';
export { listEnabledOAuthProviders } from './oauth/providers';
export type { OAuthProvider, OAuthProfile } from './oauth/types';
export { sanitizeReturnTo } from './app-url';
export {
  createOtpRequestHandler,
  createOtpVerifyHandler,
  type OtpRequestBody,
  type OtpVerifyBody,
} from './otp-handlers';
export { registerOtpProvider, isPhoneLoginEnabled, logOtpProvider } from './otp/registry';
export type { OtpProvider, OtpPayload, OtpSendResult, OtpConfig, OtpPurpose } from './otp/types';
export { normalizeBrMobile, maskPhone } from './otp/phone';
export {
  getAccountFacts,
  getAccountStatus,
  canDoServer,
  createAccountLevelHandler,
  type AccountLevelsSetup,
} from './account-levels';

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
export { handleSearchChat } from './search';
export { apiError } from './api-error';
export { isCaptchaEnabled, verifyCaptcha, type VerifyCaptchaResult } from './captcha';
// `sendEmail` / `EmailTemplate` are NOT re-exported here on purpose — import them from
// `@kizuna/core/server/email` so a project that doesn't send email never pulls `nodemailer`.
export type { PermissionMap } from '../types/auth';

export { checkKizunaEnv, type EnvCheck, type MissingEnv } from '../lib/env-guard';

export {
  checkLockout,
  recordLoginFailure,
  clearLoginFailures,
  LOCKOUT_TIERS_ENV,
} from './login-lockout';

export {
  getSeoSitemapCacheSeconds,
  SEO_SITEMAP_CACHE_ENV,
  getSeoSitemapPageSize,
  SEO_SITEMAP_PAGE_SIZE_ENV,
} from './seo-config';
