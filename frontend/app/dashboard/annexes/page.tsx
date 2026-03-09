"use client";

import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Save, Building, Users, Car, Receipt } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCompanyAnnexes, updateCompanyAnnexes } from "@/lib/companies-api";

export default function AnnexesPage() {
    const { activeCompany } = useCompany();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    // Minimal State for Extra Data (simulating API payload)
    const [data, setData] = useState({
        dirigeant_nom: "",
        dirigeant_titre: "Gérant",
        nif: "",
        effectif_hommes: "0",
        effectif_femmes: "0",
        vehicules_immat: "",
        charges_non_deductibles: "0",
        plus_values_exonerees: "0",
    });

    useEffect(() => {
        if (activeCompany) {
            getCompanyAnnexes(activeCompany.id).then(annexe => {
                setData(prev => ({
                    ...prev,
                    nif: activeCompany.tax_id || "",
                    ...annexe,
                }));
            }).catch(e => {
                console.error("Failed to load annexes", e);
            });
        }
    }, [activeCompany]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!activeCompany) return;
        setSaving(true);
        setMessage("");
        try {
            await updateCompanyAnnexes(activeCompany.id, data);
            setMessage("Données enregistrées avec succès. Elles seront incluses dans la liasse fiscale.");
        } catch (error) {
            setMessage("Erreur lors de l'enregistrement.");
        } finally {
            setSaving(false);
        }
    };

    if (!activeCompany) return (
        <div className="p-10 text-slate-400 text-center mt-20">Veuillez sélectionner un dossier client pour modifier les annexes.</div>
    );

    return (
        <div className="container mx-auto p-10 max-w-5xl">

            {/* ---- PAGE HEADER ---- */}
            <div className="flex flex-col gap-4 mb-8">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="pl-0 hover:bg-transparent hover:underline text-slate-400 hover:text-white">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Dashboard
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white border-b border-slate-800 pb-2">
                        Données Extra-Comptables & Fiscales
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Complétez les informations "Hors-Balance" (Dirigeants, Effectifs, Réintégrations) qui seront injectées dans les annexes de la Liasse SYSCOHADA.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">

                {/* PAGE DE GARDE */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden text-slate-200">
                    <CardHeader className="border-b border-slate-800/50 pb-4 bg-slate-900/40">
                        <CardTitle className="flex items-center gap-3 text-white">
                            <div className="p-2 bg-blue-900/20 rounded-lg border border-blue-800/30">
                                <Building className="h-5 w-5 text-blue-400" />
                            </div>
                            Page de Garde & Dirigeants
                        </CardTitle>
                        <CardDescription className="text-slate-400">Informations administratives de l'entité.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="nif" className="text-slate-300">NIF (Numéro d'Identification Fiscale)</Label>
                            <Input id="nif" name="nif" value={data.nif} onChange={handleChange} className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus-visible:ring-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dirigeant_nom" className="text-slate-300">Nom du Dirigeant Principal</Label>
                            <Input id="dirigeant_nom" name="dirigeant_nom" placeholder="Ex: Jean DUPONT" value={data.dirigeant_nom} onChange={handleChange} className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus-visible:ring-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dirigeant_titre" className="text-slate-300">Titre (Fonction)</Label>
                            <Input id="dirigeant_titre" name="dirigeant_titre" placeholder="Ex: Gérant, PDG" value={data.dirigeant_titre} onChange={handleChange} className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus-visible:ring-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                {/* EFFECTIFS */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden text-slate-200">
                    <CardHeader className="border-b border-slate-800/50 pb-4 bg-slate-900/40">
                        <CardTitle className="flex items-center gap-3 text-white">
                            <div className="p-2 bg-purple-900/20 rounded-lg border border-purple-800/30">
                                <Users className="h-5 w-5 text-purple-400" />
                            </div>
                            Effectifs (Note 27B)
                        </CardTitle>
                        <CardDescription className="text-slate-400">Répartition du personnel en fin d'exercice.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="effectif_hommes" className="text-slate-300">Hommes</Label>
                                <Input id="effectif_hommes" name="effectif_hommes" type="number" value={data.effectif_hommes} onChange={handleChange} className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus-visible:ring-purple-500" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="effectif_femmes" className="text-slate-300">Femmes</Label>
                                <Input id="effectif_femmes" name="effectif_femmes" type="number" value={data.effectif_femmes} onChange={handleChange} className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus-visible:ring-purple-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* INTELLIGENCE FISCALE */}
                <Card className="bg-emerald-900/10 backdrop-blur-xl border border-emerald-800/30 shadow-xl overflow-hidden text-slate-200">
                    <CardHeader className="border-b border-emerald-900/30 pb-4 bg-emerald-900/20">
                        <CardTitle className="flex items-center gap-3 text-white">
                            <div className="p-2 bg-emerald-900/30 rounded-lg border border-emerald-800/50">
                                <Receipt className="h-5 w-5 text-emerald-400" />
                            </div>
                            Intelligence Fiscale (Tableau 4)
                        </CardTitle>
                        <CardDescription className="text-emerald-200/60">Saisie extra-comptable pour la détermination du résultat fiscal.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="charges_non_deductibles" className="text-slate-300">Charges non déductibles (Réintégrations diverses) (FCFA)</Label>
                            <Input id="charges_non_deductibles" name="charges_non_deductibles" type="number" value={data.charges_non_deductibles} onChange={handleChange} className="bg-slate-800/50 border-emerald-800/50 text-white placeholder-slate-500 focus-visible:ring-emerald-500" />
                            <p className="text-xs text-slate-500">Ex: Amendes non comptabilisées dans 657, frais non liés à l'exploitation.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="plus_values_exonerees" className="text-slate-300">Produits non imposables (Déductions) (FCFA)</Label>
                            <Input id="plus_values_exonerees" name="plus_values_exonerees" type="number" value={data.plus_values_exonerees} onChange={handleChange} className="bg-slate-800/50 border-emerald-800/50 text-white placeholder-slate-500 focus-visible:ring-emerald-500" />
                        </div>
                    </CardContent>
                </Card>

                {/* VÉHICULES */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden text-slate-200">
                    <CardHeader className="border-b border-slate-800/50 pb-4 bg-slate-900/40">
                        <CardTitle className="flex items-center gap-3 text-white">
                            <div className="p-2 bg-orange-900/20 rounded-lg border border-orange-800/30">
                                <Car className="h-5 w-5 text-orange-400" />
                            </div>
                            Véhicules (Note 85)
                        </CardTitle>
                        <CardDescription className="text-slate-400">Liste des flottes de véhicules de fonction.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="vehicules_immat" className="text-slate-300">Plaques d'immatriculation</Label>
                            <Textarea id="vehicules_immat" name="vehicules_immat" placeholder="Ex: TG-1234-A, TG-5678-B..." value={data.vehicules_immat} onChange={handleChange} className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus-visible:ring-orange-500 min-h-[100px]" />
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* SAVE BUTTON */}
            <div className="mt-8 flex items-center gap-4 border-t border-slate-800/80 pt-6">
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all hover:scale-105 border border-blue-500/50 w-48 font-medium">
                    {saving ? "Sauvegarde..." : <><Save className="h-4 w-4 mr-2" /> Sauvegarder</>}
                </Button>
                {message && <span className="text-sm font-medium text-emerald-400 bg-emerald-900/20 px-3 py-1.5 rounded-md border border-emerald-800/30">{message}</span>}
            </div>

        </div>
    );
}
