"use client";

import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    FileDown, FileText, ArrowLeft, CheckCircle, XCircle,
    AlertTriangle, Loader2, ShieldAlert, ShieldCheck, RefreshCw, Upload, FileSignature, Settings
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
    generateLiasse,
    validatePrerequisites, ValidationResult, PrerequisiteCheck,
    getTemplates, Template, uploadTemplate
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

export default function TemplatesPage() {
    const { activeCompany } = useCompany();
    const [generating, setGenerating] = useState<string | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string>("all");
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    // Dialog States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [targetMode, setTargetMode] = useState<"normal" | "smt" | "custom" | null>(null);

    // Validation state
    const [validating, setValidating] = useState(false);
    const [validation, setValidation] = useState<ValidationResult | null>(null);
    const [generateError, setGenerateError] = useState<string | null>(null);

    // Upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadName, setUploadName] = useState("Modèle Personnalisé");

    useEffect(() => {
        if (activeCompany) {
            getDocuments(activeCompany.id).then(docs => {
                setDocuments(docs.filter(d => d.file_type === "balance"));
            });
        }
        loadTemplates();
    }, [activeCompany]);

    const loadTemplates = async () => {
        try {
            const data = await getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error(error);
        }
    }

    useEffect(() => {
        if (!isDialogOpen || !activeCompany) return;
        runValidation();
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
                    name: "Connexion", status: "KO", detail: "Le serveur est inaccessible."
                }],
            });
        } finally {
            setValidating(false);
        }
    };

    const handleOpenDialog = () => {
        setTargetMode("custom");
        setValidation(null);
        setGenerateError(null);
        setSelectedDocId(documents.length > 0 ? documents[0].id.toString() : "all");
        if (templates.length > 0) {
            setSelectedTemplateId(templates[0].id.toString());
        } else {
            setSelectedTemplateId("");
        }
        setIsDialogOpen(true);
    };

    const handleConfirmGenerate = async () => {
        if (!activeCompany || !targetMode) return;

        setGenerating(targetMode);
        setGenerateError(null);

        const docId = selectedDocId === "all" ? undefined : parseInt(selectedDocId);

        try {
            if (!selectedTemplateId) throw new Error("Veuillez sélectionner un modèle.");
            const tmpl = templates.find(t => t.id.toString() === selectedTemplateId);
            const filename = `Liasse_${tmpl?.name}_${activeCompany.name}_2026.xlsx`;
            await generateLiasse(activeCompany.id, filename, docId, parseInt(selectedTemplateId));
            setIsDialogOpen(false);
        } catch (error: any) {
            setGenerateError(error.message || "Erreur lors de la génération.");
        } finally {
            setGenerating(null);
        }
    };

    const handleUploadTemplate = async () => {
        if (!fileInputRef.current?.files?.[0]) return;
        const file = fileInputRef.current.files[0];

        setUploading(true);
        try {
            await uploadTemplate(file, uploadName, 2026);
            await loadTemplates();
            setIsUploadDialogOpen(false);
            setUploadName("Modèle Personnalisé");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setUploading(false);
        }
    }

    if (!activeCompany) return (
        <div className="p-10 text-muted-foreground">Veuillez sélectionner un dossier.</div>
    );

    const nbKO = validation?.checks.filter(c => c.status === "KO").length ?? 0;
    const nbWarn = validation?.checks.filter(c => c.status === "WARNING").length ?? 0;

    return (
        <div className="container mx-auto p-10 max-w-5xl">

            {/* ---- UPLOAD DIALOG ---- */}
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Smart Loader - Nouveau Canevas</DialogTitle>
                        <DialogDescription>
                            Uploadez un fichier Excel vierge (Normes OTR, Bénin, UEMOA). Notre IA "Auto-Mapping" va lire le fichier pour localiser les cellules à remplir.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nom du Modèle</Label>
                            <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="Ex: Liasse OTR 2028" />
                        </div>
                        <div className="space-y-2">
                            <Label>Fichier (.xlsx)</Label>
                            <Input type="file" accept=".xlsx" ref={fileInputRef} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleUploadTemplate} disabled={uploading}>
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                            Importer et Analyser
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---- GENERATE DIALOG ---- */}
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
                            Dossier : <span className="font-medium text-foreground">{activeCompany.name}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {/* Source selector */}
                    <div className="grid gap-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Modèle Utilisé</Label>
                            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un modèle..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map((t) => (
                                        <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="source" className="text-sm font-medium">Source des données (Balance)</Label>
                            <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                                <SelectTrigger id="source">
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
                                ⚠ Toutes les écritures du dossier seront utilisées.
                            </p>
                        )}
                    </div>

                    {/* Validation Results */}
                    <div className="space-y-2">
                        {validating && (
                            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        )}
                        {validation && !validating && (
                            <>
                                <div className={cn(
                                    "flex items-center justify-between rounded-lg px-4 py-3 border text-sm font-medium",
                                    validation.ready ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-red-50 border-red-300 text-red-800"
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
                                {validation.blockers.length > 0 && (
                                    <div className="rounded-lg border border-red-300 bg-red-50 p-3">
                                        {validation.blockers.map((b, i) => (<p key={i} className="text-xs text-red-700">• {b}</p>))}
                                    </div>
                                )}
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {validation.checks.map((check, i) => (<CheckRow key={i} check={check} />))}
                                </div>
                            </>
                        )}
                        {generateError && (
                            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
                                Erreur: {generateError}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleConfirmGenerate} disabled={!validation?.ready || validating || !!generating} className="bg-blue-600 hover:bg-blue-700">
                            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Générer & Télécharger
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
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-blue-900 border-b pb-2 tracking-tight">
                            États Financiers & Modèles
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Génération automatisée (Liasse standard, SMT et canevas importés dynamiques).
                        </p>
                    </div>
                </div>
            </div>

            {/* ---- CARDS ---- */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">


                {/* DYNAMIC TEMPLATES UPLOADED */}
                <Card className="border-l-4 border-l-purple-600 shadow-md bg-purple-50/20">
                    <CardHeader>
                        <CardTitle className="text-lg flex justify-between items-center gap-2">
                            <span className="flex items-center gap-2"><FileSignature className="h-5 w-5 text-purple-600" /> Modèles Dynamiques</span>
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 shadow-none border-purple-200">{templates.length}</Badge>
                        </CardTitle>
                        <CardDescription>Canevas importés et "Auto-Mappés".</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {templates.length > 0 ? (
                            <Button onClick={() => handleOpenDialog()} disabled={!!generating} variant="outline" className="w-full h-10 border-purple-300 text-purple-700 hover:bg-purple-50">
                                <FileDown className="mr-2 h-4 w-4" /> Générer via un de mes modèles
                            </Button>
                        ) : (
                            <p className="text-sm text-center text-muted-foreground p-2 blur-[0.2px]">Aucun modèle personnalisé</p>
                        )}
                        <Button onClick={() => setIsUploadDialogOpen(true)} variant="secondary" className="w-full h-10">
                            <Upload className="mr-2 h-4 w-4" /> Importer un nouveau Canevas
                        </Button>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
