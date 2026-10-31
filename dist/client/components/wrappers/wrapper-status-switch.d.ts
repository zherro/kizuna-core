type WrapperStatusSwitchProps = {
    checked: boolean;
    onToggle: (nextChecked: boolean) => Promise<void> | void;
    activeLabel?: string;
    inactiveLabel?: string;
    disabled?: boolean;
    className?: string;
};
export declare function WrapperStatusSwitch({ checked, onToggle, activeLabel, inactiveLabel, disabled, className, }: Readonly<WrapperStatusSwitchProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=wrapper-status-switch.d.ts.map