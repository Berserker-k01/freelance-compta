"use client";

import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { generateLiasse, generateSMT } from "@/lib/templates-api";

export default function TemplatesPage() {
    const { activeCompany } = useCompany();
    const [generating, setGenerating] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!activeCompany) return;
        setGenerating("normal");
        try {
            await generateLiasse(activeCompany.id, `Liasse_${activeCompany.name}_2026.xlsx`);
        } catch (error) {
            alert("Erreur lors de la génération");
        } finally {
            setGenerating(null);
        }
    };

    const handleGenerateSMT = async () => {
        if (!activeCompany) return;
        setGenerating("smt");
        try {
            await generateSMT(activeCompany.id, `SMT_${activeCompany.name}_2026.xlsx`);
        } catch (error) {
            alert("Erreur lors de la génération SMT");
        } finally {
            setGenerating(null);
        }
    };

    if (!activeCompany) return <div className="p-10">Veuillez sélectionner un dossier.</div>;

    return (
        <div className="container mx-auto p-10 max-w-5xl">
            <div className="flex flex-col gap-4 mb-8">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="pl-0 hover:bg-transparent hover:underline text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Dashboard
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400">États Financiers & Fiscaux</h1>
                    <p className="text-muted-foreground">Génération automatique des liasses selon les normes SYSCOHADA Révisé.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-l-4 border-l-green-600 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-6 w-6 text-green-600" />
                            Liasse Fiscale Complète (Normal)
                        </CardTitle>
                        <CardDescription>
                            Modèle officiel 2025. Inclut Bilan, Compte de Résultat, TAFIRE et notes annexes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mb-6">
                            <li>Bilan (Actif/Passif)</li>
                            <li>Compte de Résultat</li>
                            <li>Tableau des Flux (TAFIRE)</li>
                            <li>États Annexés (36 tableaux)</li>
                        </ul>
                        <Button onClick={handleGenerate} disabled={!!generating} className="w-full bg-green-600 hover:bg-green-700">
                            {generating === "normal" ? (
                                <>Génération en cours...</>
                            ) : (
                                <><FileDown className="mr-2 h-4 w-4" /> Générer Excel (.xlsx)</>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-600 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-6 w-6 text-blue-600" />
                            Système Minimal de Trésorerie (SMT)
                        </CardTitle>
                        <CardDescription>
                            Pour les petites entités (Déclaration simplifiée).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mb-6">
                            <li>Bilan Simplifié</li>
                            <li>Compte de Résultat Simplifié</li>
                        </ul>
                        <Button onClick={handleGenerateSMT} disabled={!!generating} className="w-full bg-blue-600 hover:bg-blue-700">
                            {generating === "smt" ? (
                                <>Génération en cours...</>
                            ) : (
                                <><FileDown className="mr-2 h-4 w-4" /> Générer SMT (.xlsx)</>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
