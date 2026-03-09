"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, Layers, FileDigit, Hash } from "lucide-react";
import Link from "next/link";
import { getAccounts, seedAccounts, Account } from "@/lib/api";

import { useCompany } from "@/components/company-provider";

export default function AccountsPage() {
    const { activeCompany } = useCompany();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const loadAccounts = async () => {
        if (!activeCompany) return;
        setLoading(true);
        try {
            const data = await getAccounts(activeCompany.id);
            setAccounts(data);
        } catch (error) {
            console.error("Failed to load accounts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, [activeCompany]);

    const handleSeed = async () => {
        if (!activeCompany) return;
        setLoading(true);
        try {
            await seedAccounts(activeCompany.id);
            await loadAccounts(); // Reload after seed
        } catch (error: any) {
            const message = error.message || "Erreur lors de l'import";
            alert(`Erreur: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredAccounts = accounts.filter(acc =>
        acc.code.includes(search) || acc.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="container mx-auto p-10">
            <div className="flex flex-col gap-4 mb-8">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="pl-0 mb-4 hover:bg-transparent hover:underline text-slate-400 hover:text-white group">
                        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Retour au Dashboard
                    </Button>
                </Link>
                <div className="flex justify-between items-end">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl rounded-full opacity-50"></div>
                        <h1 className="relative text-3xl font-bold tracking-tight text-white">Plan Comptable</h1>
                        <p className="relative text-slate-400 mt-2 text-lg">
                            Gestion des comptes SYSCOHADA pour <strong className="text-white">{activeCompany?.name || "..."}</strong>.
                        </p>
                    </div>
                    <Button onClick={handleSeed} disabled={loading || accounts.length > 0} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-blue-500/50 transition-all rounded-xl font-medium px-4 h-11 transform hover:-translate-y-0.5">
                        {loading ? "Chargement..." : "Importer SYSCOHADA par défaut"}
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6">
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden text-slate-200">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-400">Total Comptes</p>
                            <p className="text-3xl font-bold text-white">{accounts.length}</p>
                        </div>
                        <div className="h-12 w-12 bg-blue-900/20 border border-blue-800/30 rounded-full flex items-center justify-center">
                            <Hash className="h-6 w-6 text-blue-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden text-slate-200">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-400">Classes Actives</p>
                            <p className="text-3xl font-bold text-white">{new Set(accounts.map(a => a.code.charAt(0))).size}</p>
                        </div>
                        <div className="h-12 w-12 bg-purple-900/20 border border-purple-800/30 rounded-full flex items-center justify-center">
                            <Layers className="h-6 w-6 text-purple-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden text-slate-200">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-400">Comptabilité</p>
                            <p className="text-3xl font-bold text-white">OHADA</p>
                        </div>
                        <div className="h-12 w-12 bg-emerald-900/20 border border-emerald-800/30 rounded-full flex items-center justify-center">
                            <FileDigit className="h-6 w-6 text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden text-slate-200">
                <CardHeader className="border-b border-slate-800/50 pb-4 bg-slate-900/40">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <CardTitle className="text-xl font-bold text-white">Comptes du Grand Livre</CardTitle>
                        <div className="relative w-full sm:w-80 shadow-sm rounded-md border border-slate-700 bg-slate-800/50">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Rechercher (Code ou Nom)..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-transparent border-transparent text-white placeholder-slate-500 focus-visible:ring-blue-500"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-900/50 hover:bg-slate-900/50">
                            <TableRow className="border-b border-slate-800">
                                <TableHead className="w-[150px] font-semibold text-slate-400 pl-6 h-12">Code</TableHead>
                                <TableHead className="font-semibold text-slate-400 h-12">Intitulé du compte</TableHead>
                                <TableHead className="w-[100px] font-semibold text-slate-400 pr-6 h-12 text-right">Catégorie</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAccounts.length === 0 ? (
                                <TableRow className="border-b border-slate-800 hover:bg-transparent">
                                    <TableCell colSpan={3} className="text-center py-16 text-slate-400">
                                        {loading ? "Chargement des comptes..." : "Aucun compte trouvé. Importez le plan par défaut."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAccounts.map((account) => (
                                    <TableRow key={account.id} className="hover:bg-slate-800/40 border-b border-slate-800/50 cursor-pointer transition-colors group">
                                        <TableCell className="font-medium text-white pl-6">{account.code}</TableCell>
                                        <TableCell className="text-slate-300">{account.name}</TableCell>
                                        <TableCell className="pr-6 text-right"><Badge variant="outline" className="bg-slate-800/50 text-slate-400 border-slate-700 font-normal">Général</Badge></TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
