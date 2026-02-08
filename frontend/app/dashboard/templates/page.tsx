"use client";

import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, FileText, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { generateLiasse, generateSMT } from "@/lib/templates-api";
import { getDocuments, Document } from "@/lib/documents-api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function TemplatesPage() {
    const { activeCompany } = useCompany();
    const [generating, setGenerating] = useState<string | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string>("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [targetMode, setTargetMode] = useState<"normal" | "smt" | null>(null);

    useEffect(() => {
        if (activeCompany) {
            getDocuments(activeCompany.id).then(docs => {
                // Filter only 'balance' files as they contain the source data
                setDocuments(docs.filter(d => d.file_type === 'balance'));
            });
        }
    }, [activeCompany]);

    const handleOpenDialog = (mode: "normal" | "smt") => {
        setTargetMode(mode);
        // Pre-select the most recent document if available
        if (documents.length > 0) {
            setSelectedDocId(documents[0].id.toString());
        } else {
            setSelectedDocId("all");
        }
        setIsDialogOpen(true);
    };

    const handleConfirmGenerate = async () => {
        if (!activeCompany || !targetMode) return;

        setIsDialogOpen(false);
        setGenerating(targetMode);

        const docId = selectedDocId === "all" ? undefined : parseInt(selectedDocId);
        const filename = targetMode === "normal"
            ? `Liasse_${activeCompany.name}_2026${docId ? `_DOC${docId}` : ""}.xlsx`
            : `SMT_${activeCompany.name}_2026${docId ? `_DOC${docId}` : ""}.xlsx`;

        try {
            if (targetMode === "normal") {
                await generateLiasse(activeCompany.id, filename, docId);
            } else {
                await generateSMT(activeCompany.id, filename, docId);
            }
        } catch (error) {
            alert("Erreur lors de la génération");
        } finally {
            setGenerating(null);
            setTargetMode(null);
        }
    };

    if (!activeCompany) return <div className="p-10">Veuillez sélectionner un dossier.</div>;

    return (
        <div className="container mx-auto p-10 max-w-5xl">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Source des Données</DialogTitle>
                        <DialogDescription>
                            Sélectionnez le fichier (Balance) à utiliser pour générer cet état.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="source" className="text-right">
                                Fichier Source
                            </Label>
                            <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Sélectionner un fichier..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tout le dossier (Cumul)</SelectItem>
                                    {documents.map((doc) => (
                                        <SelectItem key={doc.id} value={doc.id.toString()}>
                                            {doc.name} ({new Date(doc.created_at).toLocaleDateString()})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedDocId === "all" && (
                            <p className="text-sm text-muted-foreground text-center">
                                Attention : Toutes les écritures du dossier comptable seront utilisées.
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleConfirmGenerate} className="bg-blue-600 hover:bg-blue-700">
                            <FileDown className="mr-2 h-4 w-4" /> Confirmer & Générer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                <Card className="border-l-4 border-l-green-600 shadow-md transform hover:-translate-y-1 transition-transform duration-200">
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
                        <Button onClick={() => handleOpenDialog("normal")} disabled={!!generating} className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
                            {generating === "normal" ? (
                                <>Génération en cours...</>
                            ) : (
                                <><FileDown className="mr-2 h-5 w-5" /> Générer Excel (.xlsx)</>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-600 shadow-md transform hover:-translate-y-1 transition-transform duration-200">
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
                        <Button onClick={() => handleOpenDialog("smt")} disabled={!!generating} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                            {generating === "smt" ? (
                                <>Génération en cours...</>
                            ) : (
                                <><FileDown className="mr-2 h-5 w-5" /> Générer SMT (.xlsx)</>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
