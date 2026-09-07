import type { MissingEnv } from '../../lib/env-guard';

// Tela de bloqueio: renderizada pelo layout raiz quando `checkKizunaEnv()` falha.
// Server component puro (sem estado) — some assim que o .env for preenchido.

export function SetupRequiredScreen({ missing }: { missing: MissingEnv[] }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        background: '#0b0b0c',
        color: '#e7e7ea',
      }}
    >
      <main style={{ maxWidth: 560, width: '100%' }}>
        <p style={{ fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#8a8a94', margin: 0 }}>
          kizuna-core
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: '10px 0 6px' }}>Configuração necessária</h1>
        <p style={{ color: '#a8a8b2', lineHeight: 1.6, marginTop: 0 }}>
          Este projeto exige <strong>PostgREST</strong> e um segredo de JWT. Defina as variáveis
          abaixo no arquivo <code style={{ background: '#1c1c20', padding: '2px 6px', borderRadius: 4 }}>.env</code>{' '}
          (copie de <code style={{ background: '#1c1c20', padding: '2px 6px', borderRadius: 4 }}>.env.example</code>) e recarregue.
        </p>

        <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0', display: 'grid', gap: 12 }}>
          {missing.map((m) => (
            <li
              key={m.name}
              style={{ border: '1px solid #26262c', borderRadius: 10, padding: '12px 14px', background: '#141417' }}
            >
              <code style={{ fontSize: 14, fontWeight: 700, color: '#f4b8b8' }}>{m.name}</code>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9a9aa4', lineHeight: 1.5 }}>{m.hint}</p>
            </li>
          ))}
        </ul>

        <pre
          style={{
            marginTop: 20,
            background: '#141417',
            border: '1px solid #26262c',
            borderRadius: 10,
            padding: 14,
            fontSize: 13,
            color: '#c8c8d0',
            overflowX: 'auto',
          }}
        >
{`cp .env.example .env
# preencha:
${missing.map((m) => `${m.name}=`).join('\n')}`}
        </pre>
      </main>
    </div>
  );
}
