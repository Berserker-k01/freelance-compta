"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Building2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { getCompanies, createCompany, deleteCompany, Company } from "@/lib/companies-api";
import { useCompany } from "@/components/company-provider";
import { useRouter } from "next/navigation";

export default function CompaniesPage() {
    const { companies, refreshCompanies, setActiveCompany } = useCompany();
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Form State
    const [newName, setNewName] = useState("");
    const [newTaxId, setNewTaxId] = useState("");
    const [newAddress, setNewAddress] = useState("");

    const handleCreate = async () => {
        if (!newName || !newTaxId) return;
        setLoading(true);
        setError(null);
        try {
            await createCompany({
                name: newName,
                tax_id: newTaxId,
                address: newAddress
            });
            await refreshCompanies(); // Reload list
            setOpen(false); // Close modal

            // Reset form
            setNewName("");
            setNewTaxId("");
            setNewAddress("");
        } catch (e) {
            console.error(e);
            setError("Impossible de créer le dossier. Vérifiez les informations.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Voulez-vous vraiment supprimer ce dossier ? Toutes les données seront perdues.")) return;
        try {
            await deleteCompany(id);
            await refreshCompanies();
        } catch (e) {
            alert("Erreur lors de la suppression");
        }
    };

    const handleSelect = (company: Company) => {
        setActiveCompany(company);
        router.push("/dashboard"); // Redirect to dashboard home after selection
    };

    return (
        <div className="container mx-auto p-10 max-w-5xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-blue-900 flex items-center gap-2">
                        <Building2 className="w-8 h-8" /> Mes Dossiers Clients
                    </h1>
                    <p className="text-muted-foreground">Gérez votre portefeuille de clients et de sociétés.</p>
                </div>
                <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setError(null); }}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-5 w-5" /> Nouveau Dossier
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Créer un nouveau dossier</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Nom de la Société / Client</Label>
                                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Garage Lomé" />
                            </div>
                            <div className="grid gap-2">
                                <Label>NIF / Matricule Fiscal</Label>
                                <Input value={newTaxId} onChange={e => setNewTaxId(e.target.value)} placeholder="Ex: 1000123456" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Adresse (Optionnel)</Label>
                                <Input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Ex: Quartier Administratif" />
                            </div>
                            {error && (
                                <p className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded border border-red-200">
                                    {error}
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button onClick={handleCreate} disabled={loading}>
                                {loading ? "Création..." : "Créer le dossier"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Liste des Sociétés ({companies.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Identifiant Fiscal</TableHead>
                                <TableHead>Adresse</TableHead>
                                <TableHead>Créé le</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {companies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        Aucun dossier pour le moment. Créez-en un pour commencer !
                                    </TableCell>
                                </TableRow>
                            ) : (
                                companies.map((company) => (
                                    <TableRow key={company.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                {company.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{company.tax_id}</TableCell>
                                        <TableCell>{company.address || "-"}</TableCell>
                                        <TableCell>{new Date(company.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => handleSelect(company)}>
                                                <ExternalLink className="w-4 h-4 mr-1" /> Ouvrir
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(company.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
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
