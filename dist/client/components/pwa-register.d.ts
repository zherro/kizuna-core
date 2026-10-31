export type PwaRegisterProps = {
    /** Path to the service worker script, e.g. `/sw.js?v=2`. */
    swUrl?: string;
    /**
     * localStorage key used to run the one-time cache/SW cleanup below exactly once. Bump it
     * (e.g. append `-v3`) whenever a breaking SW/cache change requires forcing every client
     * through the migration again.
     */
    migrationKey?: string;
};
/**
 * Registers the app's service worker, running a one-time cache/registration cleanup first
 * (guarded by `migrationKey` in localStorage) — generic across projects; both `swUrl` and
 * `migrationKey` are app-specific and must be passed in.
 */
export declare function PwaRegister({ swUrl, migrationKey, }?: PwaRegisterProps): null;
//# sourceMappingURL=pwa-register.d.ts.map