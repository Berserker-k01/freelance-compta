"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search } from "lucide-react";
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
                    <Button variant="ghost" size="sm" className="pl-0 hover:bg-transparent hover:underline text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Dashboard
                    </Button>
                </Link>
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight">Plan Comptable (SYSCOHADA)</h1>
                    <Button onClick={handleSeed} disabled={loading || accounts.length > 0}>
                        {loading ? "Chargement..." : "Importer SYSCOHADA par défaut"}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Comptes du Grand Livre</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher (Code ou Nom)..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">Compte</TableHead>
                                    <TableHead>Intitulé</TableHead>
                                    <TableHead className="w-[100px]">Type</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAccounts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                            {loading ? "Chargement..." : "Aucun compte trouvé. Importez le plan par défaut."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAccounts.map((account) => (
                                        <TableRow key={account.id}>
                                            <TableCell className="font-medium">{account.code}</TableCell>
                                            <TableCell>{account.name}</TableCell>
                                            <TableCell><Badge variant="outline">Général</Badge></TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
