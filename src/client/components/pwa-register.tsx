'use client';

import { useEffect } from 'react';

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
export function PwaRegister({
  swUrl = '/sw.js',
  migrationKey = 'sw-migration-v1',
}: PwaRegisterProps = {}) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1';

    const clearAllCaches = async () => {
      if (!('caches' in window)) return;
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    };

    const unregisterAllServiceWorkers = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    };

    const migrateOnce = async () => {
      try {
        const migrated = window.localStorage.getItem(migrationKey) === '1';
        if (migrated) return;
        await unregisterAllServiceWorkers();
        await clearAllCaches();
        window.localStorage.setItem(migrationKey, '1');
      } catch {
        // Silent fallback.
      }
    };

    const register = async () => {
      try {
        await migrateOnce();

        if (isLocalhost) {
          await unregisterAllServiceWorkers();
          return;
        }

        await navigator.serviceWorker.register(swUrl, {
          updateViaCache: 'none',
        });
      } catch {
        // Silent fallback: app keeps working without offline cache.
      }
    };

    register();
  }, [swUrl, migrationKey]);

  return null;
}
