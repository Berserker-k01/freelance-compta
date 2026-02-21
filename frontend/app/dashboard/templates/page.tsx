"use client";

import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    FileDown, FileText, ArrowLeft, CheckCircle, XCircle,
    AlertTriangle, Loader2, ShieldAlert, ShieldCheck, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
    generateLiasse, generateSMT,
    validatePrerequisites, ValidationResult, PrerequisiteCheck
} from "@/lib/templates-api";
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
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// CHECK ROW COMPONENT
// ---------------------------------------------------------------------------
function CheckRow({ check }: { check: PrerequisiteCheck }) {
    const icon =
        check.status === "OK" ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> :
            check.status === "WARNING" ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /> :
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />;

    const bg =
        check.status === "OK" ? "bg-emerald-50 border-emerald-200" :
            check.status === "WARNING" ? "bg-amber-50 border-amber-200" :
                "bg-red-50 border-red-200";

    return (
        <div className={cn("flex items-start gap-3 rounded-lg border p-3 text-sm", bg)}>
            {icon}
            <div className="min-w-0 flex-1">
                <div className="font-semibold">{check.name}</div>
                <div className="text-muted-foreground text-xs mt-0.5 leading-relaxed break-words">{check.detail}</div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// PAGE
// ---------------------------------------------------------------------------
export default function TemplatesPage() {
    const { activeCompany } = useCompany();
    const [generating, setGenerating] = useState<string | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string>("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [targetMode, setTargetMode] = useState<"normal" | "smt" | null>(null);

    // Validation state
    const [validating, setValidating] = useState(false);
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [generateError, setGenerateError] = useState<string | null>(null);

    useEffect(() => {
        if (activeCompany) {
            getDocuments(activeCompany.id).then(docs => {
                setDocuments(docs.filter(d => d.file_type === "balance"));
            });
        }
    }, [activeCompany]);

    // Re-run validation whenever the selected document changes (in dialog)
    useEffect(() => {
        if (!isDialogOpen || !activeCompany) return;
        runValidation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDocId, isDialogOpen]);

    const runValidation = async () => {
        if (!activeCompany) return;
        setValidating(true);
        setValidation(null);
        setGenerateError(null);
        try {
            const docId = selectedDocId === "all" ? undefined : parseInt(selectedDocId);
            const result = await validatePrerequisites(activeCompany.id, docId);
            setValidation(result);
        } catch {
            setValidation({
                ready: false,
                blockers: ["Impossible de contacter le serveur pour vérifier les prérequis."],
                warnings: [],
                checks: [{
                    name: "Connexion au serveur",
                    status: "KO",
                    detail: "Le serveur backend est inaccessible. Vérifiez qu'il est démarré.",
                }],
            });
        } finally {
            setValidating(false);
        }
    };

    const handleOpenDialog = (mode: "normal" | "smt") => {
        setTargetMode(mode);
        setValidation(null);
        setGenerateError(null);
        if (documents.length > 0) {
            setSelectedDocId(documents[0].id.toString());
        } else {
            setSelectedDocId("all");
        }
        setIsDialogOpen(true);
    };

    const handleConfirmGenerate = async () => {
        if (!activeCompany || !targetMode) return;

        setGenerating(targetMode);
        setGenerateError(null);

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
            setIsDialogOpen(false);
        } catch (error: unknown) {
            setGenerateError(error instanceof Error ? error.message : "Erreur lors de la génération.");
        } finally {
            setGenerating(null);
        }
    };

    if (!activeCompany) return (
        <div className="p-10 text-muted-foreground">Veuillez sélectionner un dossier.</div>
    );

    const nbKO = validation?.checks.filter(c => c.status === "KO").length ?? 0;
    const nbWarn = validation?.checks.filter(c => c.status === "WARNING").length ?? 0;

    return (
        <div className="container mx-auto p-10 max-w-5xl">

            {/* ---- DIALOG ---- */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setValidation(null); }}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {validating ? <Loader2 className="h-5 w-5 animate-spin" /> :
                                validation?.ready ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> :
                                    validation ? <ShieldAlert className="h-5 w-5 text-red-500" /> :
                                        <FileText className="h-5 w-5" />
                            }
                            Vérification avant génération
                        </DialogTitle>
                        <DialogDescription>
                            {targetMode === "normal" ? "Liasse Fiscale Complète (SYSCOHADA)" : "SMT — Système Minimal de Trésorerie"}
                            {" — "}Dossier : <span className="font-medium text-foreground">{activeCompany.name}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {/* Source selector */}
                    <div className="grid gap-3 py-2">
                        <div className="flex items-center gap-3">
                            <Label htmlFor="source" className="shrink-0 text-sm font-medium">
                                Source des données
                            </Label>
                            <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                                <SelectTrigger id="source" className="flex-1">
                                    <SelectValue placeholder="Sélectionner un fichier..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tout le dossier (cumul)</SelectItem>
                                    {documents.map((doc) => (
                                        <SelectItem key={doc.id} value={doc.id.toString()}>
                                            {doc.name} — {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedDocId === "all" && (
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                                ⚠ Toutes les écritures du dossier seront utilisées (cumul général).
                            </p>
                        )}
                    </div>

                    {/* Validation Results */}
                    <div className="space-y-2">
                        {/* Loading */}
                        {validating && (
                            <div className="flex items-center gap-3 text-sm text-muted-foreground py-4 justify-center">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Vérification des prérequis...
                            </div>
                        )}

                        {/* Summary banner */}
                        {validation && !validating && (
                            <>
                                <div className={cn(
                                    "flex items-center justify-between rounded-lg px-4 py-3 border text-sm font-medium",
                                    validation.ready
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                        : "bg-red-50 border-red-300 text-red-800"
                                )}>
                                    <div className="flex items-center gap-2">
                                        {validation.ready
                                            ? <><ShieldCheck className="h-4 w-4" /> Prêt pour la génération</>
                                            : <><ShieldAlert className="h-4 w-4" /> Génération impossible</>
                                        }
                                    </div>
                                    <div className="flex gap-2 text-xs">
                                        {nbKO > 0 && <Badge variant="destructive">{nbKO} bloquant{nbKO > 1 ? "s" : ""}</Badge>}
                                        {nbWarn > 0 && <Badge className="bg-amber-500 hover:bg-amber-600">{nbWarn} alerte{nbWarn > 1 ? "s" : ""}</Badge>}
                                        {nbKO === 0 && nbWarn === 0 && <Badge className="bg-emerald-600">Tout OK</Badge>}
                                    </div>
                                </div>

                                {/* Blockers highlighted */}
                                {validation.blockers.length > 0 && (
                                    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 space-y-1">
                                        <p className="text-xs font-bold text-red-700 uppercase tracking-wide">❌ Erreurs bloquantes</p>
                                        {validation.blockers.map((b, i) => (
                                            <p key={i} className="text-xs text-red-700 leading-relaxed">• {b}</p>
                                        ))}
                                    </div>
                                )}

                                {/* Detailed checks */}
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Détail des vérifications</p>
                                    {validation.checks.map((check, i) => (
                                        <CheckRow key={i} check={check} />
                                    ))}
                                </div>

                                {/* Refresh button */}
                                <Button variant="ghost" size="sm" onClick={runValidation} className="text-xs w-full mt-1">
                                    <RefreshCw className="h-3 w-3 mr-1.5" /> Relancer la vérification
                                </Button>
                            </>
                        )}

                        {/* Generation error */}
                        {generateError && (
                            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                                <p className="font-bold">Erreur de génération</p>
                                <p className="text-xs mt-1">{generateError}</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleConfirmGenerate}
                            disabled={
                                !validation?.ready ||
                                validating ||
                                !!generating
                            }
                            className={cn(
                                "min-w-36",
                                validation?.ready
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            )}
                        >
                            {generating ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération...</>
                            ) : (
                                <><FileDown className="mr-2 h-4 w-4" /> Générer & Télécharger</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---- PAGE HEADER ---- */}
            <div className="flex flex-col gap-4 mb-8">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="pl-0 hover:bg-transparent hover:underline text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Dashboard
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400">
                        États Financiers &amp; Fiscaux
                    </h1>
                    <p className="text-muted-foreground">
                        Génération automatique des liasses selon les normes SYSCOHADA Révisé — OTR Togo.
                    </p>
                </div>
            </div>

            {/* ---- CARDS ---- */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-l-4 border-l-emerald-600 shadow-md hover:-translate-y-1 transition-transform duration-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-6 w-6 text-emerald-600" />
                            Liasse Fiscale Complète (Normal)
                        </CardTitle>
                        <CardDescription>
                            Modèle officiel OTR 2025. Inclut Bilan, Compte de Résultat, TAFIRE et notes annexes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mb-6">
                            <li>Bilan Actif / Passif (Tableaux 1 &amp; 2)</li>
                            <li>Compte de Résultat (Tableau 3)</li>
                            <li>Passage Résultat Comptable → Fiscal (Tableau 4)</li>
                            <li>Tableau des Flux de Trésorerie (TAFIRE)</li>
                        </ul>
                        <Button
                            onClick={() => handleOpenDialog("normal")}
                            disabled={!!generating}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
                        >
                            {generating === "normal" ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération...</>
                            ) : (
                                <><FileDown className="mr-2 h-5 w-5" /> Générer (.xlsx)</>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-600 shadow-md hover:-translate-y-1 transition-transform duration-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-6 w-6 text-blue-600" />
                            Système Minimal de Trésorerie (SMT)
                        </CardTitle>
                        <CardDescription>
                            Pour les petites entités. Déclaration simplifiée OTR.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mb-6">
                            <li>Bilan Simplifié</li>
                            <li>Compte de Résultat Simplifié</li>
                            <li>État des Flux (simplifié)</li>
                        </ul>
                        <Button
                            onClick={() => handleOpenDialog("smt")}
                            disabled={!!generating}
                            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
                        >
                            {generating === "smt" ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération...</>
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
