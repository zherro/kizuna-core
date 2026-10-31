import { type ReactNode } from 'react';
type ModalPanelProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    icon?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    footerFixed?: boolean;
    headerFixed?: boolean;
    /**
     * Wide variant: panel takes at least 90% of the viewport width, and drops to
     * true fullscreen below a 500px viewport. Default keeps the `sm:max-w-lg` cap.
     */
    wide?: boolean;
    /**
     * When `false`, the panel never closes on its own: a backdrop click is
     * ignored and ESC does nothing. Only the explicit X button (and whatever the
     * parent renders in `footer`) call `onClose`, so the parent can guard against
     * discarding unsaved changes. Default `true` — the original click-outside /
     * ESC-to-close behavior, unchanged for every existing caller.
     */
    dismissible?: boolean;
};
/**
 * Side panel that slides in from the right — same shape as shadcn's Sheet
 * (used e.g. by the ausencias-style reference page), rebuilt without a radix
 * dependency: a fixed backdrop + a fixed `inset-y-0 right-0` panel, full
 * width on mobile and capped at `sm:max-w-lg`, sliding in via a plain
 * transform transition.
 */
export declare function ModalPanel({ open, onClose, title, description, icon, children, footer, footerFixed, headerFixed, wide, dismissible, }: Readonly<ModalPanelProps>): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=modal-panel.d.ts.map