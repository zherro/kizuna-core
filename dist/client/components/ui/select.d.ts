import * as React from 'react';
interface SelectProps {
    value?: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
}
declare const Select: ({ value, onValueChange, children }: SelectProps) => import("react/jsx-runtime").JSX.Element;
declare const SelectTrigger: React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & React.RefAttributes<HTMLButtonElement>>;
declare const SelectValue: {
    ({ children }: {
        children?: React.ReactNode;
    }): string | number | bigint | true | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | undefined;
    displayName: string;
};
declare const SelectContent: {
    ({ children }: {
        children: React.ReactNode;
    }): import("react/jsx-runtime").JSX.Element | null;
    displayName: string;
};
declare const SelectItem: {
    ({ value, children }: {
        value: string;
        children: React.ReactNode;
    }): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
//# sourceMappingURL=select.d.ts.map