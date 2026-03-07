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
            // Dans une vraie app, on fetcherait `GET /annexes/${activeCompany.id}`
            setData(prev => ({
                ...prev,
                nif: activeCompany.tax_id || "",
            }));
        }
    }, [activeCompany]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage("");
        try {
            // Simulation API Call
            await new Promise(r => setTimeout(r, 800));
            // Dans l'avenir: await fetchAPI(`/annexes/${activeCompany.id}`, { method: 'POST', body: JSON.stringify(data) })
            setMessage("Données enregistrées avec succès. Elles seront incluses dans la liasse fiscale.");
        } catch (error) {
            setMessage("Erreur lors de l'enregistrement.");
        } finally {
            setSaving(false);
        }
    };

    if (!activeCompany) return (
        <div className="p-10 text-muted-foreground">Veuillez sélectionner un dossier.</div>
    );

    return (
        <div className="container mx-auto p-10 max-w-5xl">

            {/* ---- PAGE HEADER ---- */}
            <div className="flex flex-col gap-4 mb-8">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="pl-0 hover:bg-transparent hover:underline text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Dashboard
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-blue-900 border-b pb-2">
                        Données Extra-Comptables & Fiscales
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Complétez les informations "Hors-Balance" (Dirigeants, Effectifs, Réintégrations) qui seront injectées dans les annexes de la Liasse SYSCOHADA.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">

                {/* PAGE DE GARDE */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-blue-600" /> Page de Garde & Dirigeants</CardTitle>
                        <CardDescription>Informations administratives de l'entité.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nif">NIF (Numéro d'Identification Fiscale)</Label>
                            <Input id="nif" name="nif" value={data.nif} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dirigeant_nom">Nom du Dirigeant Principal</Label>
                            <Input id="dirigeant_nom" name="dirigeant_nom" placeholder="Ex: Jean DUPONT" value={data.dirigeant_nom} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dirigeant_titre">Titre (Fonction)</Label>
                            <Input id="dirigeant_titre" name="dirigeant_titre" placeholder="Ex: Gérant, PDG" value={data.dirigeant_titre} onChange={handleChange} />
                        </div>
                    </CardContent>
                </Card>

                {/* EFFECTIFS */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-purple-600" /> Effectifs (Note 27B)</CardTitle>
                        <CardDescription>Répartition du personnel en fin d'exercice.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="effectif_hommes">Hommes</Label>
                                <Input id="effectif_hommes" name="effectif_hommes" type="number" value={data.effectif_hommes} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="effectif_femmes">Femmes</Label>
                                <Input id="effectif_femmes" name="effectif_femmes" type="number" value={data.effectif_femmes} onChange={handleChange} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* INTELLIGENCE FISCALE */}
                <Card className="border-emerald-200 bg-emerald-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-emerald-600" /> Intelligence Fiscale (Tableau 4)</CardTitle>
                        <CardDescription>Saisie extra-comptable pour la détermination du résultat fiscal.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="charges_non_deductibles">Charges non déductibles (Réintégrations diverses) (FCFA)</Label>
                            <Input id="charges_non_deductibles" name="charges_non_deductibles" type="number" value={data.charges_non_deductibles} onChange={handleChange} />
                            <p className="text-xs text-muted-foreground">Ex: Amendes non comptabilisées dans 657, frais non liés à l'exploitation.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="plus_values_exonerees">Produits non imposables (Déductions) (FCFA)</Label>
                            <Input id="plus_values_exonerees" name="plus_values_exonerees" type="number" value={data.plus_values_exonerees} onChange={handleChange} />
                        </div>
                    </CardContent>
                </Card>

                {/* VÉHICULES */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5 text-orange-600" /> Véhicules (Note 85)</CardTitle>
                        <CardDescription>Liste des flottes de véhicules de fonction.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="vehicules_immat">Plaques d'immatriculation</Label>
                            <Textarea id="vehicules_immat" name="vehicules_immat" placeholder="Ex: TG-1234-A, TG-5678-B..." value={data.vehicules_immat} onChange={handleChange} />
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* SAVE BUTTON */}
            <div className="mt-8 flex items-center gap-4 border-t pt-6">
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 w-48">
                    {saving ? "Sauvegarde..." : <><Save className="h-4 w-4 mr-2" /> Sauvegarder</>}
                </Button>
                {message && <span className="text-sm font-medium text-emerald-600">{message}</span>}
            </div>

        </div>
    );
}
