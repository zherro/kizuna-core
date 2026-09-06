import type { ReactNode } from 'react';
import { type ButtonProps } from '../ui/button';
type PageHeaderAction = {
    href: string;
    label: string;
    icon?: ReactNode;
    variant?: ButtonProps['variant'];
    size?: ButtonProps['size'];
};
type PageHeaderWrapperProps = {
    badge?: string;
    title: string;
    description?: string;
    action?: PageHeaderAction;
    className?: string;
};
export declare function PageHeaderWrapper({ badge, title, description, action, className, }: Readonly<PageHeaderWrapperProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=page-header-wrapper.d.ts.map