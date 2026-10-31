type ConfirmDialogProps = {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};
export declare function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, loading, onConfirm, onCancel, }: Readonly<ConfirmDialogProps>): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=confirm-dialog.d.ts.map