"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAccounts, seedAccounts, Account } from "@/lib/api";

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const COMPANY_ID = 1; // Mock Company ID

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const data = await getAccounts(COMPANY_ID);
            setAccounts(data);
        } catch (error) {
            console.error("Failed to load accounts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, []);

    const handleSeed = async () => {
        setLoading(true);
        try {
            await seedAccounts(COMPANY_ID);
            await loadAccounts(); // Reload after seed
        } catch (error) {
            alert("Erreur lors de l'import");
        } finally {
            setLoading(false);
        }
    };

    const filteredAccounts = accounts.filter(acc =>
        acc.code.includes(search) || acc.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="container mx-auto p-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Plan Comptable (SYSCOHADA)</h1>
                <Button onClick={handleSeed} disabled={loading || accounts.length > 0}>
                    {loading ? "Chargement..." : "Importer SYSCOHADA par défaut"}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des Comptes</CardTitle>
                    <div className="pt-2">
                        <Input
                            placeholder="Rechercher (Code ou Nom)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Compte</TableHead>
                                <TableHead>Intitulé</TableHead>
                                <TableHead>Classe</TableHead>
                                <TableHead className="text-right">Statut</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAccounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        Aucun compte trouvé. Importez le plan comptable pour commencer.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAccounts.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell className="font-medium">{account.code}</TableCell>
                                        <TableCell>{account.name}</TableCell>
                                        <TableCell>Class {account.class_code}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={account.is_active ? "default" : "secondary"}>
                                                {account.is_active ? "Actif" : "Archivé"}
                                            </Badge>
                                        </TableCell>
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
