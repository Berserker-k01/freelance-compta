import Link from 'next/link';
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Monitor, ShieldCheck, Zap, CheckCircle2, Layers, Lock, Workflow, Cpu, ArrowRight, Star } from "lucide-react";

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
          <a href="#workflow" className="hover:text-white transition-colors">Processus</a>
          <a href="#security" className="hover:text-white transition-colors">Sécurité</a>
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.14),transparent_50%)] pointer-events-none"></div>

        <div className="relative z-10 max-w-6xl mx-auto space-y-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold mb-4">
            <Zap className="w-4 h-4" /> Auditia Cloud & Desktop 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white leading-tight">
            La plateforme professionnelle pour la <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              liasse OTR SYSCOHADA, de la balance au depot.
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-4xl mx-auto">
            Auditia centralise import, controles de coherence, auto-mapping intelligent et generation de liasses conformes.
            Concu pour les cabinets d&apos;expertise et les directions financieres exigeantes.
          </p>

          <div id="download" className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button size="lg" asChild className="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] w-full sm:w-auto overflow-hidden group">
              <a href="/downloads/auditia-setup-1.0.0.exe" download>
                <Monitor className="mr-2 w-6 h-6 group-hover:scale-110 transition-transform" />
                Télécharger Windows (.exe)
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild className="h-14 px-8 text-lg border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white w-full sm:w-auto">
              <Link href="/login">Accéder à la version Web</Link>
            </Button>
            <Button variant="ghost" size="lg" asChild className="h-14 px-5 text-slate-300 hover:text-white hover:bg-slate-800/60">
              <Link href="/register">Demarrer gratuitement <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-4 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Vos données ne quittent jamais l'environnement de sécurité.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <div className="flex -space-x-3">
              <Image src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80" alt="Expert comptable" width={44} height={44} className="rounded-full border-2 border-[#0b1221] object-cover" />
              <Image src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80" alt="Directrice finance" width={44} height={44} className="rounded-full border-2 border-[#0b1221] object-cover" />
              <Image src="https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=200&q=80" alt="Auditeur financier" width={44} height={44} className="rounded-full border-2 border-[#0b1221] object-cover" />
            </div>
            <p className="text-sm text-slate-400">
              Utilise par des experts-comptables, chefs de mission et directions financieres.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">OTR / SYSCOHADA</div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">Cloud + Desktop</div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">Audit IA embarque</div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">Export Excel natif</div>
          </div>

          <div className="rounded-3xl border border-blue-500/20 bg-[#0b1221]/80 p-4 md:p-6 shadow-[0_0_40px_rgba(37,99,235,0.15)]">
            <Image
              src="/hero-dashboard.svg"
              alt="Apercu tableau de bord Auditia"
              width={1280}
              height={820}
              className="w-full h-auto rounded-2xl border border-white/10"
              priority
            />
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="w-full max-w-6xl mx-auto px-6 py-24 relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold text-center mb-4 text-white tracking-tight">
          Une vitrine de capacites metier, pas juste un logiciel.
        </h2>
        <p className="text-center text-slate-400 max-w-3xl mx-auto mb-16">
          Chaque module est pense pour reduire les delais de production, renforcer la qualite documentaire
          et fiabiliser les controles avant depot.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-blue-500/5 hover:border-blue-500/30 transition-all duration-300 group">
            <div className="w-14 h-14 bg-blue-500/10 flex items-center justify-center rounded-2xl mb-6 shadow-[0_0_15px_rgba(37,99,235,0.1)] group-hover:scale-110 transition-transform">
              <Layers className="text-blue-400 w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Pilotage Multi-Dossiers</h3>
            <p className="text-slate-400 leading-relaxed">
              Centralisez entreprises, balances, journaux, annexes et exports dans un workflow unique.
              Une meme interface pour vos equipes et vos clients.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all duration-300 group">
            <div className="w-14 h-14 bg-indigo-500/10 flex items-center justify-center rounded-2xl mb-6 shadow-[0_0_15px_rgba(79,70,229,0.1)] group-hover:scale-110 transition-transform">
              <Workflow className="text-indigo-400 w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Generation Guidee OTR</h3>
            <p className="text-slate-400 leading-relaxed">
              De l&apos;import balance au fichier final, Auditia orchestre mapping, controle preflight
              et generation pour limiter les erreurs manuelles.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all duration-300 group">
            <div className="w-14 h-14 bg-emerald-500/10 flex items-center justify-center rounded-2xl mb-6 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:scale-110 transition-transform">
              <Cpu className="text-emerald-400 w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Checkpoint IA Expert</h3>
            <p className="text-slate-400 leading-relaxed">
              Un module IA d&apos;audit detecte incoherences et risques avant finalisation
              pour renforcer la fiabilite de vos productions fiscales.
            </p>
          </div>
        </div>
      </section>

      <section id="workflow" className="w-full max-w-6xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-5">
              Un processus clair, de bout en bout.
            </h3>
            <div className="space-y-4 text-slate-300">
              <p className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 mt-0.5 text-emerald-400" /> Import des balances Excel/CSV avec detection intelligente des colonnes.</p>
              <p className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 mt-0.5 text-emerald-400" /> Controle des pre-requis (equilibre, classes comptables, coherence documentaire).</p>
              <p className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 mt-0.5 text-emerald-400" /> Auto-mapping des canevas et edition manuelle des regles si necessaire.</p>
              <p className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 mt-0.5 text-emerald-400" /> Generation de la liasse OTR puis telechargement en format Excel natif.</p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0b1221] p-4">
            <Image src="/workflow-illustration.svg" alt="Workflow Auditia" width={960} height={540} className="w-full h-auto rounded-2xl" />
          </div>
        </div>
      </section>

      <section id="security" className="w-full max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="rounded-3xl border border-white/10 bg-[#0b1221] p-4 order-2 lg:order-1">
            <Image src="/security-illustration.svg" alt="Securite et conformite Auditia" width={960} height={540} className="w-full h-auto rounded-2xl" />
          </div>
          <div className="order-1 lg:order-2">
            <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-5">
              Securite, conformite et confiance.
            </h3>
            <div className="space-y-4 text-slate-300">
              <p className="flex items-start gap-3"><Lock className="h-5 w-5 mt-0.5 text-blue-400" /> Acces authentifie et isolation des donnees par utilisateur et dossier.</p>
              <p className="flex items-start gap-3"><ShieldCheck className="h-5 w-5 mt-0.5 text-blue-400" /> Architecture Cloud + Desktop pour s&apos;adapter aux contraintes de securite terrain.</p>
              <p className="flex items-start gap-3"><Star className="h-5 w-5 mt-0.5 text-blue-400" /> Controles automatiques avant generation pour limiter les risques d&apos;incoherence.</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">OTR Ready</span>
              <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">SYSCOHADA</span>
              <span className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">Audit IA</span>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full max-w-6xl mx-auto px-6 pb-12">
        <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-6 text-center">
          Concu pour les equipes finance sur le terrain
        </h3>
        <p className="text-center text-slate-400 max-w-3xl mx-auto mb-10">
          Des profils metier differents utilisent Auditia au quotidien pour produire plus vite et avec plus de fiabilite.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0b1221]">
            <Image
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80"
              alt="Equipe comptable en reunion"
              width={1200}
              height={800}
              className="w-full h-52 object-cover"
            />
            <div className="p-5">
              <h4 className="text-white font-semibold mb-2">Cabinets comptables</h4>
              <p className="text-slate-400 text-sm">Production standardisee des liasses et meilleure collaboration equipe/client.</p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0b1221]">
            <Image
              src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80"
              alt="Analyste financier au travail"
              width={1200}
              height={800}
              className="w-full h-52 object-cover"
            />
            <div className="p-5">
              <h4 className="text-white font-semibold mb-2">Directions financieres</h4>
              <p className="text-slate-400 text-sm">Vision claire des controles avant depot et reduction des retouches de derniere minute.</p>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0b1221]">
            <Image
              src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80"
              alt="Professionnelle finance presentant des rapports"
              width={1200}
              height={800}
              className="w-full h-52 object-cover"
            />
            <div className="p-5">
              <h4 className="text-white font-semibold mb-2">Equipes audit & conformite</h4>
              <p className="text-slate-400 text-sm">Traçabilite, coherence et verifications renforcees sur les donnees fiscales critiques.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 p-8 md:p-12">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Pret a industrialiser vos liasses fiscales ?
          </h3>
          <p className="text-slate-300 mb-8 max-w-3xl">
            Lancez Auditia en quelques minutes, importez votre balance et obtenez une liasse exploitable,
            avec un niveau de controle adapte aux attentes des cabinets professionnels.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-500 text-white">
              <Link href="/register">Creer un compte</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-slate-600 text-slate-200 hover:bg-slate-800">
              <a href="/downloads/auditia-setup-1.0.0.exe" download>Telecharger la version Windows</a>
            </Button>
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
