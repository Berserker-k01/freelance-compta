import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Download, Monitor, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#070b14] text-slate-200 selection:bg-blue-500/30 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#111823]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">A</div>
          <span className="text-xl font-extrabold text-white tracking-tight">Auditia</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
          <a href="#download" className="hover:text-white transition-colors">Télécharger</a>
          <Link href="/login" className="hover:text-blue-400 transition-colors">Espace Client</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            <Link href="/register">S'inscrire</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center text-center px-4 py-20 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-0 w-[1000px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold mb-4">
            <Zap className="w-4 h-4" /> Auditia Cloud & Desktop 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white leading-tight">
            La comptabilité SYSCOHADA <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">propulsée par l'Intelligence Artificielle.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Générez vos liasses fiscales parfaites en un clic. Sécurisez vos données financières en environnement Air-Gapped. Conçu pour les cabinets d'expertise en Afrique.
          </p>

          <div id="download" className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button size="lg" className="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] w-full sm:w-auto overflow-hidden group">
              <Monitor className="mr-2 w-6 h-6 group-hover:scale-110 transition-transform" />
              Télécharger Windows (.exe)
            </Button>
            <Button variant="outline" size="lg" asChild className="h-14 px-8 text-lg border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white w-full sm:w-auto">
              <Link href="/login">Accéder à la version Web</Link>
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-4 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Vos données ne quittent jamais l'environnement de sécurité.
          </p>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="w-full max-w-6xl mx-auto px-6 py-24 relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 text-white tracking-tight">L'Excellence pour les Cabinets d'Expertise</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-blue-500/5 hover:border-blue-500/30 transition-all duration-300 group">
            <div className="w-14 h-14 bg-blue-500/10 flex items-center justify-center rounded-2xl mb-6 shadow-[0_0_15px_rgba(37,99,235,0.1)] group-hover:scale-110 transition-transform">
              <Monitor className="text-blue-400 w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">SaaS Multi-Plateformes</h3>
            <p className="text-slate-400 leading-relaxed">Travaillez depuis n'importe où via notre Cloud sécurisé, ou installez notre application native et rapide sur votre bureau Windows.</p>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all duration-300 group">
            <div className="w-14 h-14 bg-indigo-500/10 flex items-center justify-center rounded-2xl mb-6 shadow-[0_0_15px_rgba(79,70,229,0.1)] group-hover:scale-110 transition-transform">
              <Zap className="text-indigo-400 w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Génération Rapide</h3>
            <p className="text-slate-400 leading-relaxed">Importez le Grand Livre / Balance, paramétrez vos correspondances SYSCOHADA et laissez le système générer la liasse parfaite instantanément.</p>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all duration-300 group">
            <div className="w-14 h-14 bg-emerald-500/10 flex items-center justify-center rounded-2xl mb-6 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-emerald-400 w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Qwen AI Embarqué</h3>
            <p className="text-slate-400 leading-relaxed">Un auditeur virtuel contrôle la cohérence de la liasse fiscale générée pour vous protéger de tout redressement injustifié.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-[#0b101e] py-8 text-center text-slate-500 text-sm mt-auto relative z-10">
        <div className="flex items-center justify-center gap-6 mb-4">
          <Link href="/admin/login" className="hover:text-blue-400 transition-colors">Portail Administrateur</Link>
          <span className="w-1 h-1 rounded-full bg-slate-700"></span>
          <Link href="/register" className="hover:text-blue-400 transition-colors">Créer un Compte</Link>
        </div>
        &copy; 2026 Auditia Software Cloud. Tous droits réservés.
      </footer>
    </div>
  );
}
