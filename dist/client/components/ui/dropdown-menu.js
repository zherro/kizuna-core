'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
export function DropdownMenu(props) {
    return _jsx(DropdownMenuPrimitive.Root, { ...props });
}
export function DropdownMenuTrigger(props) {
    return _jsx(DropdownMenuPrimitive.Trigger, { ...props });
}
export function DropdownMenuContent({ className, sideOffset = 6, ...props }) {
    return (_jsx(DropdownMenuPrimitive.Portal, { children: _jsx(DropdownMenuPrimitive.Content, { sideOffset: sideOffset, className: cn('z-50 min-w-44 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md', className), ...props }) }));
}
export function DropdownMenuLabel({ className, ...props }) {
    return (_jsx(DropdownMenuPrimitive.Label, { className: cn('px-2 py-1 text-xs font-semibold', className), ...props }));
}
export function DropdownMenuSeparator({ className, ...props }) {
    return (_jsx(DropdownMenuPrimitive.Separator, { className: cn('my-1 h-px bg-border', className), ...props }));
}
export function DropdownMenuRadioGroup(props) {
    return _jsx(DropdownMenuPrimitive.RadioGroup, { ...props });
}
export function DropdownMenuRadioItem({ className, children, ...props }) {
    return (_jsxs(DropdownMenuPrimitive.RadioItem, { className: cn('relative flex cursor-default select-none items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground', className), ...props, children: [_jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: _jsx(DropdownMenuPrimitive.ItemIndicator, { children: _jsx(Check, { className: "h-4 w-4" }) }) }), children] }));
}
export function DropdownMenuItem({ className, inset, ...props }) {
    return (_jsx(DropdownMenuPrimitive.Item, { className: cn('relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground', inset && 'pl-8', className), ...props }));
}
export function DropdownMenuSubTrigger({ className, inset, children, ...props }) {
    return (_jsxs(DropdownMenuPrimitive.SubTrigger, { className: cn('flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground', inset && 'pl-8', className), ...props, children: [children, _jsx(ChevronRight, { className: "ml-auto h-4 w-4" })] }));
}
export function DropdownMenuSubContent({ className, ...props }) {
    return (_jsx(DropdownMenuPrimitive.SubContent, { className: cn('z-50 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md', className), ...props }));
}
//# sourceMappingURL=dropdown-menu.js.map