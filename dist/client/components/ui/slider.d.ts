import * as React from 'react';
export interface SliderProps {
    value?: [number, number];
    onValueChange?: (value: [number, number]) => void;
    min?: number;
    max?: number;
    step?: number;
}
declare const Slider: React.ForwardRefExoticComponent<SliderProps & React.RefAttributes<HTMLDivElement>>;
export { Slider };
//# sourceMappingURL=slider.d.ts.map