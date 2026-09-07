// EXEMPLO — reescreva. Home pública do seu app.
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold">Kizuna</h1>
      <p className="text-lg opacity-80">
        Casca base materializada. Edite <code>app/page.tsx</code> e comece o seu app.
      </p>
      <div className="flex gap-4">
        <Link href="/login" className="rounded-md border px-4 py-2">Entrar</Link>
        <Link href="/registre-se" className="rounded-md border px-4 py-2">Criar conta</Link>
        <Link href="/painel" className="rounded-md border px-4 py-2">Painel</Link>
      </div>
    </main>
  );
}
