export type SelectPopoverOption = {
    value: number;
    label: string;
};
type SelectPopoverProps = {
    value: number;
    options: SelectPopoverOption[];
    onChange: (value: number) => void;
    ariaLabel: string;
    className?: string;
};
/**
 * Substitui o `<select>` nativo — no mobile ele delega a UI pro sistema (roda do iOS, lista
 * fullscreen do Android), fora do alcance de qualquer CSS. Este popover fica no nosso controle;
 * o raio/sombra do gatilho e do painel vêm de `activeTheme`, resolvido por
 * `NEXT_PUBLIC_UI_STYLE`.
 */
export declare function SelectPopover({ value, options, onChange, ariaLabel, className, }: Readonly<SelectPopoverProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=select-popover.d.ts.map