import Link from "next/link";

export default function NotFound() {
  return (
    <main className="brand-gradient-soft flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <Link href="/" className="font-semibold text-purple-700 hover:underline">Voltar ao início</Link>
    </main>
  );
}
