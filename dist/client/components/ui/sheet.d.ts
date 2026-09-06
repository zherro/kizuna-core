import * as React from 'react';
interface SheetProps {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}
declare const Sheet: ({ children, open: controlledOpen, onOpenChange }: SheetProps) => import("react/jsx-runtime").JSX.Element;
declare const SheetTrigger: React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
} & React.RefAttributes<HTMLButtonElement>>;
interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
    side?: 'top' | 'right' | 'bottom' | 'left';
}
declare const SheetContent: React.ForwardRefExoticComponent<SheetContentProps & React.RefAttributes<HTMLDivElement>>;
declare const SheetHeader: {
    ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
declare const SheetTitle: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLHeadingElement>>;
export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle };
//# sourceMappingURL=sheet.d.ts.map