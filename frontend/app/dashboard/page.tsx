"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { fetchAPI } from "@/lib/api";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { ArrowUpRight, ArrowDownRight, Activity, CreditCard, DollarSign, Users } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const COMPANY_ID = 1;

    useEffect(() => {
        async function loadStats() {
            try {
                const data = await fetchAPI(`/dashboard/stats/${COMPANY_ID}`);
                setStats(data);
            } catch (error) {
                console.error("Failed to load dashboard stats", error);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    if (loading) {
        return <div className="p-10 text-center">Chargement du tableau de bord...</div>;
    }

    if (!stats) {
        return <div className="p-10 text-center">Erreur de chargement.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400">Vue d'ensemble</h2>
                <div className="flex items-center space-x-2">
                    <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Link href="/dashboard/journal">
                            + Nouvelle Écriture
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Trésorerie Totale</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.kpi.cash_balance.toLocaleString()} FCFA</div>
                        <p className="text-xs text-muted-foreground">
                            +20.1% par rapport au mois dernier
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recettes (30j)</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.kpi.revenue_month.toLocaleString()} FCFA</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dépenses (30j)</CardTitle>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.kpi.expenses_month.toLocaleString()} FCFA</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Volume d'activité</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.kpi.total_entries}</div>
                        <p className="text-xs text-muted-foreground">
                            Écritures saisies
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Main Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Évolution de la Trésorerie</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={stats.chart_data}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}€`} />
                                <Tooltip />
                                <Bar dataKey="solde" fill="#2563eb" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Dernières Opérations</CardTitle>
                        <CardDescription>
                            Vos 5 dernières saisies comptables.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {stats.recent_entries.map((entry: any) => (
                                <div className="flex items-center" key={entry.id}>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{entry.label}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(entry.date).toLocaleDateString()} • {entry.journal}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium">
                                        {entry.amount.toLocaleString()} FCFA
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
