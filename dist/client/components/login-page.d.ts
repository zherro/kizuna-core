import { type PublicSession } from '../providers/auth-provider';
interface LoginPageProps {
    onLoginSuccess?: (user: PublicSession) => void;
    /** Where to send the user after a successful login (and if already authenticated). */
    redirectTo?: string;
    /** Endpoint that accepts `{ email, password }` and returns `{ message, user }`. */
    loginEndpoint?: string;
    /** Link to the registration screen. Pass `null` to hide the "sign up" line. */
    registerHref?: string | null;
}
export declare function LoginPageContent({ onLoginSuccess, redirectTo, loginEndpoint, registerHref, }: LoginPageProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=login-page.d.ts.map