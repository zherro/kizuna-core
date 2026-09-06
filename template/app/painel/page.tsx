// EXEMPLO — reescreva. Dashboard inicial do painel (rota `/painel`).
export default function PainelHome() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Painel</h1>
      <p>Telas de plugin resolvem em <code>/painel/[[...kizuna]]</code> via o registry.</p>
    </main>
  );
}
