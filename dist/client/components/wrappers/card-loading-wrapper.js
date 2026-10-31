import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
export function CardLoadingWrapper({ title, description, className, }) {
    return (_jsxs(Card, { className: className, children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: title }), _jsx(CardDescription, { children: description })] }), _jsx(CardContent, {})] }));
}
//# sourceMappingURL=card-loading-wrapper.js.map