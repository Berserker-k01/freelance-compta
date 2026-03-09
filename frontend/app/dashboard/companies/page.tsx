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

    const handleDelete = async (id: string) => {
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
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Building2 className="w-8 h-8 text-blue-400" /> Mes Dossiers Clients
                    </h1>
                    <p className="text-slate-400">Gérez votre portefeuille de clients et de sociétés.</p>
                </div>
                <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setError(null); }}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all hover:scale-105 border border-blue-500/50">
                            <Plus className="mr-2 h-5 w-5" /> Nouveau Dossier
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 text-white shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Créer un nouveau dossier</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label className="text-slate-300">Nom de la Société / Client</Label>
                                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Garage Lomé" className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus-visible:ring-blue-500" />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-slate-300">NIF / Matricule Fiscal</Label>
                                <Input value={newTaxId} onChange={e => setNewTaxId(e.target.value)} placeholder="Ex: 1000123456" className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus-visible:ring-blue-500" />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-slate-300">Adresse (Optionnel)</Label>
                                <Input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Ex: Quartier Administratif" className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus-visible:ring-blue-500" />
                            </div>
                            {error && (
                                <p className="text-sm font-medium text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50">
                                    {error}
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white">Annuler</Button>
                            <Button onClick={handleCreate} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)] border border-blue-500/50">
                                {loading ? "Création..." : "Créer le dossier"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden text-slate-200">
                <CardHeader className="border-b border-slate-800/50 pb-4 bg-slate-900/40">
                    <CardTitle className="text-xl font-bold text-white">Liste des Sociétés ({companies.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-900/50 hover:bg-slate-900/50">
                            <TableRow className="border-b border-slate-800">
                                <TableHead className="text-slate-400 font-semibold h-12">Nom</TableHead>
                                <TableHead className="text-slate-400 font-semibold h-12">Identifiant Fiscal</TableHead>
                                <TableHead className="text-slate-400 font-semibold h-12">Adresse</TableHead>
                                <TableHead className="text-slate-400 font-semibold h-12">Créé le</TableHead>
                                <TableHead className="text-right text-slate-400 font-semibold h-12 pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {companies.length === 0 ? (
                                <TableRow className="border-b border-slate-800 hover:bg-transparent">
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                        Aucun dossier pour le moment. Créez-en un pour commencer !
                                    </TableCell>
                                </TableRow>
                            ) : (
                                companies.map((company) => (
                                    <TableRow key={company.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                                        <TableCell className="font-medium text-white pl-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-900/20 rounded-lg border border-blue-800/30">
                                                    <Building2 className="w-4 h-4 text-blue-400" />
                                                </div>
                                                {company.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-300">{company.tax_id}</TableCell>
                                        <TableCell className="text-slate-400">{company.address || "-"}</TableCell>
                                        <TableCell className="text-slate-400">{new Date(company.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right space-x-3 pr-6">
                                            <Button variant="outline" size="sm" onClick={() => handleSelect(company)} className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all">
                                                <ExternalLink className="w-4 h-4 mr-2" /> Ouvrir
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(company.id)} className="hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all">
                                                <Trash2 className="w-4 h-4" />
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
