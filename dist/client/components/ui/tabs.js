import { jsx as _jsx } from "react/jsx-runtime";
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../../lib/utils';
export function Tabs({ className, ...props }) {
    return _jsx(TabsPrimitive.Root, { className: cn('w-full', className), ...props });
}
export function TabsList({ className, ...props }) {
    return (_jsx(TabsPrimitive.List, { className: cn('inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground', className), ...props }));
}
export function TabsTrigger({ className, ...props }) {
    return (_jsx(TabsPrimitive.Trigger, { className: cn('inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm', className), ...props }));
}
export function TabsContent({ className, ...props }) {
    return (_jsx(TabsPrimitive.Content, { className: cn('mt-4 ring-offset-background focus-visible:outline-none', className), ...props }));
}
//# sourceMappingURL=tabs.js.map