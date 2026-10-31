type ToastOptions = {
    duration?: number;
};
export declare function useToast(): {
    success: (message: string, options?: ToastOptions) => void;
    error: (message: string, options?: ToastOptions) => void;
    info: (message: string, options?: ToastOptions) => void;
};
export {};
//# sourceMappingURL=use-toast.d.ts.map