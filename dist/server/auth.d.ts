import type { SignOptions } from 'jsonwebtoken';
import type { PermissionMap } from '../types/auth';
export declare const SESSION_COOKIE_NAME = "session";
export type SessionPayload = {
    user_id: string;
    tenant_id: string;
    tenant_type?: string;
    perms?: PermissionMap;
    role?: string;
    login?: string;
    display_name?: string;
    is_root?: boolean;
};
export declare function signSession(payload: SessionPayload, expiresIn?: SignOptions['expiresIn']): string;
export declare function verifySession(token: string): SessionPayload | null;
export declare function getTokenFromCookies(): Promise<string | null>;
export declare function getAuthHeaderFromCookies(): Promise<string | null>;
export declare function getServiceAuthHeader(): string | null;
export declare function getSession(): Promise<SessionPayload | null>;
export declare function maskEmail(email: string): string;
export declare function getDisplayNameFromEmail(email: string): string;
export declare function isValidEmail(email: string): boolean;
export declare function getDisplayName(name: string, email: string): string;
export declare function isConfigError(message: string): boolean;
//# sourceMappingURL=auth.d.ts.map