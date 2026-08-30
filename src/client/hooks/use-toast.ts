import { useCallback, useMemo } from 'react';
import { toast as sonnerToast } from 'sonner';

type ToastKind = 'success' | 'error' | 'info';

type ToastOptions = {
  duration?: number;
};

const DEFAULT_TOAST_DURATION = 3000;

function notify(kind: ToastKind, message: string, options?: ToastOptions) {
  const duration = options?.duration ?? DEFAULT_TOAST_DURATION;
  sonnerToast[kind](message, { duration });
}

export function useToast() {
  const success = useCallback(
    (message: string, options?: ToastOptions) => notify('success', message, options),
    []
  );
  const error = useCallback(
    (message: string, options?: ToastOptions) => notify('error', message, options),
    []
  );
  const info = useCallback(
    (message: string, options?: ToastOptions) => notify('info', message, options),
    []
  );

  return useMemo(
    () => ({
      success,
      error,
      info,
    }),
    [error, info, success]
  );
}
