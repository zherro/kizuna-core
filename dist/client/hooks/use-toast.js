import { useCallback, useMemo } from 'react';
import { toast as sonnerToast } from 'sonner';
const DEFAULT_TOAST_DURATION = 3000;
function notify(kind, message, options) {
    const duration = options?.duration ?? DEFAULT_TOAST_DURATION;
    sonnerToast[kind](message, { duration });
}
export function useToast() {
    const success = useCallback((message, options) => notify('success', message, options), []);
    const error = useCallback((message, options) => notify('error', message, options), []);
    const info = useCallback((message, options) => notify('info', message, options), []);
    return useMemo(() => ({
        success,
        error,
        info,
    }), [error, info, success]);
}
//# sourceMappingURL=use-toast.js.map