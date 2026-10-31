'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
const Slider = React.forwardRef(({ value = [0, 100], onValueChange, min = 0, max = 100, step = 1 }, ref) => {
    const [localValue, setLocalValue] = React.useState(value);
    const handleMinChange = (e) => {
        const newMin = Math.min(Number(e.target.value), localValue[1]);
        const newValue = [newMin, localValue[1]];
        setLocalValue(newValue);
        onValueChange?.(newValue);
    };
    const handleMaxChange = (e) => {
        const newMax = Math.max(Number(e.target.value), localValue[0]);
        const newValue = [localValue[0], newMax];
        setLocalValue(newValue);
        onValueChange?.(newValue);
    };
    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);
    return (_jsx("div", { ref: ref, className: "flex flex-col gap-4", children: _jsxs("div", { className: "relative h-2 bg-secondary rounded-full", children: [_jsx("input", { type: "range", min: min, max: max, step: step, value: localValue[0], onChange: handleMinChange, className: "pointer-events-none absolute top-1/2 h-2 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0" }), _jsx("input", { type: "range", min: min, max: max, step: step, value: localValue[1], onChange: handleMaxChange, className: "pointer-events-none absolute top-1/2 h-2 w-full -translate-y-1/2 appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0" })] }) }));
});
Slider.displayName = 'Slider';
export { Slider };
//# sourceMappingURL=slider.js.map