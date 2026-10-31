import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '../../../../lib/utils';
import { Accessories } from './accessories';
const PRIMARY = 'var(--primary)';
const SOFT = 'color-mix(in oklab, var(--primary) 18%, transparent)';
const SKIN = '#f5c7a8';
const HAIR_DARK = '#3d2820';
const HAIR_GREY = '#9b9dad';
const BG = 'var(--background)';
export function MascotAvatar({ character = 'girl', width = 160, className, accessories, children, }) {
    return (_jsxs("svg", { viewBox: "0 0 160 120", width: width, className: cn('shrink-0', className), xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true, children: [_jsx(Floor, {}), _jsxs(Character, { type: character, children: [_jsx(Accessories, { items: accessories }), children] })] }));
}
export * from './accessories';
function Character({ type, children }) {
    switch (type) {
        case 'girl':
            return _jsx(Girl, { children: children });
        case 'boy':
            return _jsx(Boy, { children: children });
        case 'technician':
            return _jsx(Technician, { children: children });
        case 'old-man':
            return _jsx(OldMan, { children: children });
        case 'old-lady':
            return _jsx(OldLady, { children: children });
        case 'dog':
            return _jsx(Dog, { children: children });
        case 'cat':
            return _jsx(Cat, { children: children });
        default:
            return _jsx(Girl, { children: children });
    }
}
/* =============== Menina =============== */
function Girl({ children }) {
    return (_jsxs("g", { transform: "translate(80 60)", children: [_jsx("path", { d: "M -24 62 L -10 34 L 10 34 L 24 62 L 28 80 L -28 80 Z", fill: PRIMARY }), _jsx("rect", { x: "-5", y: "24", width: "10", height: "11", rx: "3", fill: SKIN }), _jsx("circle", { cx: "0", cy: "10", r: "18", fill: SKIN }), _jsx("path", { d: "M -18 10 Q -18 -8 0 -8 Q 18 -8 18 10 L 16 6 Q 8 0 0 0 Q -8 0 -16 6 Z", fill: HAIR_DARK }), _jsx("circle", { cx: "-20", cy: "8", r: "6", fill: HAIR_DARK }), _jsx("circle", { cx: "20", cy: "8", r: "6", fill: HAIR_DARK }), _jsxs("g", { transform: "translate(0 -18)", children: [_jsx("path", { d: "M 0 0 L -7 -5 L -7 5 Z", fill: PRIMARY }), _jsx("path", { d: "M 0 0 L 7 -5 L 7 5 Z", fill: PRIMARY }), _jsx("circle", { cx: "0", cy: "0", r: "2", fill: PRIMARY })] }), _jsx("circle", { cx: "-6", cy: "12", r: "1.6", fill: "#222" }), _jsx("circle", { cx: "6", cy: "12", r: "1.6", fill: "#222" }), _jsx("circle", { cx: "-10", cy: "17", r: "2.2", fill: "#e88a9a", opacity: "0.5" }), _jsx("circle", { cx: "10", cy: "17", r: "2.2", fill: "#e88a9a", opacity: "0.5" }), _jsx("path", { d: "M -4 19 Q 0 22 4 19", stroke: "#222", strokeWidth: "1.4", strokeLinecap: "round", fill: "none" }), children] }));
}
/* =============== Guri =============== */
function Boy({ children }) {
    return (_jsxs("g", { transform: "translate(80 60)", children: [_jsx("path", { d: "M -26 60 Q 0 32 26 60 L 28 80 L -28 80 Z", fill: PRIMARY }), _jsx("rect", { x: "-5", y: "24", width: "10", height: "11", rx: "3", fill: SKIN }), _jsx("circle", { cx: "0", cy: "10", r: "18", fill: SKIN }), _jsx("path", { d: "M -18 10 Q -18 -8 0 -8 Q 18 -8 18 10 L 16 6 Q 8 0 0 0 Q -8 0 -16 6 Z", fill: HAIR_DARK }), _jsx("circle", { cx: "-6", cy: "12", r: "1.6", fill: "#222" }), _jsx("circle", { cx: "6", cy: "12", r: "1.6", fill: "#222" }), _jsx("path", { d: "M -4 19 Q 0 22 4 19", stroke: "#222", strokeWidth: "1.4", strokeLinecap: "round", fill: "none" }), children] }));
}
/* =============== Tecnico =============== */
function Technician({ children }) {
    return (_jsxs("g", { transform: "translate(80 60)", children: [_jsx("path", { d: "M -26 60 Q 0 32 26 60 L 28 80 L -28 80 Z", fill: "#334155" }), _jsx("rect", { x: "-5", y: "24", width: "10", height: "11", rx: "3", fill: SKIN }), _jsx("circle", { cx: "0", cy: "10", r: "18", fill: SKIN }), _jsx("path", { d: "M -18 10 Q -18 -8 0 -8 Q 18 -8 18 10 L 16 6 Q 8 0 0 0 Q -8 0 -16 6 Z", fill: HAIR_DARK }), _jsx("path", { d: "M -16 -2 Q 0 -8 16 -2 L 18 2 L 16 6 L -16 6 Z", fill: PRIMARY }), _jsx("rect", { x: "-8", y: "-2", width: "16", height: "3", rx: "1", fill: BG }), _jsx("path", { d: "M 14 0 L 28 4 L 14 6 Z", fill: PRIMARY }), _jsx("circle", { cx: "-6", cy: "12", r: "3.5", fill: "#a5b4fc", opacity: "0.6", stroke: "#222", strokeWidth: "1" }), _jsx("circle", { cx: "6", cy: "12", r: "3.5", fill: "#a5b4fc", opacity: "0.6", stroke: "#222", strokeWidth: "1" }), _jsx("path", { d: "M -2.5 12 L 2.5 12", stroke: "#222", strokeWidth: "1" }), _jsx("path", { d: "M -4 19 Q 0 22 4 19", stroke: "#222", strokeWidth: "1.4", strokeLinecap: "round", fill: "none" }), children] }));
}
/* =============== Velhinho =============== */
function OldMan({ children }) {
    return (_jsxs("g", { transform: "translate(80 60)", children: [_jsx("path", { d: "M -26 60 Q 0 32 26 60 L 28 80 L -28 80 Z", fill: "#64748b" }), _jsx("rect", { x: "-5", y: "24", width: "10", height: "11", rx: "3", fill: SKIN }), _jsx("circle", { cx: "0", cy: "10", r: "18", fill: SKIN }), _jsx("path", { d: "M -18 8 Q -18 -12 0 -12 Q 18 -12 18 8 L 16 4 Q 8 -2 0 -2 Q -8 -2 -16 4 Z", fill: HAIR_GREY }), _jsx("path", { d: "M -14 -8 L -10 2 L -6 -8", stroke: HAIR_GREY, strokeWidth: "3", strokeLinecap: "round", fill: "none" }), _jsx("path", { d: "M 14 -8 L 10 2 L 6 -8", stroke: HAIR_GREY, strokeWidth: "3", strokeLinecap: "round", fill: "none" }), _jsx("circle", { cx: "-6", cy: "12", r: "3.5", fill: "none", stroke: "#222", strokeWidth: "1.2" }), _jsx("circle", { cx: "6", cy: "12", r: "3.5", fill: "none", stroke: "#222", strokeWidth: "1.2" }), _jsx("path", { d: "M -2.5 12 L 2.5 12", stroke: "#222", strokeWidth: "1.2" }), _jsx("path", { d: "M -6 22 Q 0 24 6 22", stroke: HAIR_GREY, strokeWidth: "2", strokeLinecap: "round", fill: "none" }), _jsx("path", { d: "M -4 19 Q 0 20 4 19", stroke: "#222", strokeWidth: "1.4", strokeLinecap: "round", fill: "none" }), children] }));
}
/* =============== Velhinha =============== */
function OldLady({ children }) {
    return (_jsxs("g", { transform: "translate(80 60)", children: [_jsx("path", { d: "M -24 62 L -10 34 L 10 34 L 24 62 L 28 80 L -28 80 Z", fill: "#8b5cf6" }), _jsx("rect", { x: "-5", y: "24", width: "10", height: "11", rx: "3", fill: SKIN }), _jsx("circle", { cx: "0", cy: "10", r: "18", fill: SKIN }), _jsx("circle", { cx: "0", cy: "-14", r: "10", fill: HAIR_GREY }), _jsx("path", { d: "M -18 10 Q -18 -8 0 -8 Q 18 -8 18 10 L 16 6 Q 8 0 0 0 Q -8 0 -16 6 Z", fill: HAIR_GREY }), _jsx("circle", { cx: "-6", cy: "12", r: "3.5", fill: "none", stroke: "#222", strokeWidth: "1.2" }), _jsx("circle", { cx: "6", cy: "12", r: "3.5", fill: "none", stroke: "#222", strokeWidth: "1.2" }), _jsx("path", { d: "M -2.5 12 L 2.5 12", stroke: "#222", strokeWidth: "1.2" }), _jsx("circle", { cx: "-6", cy: "12", r: "1", fill: "#222" }), _jsx("circle", { cx: "6", cy: "12", r: "1", fill: "#222" }), _jsx("path", { d: "M -4 19 Q 0 22 4 19", stroke: "#222", strokeWidth: "1.4", strokeLinecap: "round", fill: "none" }), children] }));
}
/* =============== Cachorrinho =============== */
function Dog({ children }) {
    return (_jsxs("g", { transform: "translate(80 60)", children: [_jsx("ellipse", { cx: "0", cy: "58", rx: "26", ry: "18", fill: "#d97706" }), _jsx("rect", { x: "-18", y: "68", width: "8", height: "12", rx: "4", fill: "#d97706" }), _jsx("rect", { x: "10", y: "68", width: "8", height: "12", rx: "4", fill: "#d97706" }), _jsx("circle", { cx: "0", cy: "32", r: "18", fill: "#d97706" }), _jsx("path", { d: "M -14 22 L -24 8 L -8 18 Z", fill: "#b45309" }), _jsx("path", { d: "M 14 22 L 24 8 L 8 18 Z", fill: "#b45309" }), _jsx("ellipse", { cx: "0", cy: "38", rx: "9", ry: "7", fill: "#fde68a" }), _jsx("circle", { cx: "0", cy: "35", r: "3", fill: "#222" }), _jsx("circle", { cx: "-6", cy: "30", r: "2.2", fill: "#222" }), _jsx("circle", { cx: "6", cy: "30", r: "2.2", fill: "#222" }), _jsx("circle", { cx: "-10", cy: "35", r: "1.8", fill: "#e88a9a", opacity: "0.5" }), _jsx("circle", { cx: "10", cy: "35", r: "1.8", fill: "#e88a9a", opacity: "0.5" }), _jsx("path", { d: "M -3 42 Q 0 44 3 42", stroke: "#222", strokeWidth: "1.4", strokeLinecap: "round", fill: "none" }), _jsx("rect", { x: "-9", y: "48", width: "18", height: "5", rx: "2", fill: PRIMARY }), _jsx("path", { d: "M 24 56 Q 40 48 36 36", stroke: "#d97706", strokeWidth: "4", strokeLinecap: "round", fill: "none" }), children] }));
}
function Floor() {
    return _jsx("ellipse", { cx: "80", cy: "118", rx: "60", ry: "4", fill: SOFT });
}
/* =============== Gatinho =============== */
function Cat({ children }) {
    const FUR = '#6b7280';
    const FUR_DARK = '#4b5563';
    const BELLY = '#e5e7eb';
    return (_jsxs("g", { transform: "translate(80 60)", children: [_jsx("ellipse", { cx: "0", cy: "58", rx: "24", ry: "17", fill: FUR }), _jsx("ellipse", { cx: "0", cy: "62", rx: "14", ry: "10", fill: BELLY }), _jsx("rect", { x: "-16", y: "68", width: "7", height: "12", rx: "3.5", fill: FUR }), _jsx("rect", { x: "9", y: "68", width: "7", height: "12", rx: "3.5", fill: FUR }), _jsx("circle", { cx: "0", cy: "32", r: "18", fill: FUR }), _jsx("path", { d: "M -16 22 L -20 6 L -6 16 Z", fill: FUR }), _jsx("path", { d: "M 16 22 L 20 6 L 6 16 Z", fill: FUR }), _jsx("path", { d: "M -14 20 L -16 12 L -9 17 Z", fill: "#f9a8d4" }), _jsx("path", { d: "M 14 20 L 16 12 L 9 17 Z", fill: "#f9a8d4" }), _jsx("ellipse", { cx: "-6", cy: "30", rx: "2.4", ry: "3", fill: "#1f2937" }), _jsx("ellipse", { cx: "6", cy: "30", rx: "2.4", ry: "3", fill: "#1f2937" }), _jsx("circle", { cx: "-6", cy: "29", r: "0.8", fill: "#fff" }), _jsx("circle", { cx: "6", cy: "29", r: "0.8", fill: "#fff" }), _jsx("path", { d: "M -2 36 L 2 36 L 0 38 Z", fill: "#f9a8d4" }), _jsx("path", { d: "M 0 38 Q -2 41 -4 40 M 0 38 Q 2 41 4 40", stroke: "#1f2937", strokeWidth: "1.2", strokeLinecap: "round", fill: "none" }), _jsx("path", { d: "M -8 37 L -16 35 M -8 39 L -16 40", stroke: FUR_DARK, strokeWidth: "0.8", strokeLinecap: "round" }), _jsx("path", { d: "M 8 37 L 16 35 M 8 39 L 16 40", stroke: FUR_DARK, strokeWidth: "0.8", strokeLinecap: "round" }), _jsx("rect", { x: "-9", y: "48", width: "18", height: "4", rx: "2", fill: PRIMARY }), _jsx("circle", { cx: "0", cy: "53", r: "1.6", fill: PRIMARY }), _jsx("path", { d: "M -24 58 Q -40 52 -34 38", stroke: FUR, strokeWidth: "5", strokeLinecap: "round", fill: "none" }), children] }));
}
//# sourceMappingURL=avatar.js.map