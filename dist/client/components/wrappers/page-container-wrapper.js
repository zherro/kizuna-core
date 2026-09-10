import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../../lib/utils';
const MAX_WIDTH_CLASS = {
    form: 'max-w-[1100px]',
    wide: 'max-w-[1500px]',
};
export function PageContainerWrapper({ children, maxWidth = 'form', className, }) {
    return (_jsx("div", { className: cn('mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 md:px-6', MAX_WIDTH_CLASS[maxWidth], className), children: children }));
}
//# sourceMappingURL=page-container-wrapper.js.map