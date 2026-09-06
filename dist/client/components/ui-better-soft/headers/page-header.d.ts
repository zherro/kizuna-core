import type { ReactNode } from 'react';
type PageHeaderProps = {
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
};
/**
 * List/manager page header: eyebrow + title + description on the left,
 * actions (back link, primary action…) on the right, laid out on the
 * app's 12-col `Grid` so it stacks cleanly at every breakpoint instead of
 * only flipping once at `md`.
 */
export declare function PageHeader({ eyebrow, title, description, actions, className, }: Readonly<PageHeaderProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=page-header.d.ts.map