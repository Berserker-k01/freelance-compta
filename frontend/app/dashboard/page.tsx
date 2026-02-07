"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchAPI } from "@/lib/api";
import { ArrowUpRight, Activity, FileText, Users, Building2 } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCompany } from "@/components/company-provider";

export default function DashboardPage() {
    const { activeCompany, companies } = useCompany();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false); // Default to false, wait for company
    const router = useRouter();

    useEffect(() => {
        if (!activeCompany) return;

        async function loadStats() {
            setLoading(true);
            try {
                const data = await fetchAPI(`/dashboard/stats/${activeCompany?.id}`);
                setStats(data);
            } catch (error) {
                console.error("Failed to load dashboard stats", error);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, [activeCompany]);

    if (!activeCompany) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
                <h2 className="text-2xl font-bold text-gray-700">Aucun dossier sélectionné 📁</h2>
                <p className="text-muted-foreground">Veuillez choisir un client dans le menu ou en créer un nouveau.</p>
                <div className="flex gap-4">
                    <Button asChild variant="outline">
                        <Link href="/dashboard/companies">Liste des Clients</Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="p-10 text-center">Chargement des données de {activeCompany.name}...</div>;
    }

    if (!stats) {
        return <div className="p-10 text-center">Aucune donnée disponible pour ce dossier.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400">Pilotage Cabinet & États Financiers</h2>
                <div className="flex items-center space-x-2">
                    <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Link href="/dashboard/journal">
                            + Nouvelle Écriture
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Volume d'Écritures</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.kpi.total_entries}</div>
                        <p className="text-xs text-muted-foreground">
                            Lignes saisies dans le journal
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Préparation États Financiers</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">En Préparation</div>
                        <p className="text-xs text-muted-foreground">
                            Bilan, Compte de Résultat (SYSCOHADA)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Portefeuille Clients</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-baseline">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold">{companies.filter(c => c.status !== 'closed').length}</span>
                                <span className="text-xs text-muted-foreground">Actifs</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-2xl font-bold text-gray-400">{companies.filter(c => c.status === 'closed').length}</span>
                                <span className="text-xs text-muted-foreground">Clôturés</span>
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                            Total: {companies.length} Dossiers Gérés
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dossier en Traitement</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{activeCompany.name}</div>
                        <p className="text-xs text-muted-foreground">
                            Exercice 2026 - TOGO
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 grid gap-4 grid-cols-1 md:grid-cols-3">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500" onClick={() => router.push('/dashboard/import')}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-700">1. Alimenter</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 rounded-full">
                                    <ArrowUpRight className="h-5 w-5 text-blue-600" />
                                </div>
                                <span className="font-bold text-lg">Importer Balance</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Chargez votre fichier Excel (Grand Livre/Balance) pour démarrer.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-slate-500" onClick={() => router.push('/dashboard/documents')}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-700">2. Gérer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-slate-100 rounded-full">
                                    <FileText className="h-5 w-5 text-slate-600" />
                                </div>
                                <span className="font-bold text-lg">Mes Documents</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Consultez l'historique des fichiers et justificatifs stockés.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500" onClick={() => router.push('/dashboard/templates')}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-700">3. Produire</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-100 rounded-full">
                                    <Activity className="h-5 w-5 text-green-600" />
                                </div>
                                <span className="font-bold text-lg">Éditer Liasses</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Générez le Bilan, Compte de Résultat et SMT au format SYSCOHADA.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Dernières Activités</CardTitle>
                        <CardDescription>
                            Historique des actions sur ce dossier.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 text-sm">
                            <div className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                <div className="flex-1">Ouverture du dossier</div>
                                <div className="text-muted-foreground">Aujourd'hui</div>
                            </div>
                            <div className="flex items-center">
                                <span className="w-2 h-2 bg-gray-300 rounded-full mr-2"></span>
                                <div className="flex-1">Import Plan Comptable</div>
                                <div className="text-muted-foreground">Automatique</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
