import * as React from 'react';
type AccordionProps = {
    type?: 'single' | 'multiple';
    collapsible?: boolean;
    defaultValue?: string | string[];
    className?: string;
    children: React.ReactNode;
};
export declare function Accordion({ type, collapsible, defaultValue, className, children, }: AccordionProps): import("react/jsx-runtime").JSX.Element;
export declare function AccordionItem({ value, className, children, }: {
    value: string;
    className?: string;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function AccordionTrigger({ className, children, }: {
    className?: string;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function AccordionContent({ className, children, }: {
    className?: string;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=accordion.d.ts.map