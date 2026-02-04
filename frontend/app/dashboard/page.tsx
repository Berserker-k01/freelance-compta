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
        <div className="center items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400">Pilotage Cabinet & États Financiers</h2>
            <div className="flex items-center space-x-2">
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/dashboard/journal">
                        + Nouvelle Écriture
                    </Link>
                </Button>
            </div>
        </div>

            {/* Activité et Avancement */ }
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
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Production Comptable</CardTitle>
                        <CardDescription>Outils de génération des états financiers et fiscaux.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" className="h-24 flex flex-col gap-2 items-start p-4 hover:border-blue-500 hover:bg-blue-50 transition-all text-left" asChild>
                                <Link href="/dashboard/journal">
                                    <div className="flex items-center gap-2 font-semibold text-blue-700">
                                        <FileText className="h-5 w-5" /> Saisie Comptable
                                    </div>
                                    <span className="text-xs text-muted-foreground text-wrap">Journaux et OD</span>
                                </Link>
                            </Button>
                            <Button variant="outline" className="h-24 flex flex-col gap-2 items-start p-4 hover:border-orange-500 hover:bg-orange-50 transition-all text-left" asChild>
                                <Link href="/dashboard/audit">
                                    <div className="flex items-center gap-2 font-semibold text-orange-700">
                                        <Activity className="h-5 w-5" /> Audit & Contrôle
                                    </div>
                                    <span className="text-xs text-muted-foreground text-wrap">Pré-validation des comptes</span>
                                </Link>
                            </Button>
                            <Button variant="outline" className="h-24 flex flex-col gap-2 items-start p-4 hover:border-green-500 hover:bg-green-50 transition-all text-left" asChild>
                                <Link href="/dashboard/templates">
                                    <div className="flex items-center gap-2 font-semibold text-green-700">
                                        <ArrowUpRight className="h-5 w-5" /> États Financiers
                                    </div>
                                    <span className="text-xs text-muted-foreground text-wrap">Bilan, CR, TAFIRE (OHADA)</span>
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

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
