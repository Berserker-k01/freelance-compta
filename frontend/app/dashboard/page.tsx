"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchAPI } from "@/lib/api";
import { ArrowUpRight, Activity, FileText, Users, Building2, ChevronRight, BarChart3, TrendingUp, Sparkles, Folder, FileDigit } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCompany } from "@/components/company-provider";
import { getDocuments } from "@/lib/documents-api";
import { getAccounts } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function DashboardPage() {
    const { activeCompany, companies } = useCompany();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [activities, setActivities] = useState<any[]>([]);

    useEffect(() => {
        if (!activeCompany) {
            setStats(null);
            setActivities([]);
            return;
        }

        async function loadDashboardData() {
            setLoading(true);
            setStats(null);
            setActivities([]);
            try {
                const data = await fetchAPI(`/dashboard/stats/${activeCompany?.id}`);
                setStats(data);

                // Fetch real activities
                const docs = await getDocuments(activeCompany!.id).catch(() => []); // Document ID type might be different but endpoint handles company_id gracefully
                const accs = await getAccounts(activeCompany!.id).catch(() => []);

                let acts = [];
                // 1. Company creation
                if (activeCompany!.created_at) {
                    acts.push({
                        id: `comp-${activeCompany!.id}`,
                        title: "Ouverture du dossier",
                        time: activeCompany!.created_at,
                        desc: `Dossier configuré pour ${activeCompany!.name}.`,
                        color: "blue",
                        icon: Building2
                    });
                }

                // 2. Accounts existence
                if (accs.length > 0) {
                    // Faking time slightly after company creation for visual timeline
                    const compTime = activeCompany!.created_at ? new Date(activeCompany!.created_at) : new Date();
                    const accTime = new Date(compTime.getTime() + 60000); // +1 min
                    acts.push({
                        id: 'acc-import',
                        title: "Plan Comptable",
                        time: accTime.toISOString(),
                        desc: `${accs.length} comptes initialisés (SYSCOHADA).`,
                        color: "emerald",
                        icon: FileDigit
                    });
                }

                // 3. Documents
                docs.forEach((doc: any) => {
                    acts.push({
                        id: `doc-${doc.id}`,
                        title: doc.file_type === 'balance' ? 'Import de Balance' : 'Nouveau Document',
                        time: doc.created_at,
                        desc: doc.name,
                        color: doc.file_type === 'balance' ? 'teal' : 'slate',
                        icon: doc.file_type === 'balance' ? ArrowUpRight : Folder
                    });
                });

                acts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
                setActivities(acts.slice(0, 4));

            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        }
        loadDashboardData();
    }, [activeCompany]);

    if (!activeCompany) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] space-y-6">
                <div className="p-6 bg-blue-50/50 dark:bg-blue-950/20 rounded-full mb-4 ring-8 ring-blue-50/30 dark:ring-blue-900/10">
                    <Building2 className="w-16 h-16 text-blue-500" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Bienvenue sur Auditia</h2>
                <p className="text-lg text-muted-foreground text-center max-w-md">
                    Pour commencer à piloter l'activité, veuillez choisir un dossier client dans le menu ou en créer un nouveau.
                </p>
                <div className="flex gap-4 mt-4">
                    <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all hover:scale-105">
                        <Link href="/dashboard/companies">
                            Sélectionner un Client <ChevronRight className="ml-2 w-4 h-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-muted-foreground animate-pulse">Chargement des données pour {activeCompany.name}...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-10 text-center flex flex-col items-center">
                <BarChart3 className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">Aucune donnée disponible pour ce dossier.</h3>
                <p className="text-sm text-muted-foreground mt-2">Veuillez importer une balance pour visualiser les statistiques.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-8 text-white shadow-xl shadow-blue-900/20">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-blue-300" />
                            <span className="text-sm font-medium tracking-wider text-blue-200 uppercase">Vue d'ensemble</span>
                        </div>
                        <h2 className="text-4xl font-extrabold tracking-tight">
                            Tableau de Bord
                        </h2>
                        <p className="text-indigo-200 mt-2 max-w-lg text-sm md:text-base">
                            Dossier actif : <strong className="text-white bg-white/10 px-2 py-1 rounded">{activeCompany.name}</strong> — Exercice 2026
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <Button asChild className="bg-white text-blue-900 hover:bg-blue-50 shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all hover:scale-105 font-medium border-0">
                            <Link href="/dashboard/journal">
                                + Nouvelle Écriture
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main KPI Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 ring-1 ring-slate-100 dark:ring-slate-800 bg-white/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Volume d'Écritures</CardTitle>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-800 dark:text-slate-100">{stats.kpi.total_entries}</div>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Lignes saisies dans le journal
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 ring-1 ring-slate-100 dark:ring-slate-800 bg-white/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold tracking-wide text-slate-500 uppercase">États Financiers</CardTitle>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">En Préparation</div>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-2">
                            Bilan & Compte de Résultat (SYSCOHADA)
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 ring-1 ring-slate-100 dark:ring-slate-800 bg-white/50 backdrop-blur-sm hidden lg:block">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Portefeuille</CardTitle>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-baseline mt-1">
                            <div className="flex flex-col">
                                <span className="text-4xl font-black text-slate-800 dark:text-slate-100">{companies.filter(c => c.status !== 'closed').length}</span>
                                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider mt-1">Actifs</span>
                            </div>
                            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
                            <div className="flex flex-col text-right">
                                <span className="text-2xl font-bold text-slate-400">{companies.filter(c => c.status === 'closed').length}</span>
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Clôturés</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Workflow Section */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 grid gap-6 grid-cols-1 md:grid-cols-3">

                    {/* Action 1 */}
                    <div
                        onClick={() => router.push('/dashboard/import')}
                        className="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 cursor-pointer border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-100 via-transparent to-transparent dark:from-blue-900/30 rounded-bl-full -mr-4 -mt-4 transition-all duration-500 group-hover:scale-150"></div>
                        <span className="inline-block text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded mb-4">ÉTAPE 1</span>
                        <div className="flex items-center gap-3 mb-3 relative z-10">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-md group-hover:scale-110 transition-transform">
                                <ArrowUpRight className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">Alimenter</h3>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 relative z-10">
                            Importez votre balance (Excel/CSV) pour initier la comptabilité du dossier.
                        </p>
                    </div>

                    {/* Action 2 */}
                    <div
                        onClick={() => router.push('/dashboard/documents')}
                        className="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 cursor-pointer border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-slate-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-100 via-transparent to-transparent dark:from-slate-800/50 rounded-bl-full -mr-4 -mt-4 transition-all duration-500 group-hover:scale-150"></div>
                        <span className="inline-block text-xs font-bold px-2 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded mb-4">ÉTAPE 2</span>
                        <div className="flex items-center gap-3 mb-3 relative z-10">
                            <div className="p-3 bg-gradient-to-br from-slate-500 to-slate-700 text-white rounded-xl shadow-md group-hover:scale-110 transition-transform">
                                <FileText className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 group-hover:text-slate-600 transition-colors">Gérer</h3>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 relative z-10">
                            Consultez et organisez l'historique des fichiers et justificatifs stockés.
                        </p>
                    </div>

                    {/* Action 3 */}
                    <div
                        onClick={() => router.push('/dashboard/templates')}
                        className="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 cursor-pointer border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-100 via-transparent to-transparent dark:from-emerald-900/30 rounded-bl-full -mr-4 -mt-4 transition-all duration-500 group-hover:scale-150"></div>
                        <span className="inline-block text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded mb-4">ÉTAPE 3</span>
                        <div className="flex items-center gap-3 mb-3 relative z-10">
                            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-md group-hover:scale-110 transition-transform">
                                <Activity className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">Produire</h3>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 relative z-10">
                            Générez les états financiers et la liasse au format SYSCOHADA.
                        </p>
                    </div>
                </div>

                {/* Timeline / Activity Panel */}
                <Card className="col-span-3 border-0 shadow-lg shadow-slate-200/50 dark:shadow-none bg-white/80 backdrop-blur">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                        <CardTitle className="text-lg font-bold">Dernières Activités</CardTitle>
                        <CardDescription>
                            Historique récent sur le dossier {activeCompany.name}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="relative border-l-2 border-slate-100 dark:border-slate-800 pl-6 space-y-8">
                            {activities.length === 0 ? (
                                <p className="text-sm text-slate-500">Aucune activité récente.</p>
                            ) : (
                                activities.map((act) => {
                                    const Icon = act.icon || Activity;
                                    let colorClasses = "bg-slate-300 text-slate-600";
                                    let ringClasses = "bg-slate-500";

                                    if (act.color === 'blue') {
                                        colorClasses = "text-blue-600 dark:text-blue-400";
                                        ringClasses = "bg-blue-500";
                                    } else if (act.color === 'emerald') {
                                        colorClasses = "text-emerald-600 dark:text-emerald-400";
                                        ringClasses = "bg-emerald-500";
                                    } else if (act.color === 'teal') {
                                        colorClasses = "text-teal-600 dark:text-teal-400";
                                        ringClasses = "bg-teal-500";
                                    }

                                    return (
                                        <div key={act.id} className="relative">
                                            <div className={`absolute -left-[31px] ${ringClasses} rounded-full w-3.5 h-3.5 ring-4 ring-white dark:ring-slate-900`}></div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{act.title}</span>
                                                <span className={`text-xs ${colorClasses} font-medium mt-1`}>
                                                    {formatDistanceToNow(new Date(act.time), { addSuffix: true, locale: fr })}
                                                </span>
                                                <span className="text-sm text-slate-500 mt-2">{act.desc}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

