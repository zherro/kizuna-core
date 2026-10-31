import { type PublicSession } from '../providers/auth-provider';
interface RegisterPageProps {
    onRegisterSuccess?: (user: PublicSession) => void;
    /** Where to send the user after a successful registration (and if already authenticated). */
    redirectTo?: string;
    /** Endpoint that accepts `{ name, email, password, acceptTerms }`. */
    registerEndpoint?: string;
    /** Link to the login screen. Pass `null` to hide the "already have an account" line. */
    loginHref?: string | null;
    /** Link to the terms-of-use page shown next to the accept checkbox. */
    termsHref?: string;
}
export declare function RegisterPageContent({ onRegisterSuccess, redirectTo, registerEndpoint, loginHref, termsHref, }: RegisterPageProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=register-page.d.ts.map