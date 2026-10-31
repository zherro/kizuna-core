import type { LucideIcon } from 'lucide-react';
type BsButtonVariant = 'default' | 'outline';
type BsButtonProps = {
    label: string;
    variant?: BsButtonVariant;
    icon?: LucideIcon;
    onClick?: () => void;
    disabled?: boolean;
};
export declare function BsButton({ label, variant, icon: Icon, onClick, disabled, }: Readonly<BsButtonProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=bs-button.d.ts.map