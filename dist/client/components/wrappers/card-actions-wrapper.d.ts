import type { ReactNode } from 'react';
type CardActionsWrapperProps = {
    children: ReactNode;
    cancelHref: string;
    action: 'create' | 'update';
    submitting: boolean;
    className?: string;
};
export declare function CardActionsWrapper({ children, cancelHref, action, submitting, className, }: Readonly<CardActionsWrapperProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=card-actions-wrapper.d.ts.map