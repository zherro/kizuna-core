import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Tela de bloqueio: renderizada pelo layout raiz quando `checkKizunaEnv()` falha.
// Server component puro (sem estado) — some assim que o .env for preenchido.
export function SetupRequiredScreen({ missing }) {
    return (_jsx("div", { style: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            background: '#0b0b0c',
            color: '#e7e7ea',
        }, children: _jsxs("main", { style: { maxWidth: 560, width: '100%' }, children: [_jsx("p", { style: {
                        fontSize: 12,
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: '#8a8a94',
                        margin: 0,
                    }, children: "kizuna-core" }), _jsx("h1", { style: { fontSize: 26, fontWeight: 600, margin: '10px 0 6px' }, children: "Configura\u00E7\u00E3o necess\u00E1ria" }), _jsxs("p", { style: { color: '#a8a8b2', lineHeight: 1.6, marginTop: 0 }, children: ["Este projeto exige ", _jsx("strong", { children: "PostgREST" }), " e um segredo de JWT. Defina as vari\u00E1veis abaixo no arquivo", ' ', _jsx("code", { style: { background: '#1c1c20', padding: '2px 6px', borderRadius: 4 }, children: ".env" }), ' ', "(copie de", ' ', _jsx("code", { style: { background: '#1c1c20', padding: '2px 6px', borderRadius: 4 }, children: ".env.example" }), ") e recarregue."] }), _jsx("ul", { style: { listStyle: 'none', padding: 0, margin: '20px 0 0', display: 'grid', gap: 12 }, children: missing.map((m) => (_jsxs("li", { style: {
                            border: '1px solid #26262c',
                            borderRadius: 10,
                            padding: '12px 14px',
                            background: '#141417',
                        }, children: [_jsx("code", { style: { fontSize: 14, fontWeight: 700, color: '#f4b8b8' }, children: m.name }), _jsx("p", { style: { margin: '6px 0 0', fontSize: 13, color: '#9a9aa4', lineHeight: 1.5 }, children: m.hint })] }, m.name))) }), _jsx("pre", { style: {
                        marginTop: 20,
                        background: '#141417',
                        border: '1px solid #26262c',
                        borderRadius: 10,
                        padding: 14,
                        fontSize: 13,
                        color: '#c8c8d0',
                        overflowX: 'auto',
                    }, children: `cp .env.example .env
# preencha:
${missing.map((m) => `${m.name}=`).join('\n')}` })] }) }));
}
//# sourceMappingURL=setup-required-screen.js.map