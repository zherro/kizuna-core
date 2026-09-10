'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '../../../lib/utils';
const Progress = React.forwardRef(({ className, value, ...props }, ref) => (_jsx(ProgressPrimitive.Root, { ref: ref, className: cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/15', className), ...props, children: _jsx(ProgressPrimitive.Indicator, { className: "h-full w-full flex-1 bg-primary transition-all duration-500 ease-out", style: { transform: `translateX(-${100 - (value || 0)}%)` } }) })));
Progress.displayName = ProgressPrimitive.Root.displayName;
export { Progress };
//# sourceMappingURL=progress.js.map