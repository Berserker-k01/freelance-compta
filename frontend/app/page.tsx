import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <main className="flex flex-col items-center gap-8 text-center px-4">
        <h1 className="text-6xl font-bold tracking-tighter text-blue-800 dark:text-blue-400">
          Auditia
        </h1>
        <p className="text-2xl text-slate-600 dark:text-slate-300 max-w-lg">
          La solution de comptabilité Cloud-Native intelligente pour le Togo de 2026.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg" className="bg-blue-700 hover:bg-blue-800">
            <Link href="/dashboard">Accéder au Dashboard</Link>
          </Button>
          <Button variant="outline" size="lg">
             Documentation
          </Button>
        </div>
      </main>
      <footer className="absolute bottom-4 text-slate-400 text-sm">
        &copy; 2026 Auditia Inc. - Tous droits réservés.
      </footer>
    </div>
  );
}
