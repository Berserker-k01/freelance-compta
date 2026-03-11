"use client";

import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    FileDown, FileText, ArrowLeft, CheckCircle, XCircle,
    AlertTriangle, Loader2, ShieldAlert, ShieldCheck, RefreshCw, Upload, FileSignature, Settings, FileSpreadsheet, Trash2, Save
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
    generateLiasse,
    validatePrerequisites, ValidationResult, PrerequisiteCheck,
    getPreflightCheck, PreflightResult,
    getTemplates, Template, uploadTemplate, updateTemplateMapping, deleteTemplate
} from "@/lib/templates-api";
import { Textarea } from "@/components/ui/textarea";
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
    const [preflight, setPreflight] = useState<PreflightResult | null>(null);
    const [generateError, setGenerateError] = useState<string | null>(null);

    // Upload state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadName, setUploadName] = useState("Modèle Personnalisé");

    // Mapping Editor states
    const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [mappingValue, setMappingValue] = useState("");
    const [savingMapping, setSavingMapping] = useState(false);

    useEffect(() => {
        if (!activeCompany) {
            setDocuments([]);
            return;
        }
        setDocuments([]);
        getDocuments(activeCompany.id).then(docs => {
            setDocuments(docs.filter(d => d.file_type === "balance"));
        });
        loadTemplates(); // Global templates
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
        setPreflight(null);
        setGenerateError(null);
        try {
            const docId = selectedDocId === "all" ? undefined : selectedDocId;
            const [valResult, prefResult] = await Promise.all([
                validatePrerequisites(activeCompany.id, docId),
                getPreflightCheck(activeCompany.id, docId).catch(() => null)
            ]);
            setValidation(valResult);
            setPreflight(prefResult);
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

    const handleOpenDialog = (mode: "normal" | "smt" | "custom" = "custom") => {
        setTargetMode(mode);
        setValidation(null);
        setPreflight(null);
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

        const docId = selectedDocId === "all" ? undefined : selectedDocId;

        try {
            if (!selectedTemplateId) throw new Error("Veuillez sélectionner un modèle.");
            const tmpl = templates.find(t => t.id.toString() === selectedTemplateId);
            const filename = `Liasse_${tmpl?.name}_${activeCompany.name}_2026.xlsx`;
            await generateLiasse(activeCompany.id, filename, docId, selectedTemplateId);
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

    const handleEditMappingClick = (t: Template) => {
        setEditingTemplate(t);
        try {
            const parsed = JSON.parse(t.mapping_config || "{}");
            setMappingValue(JSON.stringify(parsed, null, 4));
        } catch {
            setMappingValue(t.mapping_config || "{\n\n}");
        }
        setIsMappingDialogOpen(true);
    };

    const handleSaveMapping = async () => {
        if (!editingTemplate) return;
        setSavingMapping(true);
        try {
            JSON.parse(mappingValue); // Validate JSON format
            await updateTemplateMapping(editingTemplate.id, mappingValue);
            await loadTemplates();
            setIsMappingDialogOpen(false);
        } catch (error: any) {
            alert("Erreur JSON invalide ou sauvegarde échouée : " + error.message);
        } finally {
            setSavingMapping(false);
        }
    };

    const handleDeleteTemplate = async (id: string, name: string) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer le modèle "${name}" ?`)) return;
        try {
            await deleteTemplate(id);
            await loadTemplates();
        } catch (error: any) {
            alert("Erreur lors de la suppression : " + error.message);
        }
    };

    if (!activeCompany) return (
        <div className="p-10 text-muted-foreground">Veuillez sélectionner un dossier.</div>
    );

    const nbKO = validation?.checks.filter(c => c.status === "KO").length ?? 0;
    const nbWarn = validation?.checks.filter(c => c.status === "WARNING").length ?? 0;

    return (
        <div className="container mx-auto p-10 max-w-5xl bg-[#1a2332] min-h-screen text-slate-200 selection:bg-purple-500/30">

            {/* ---- UPLOAD DIALOG ---- */}
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-700 text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-slate-100">Smart Loader - Nouveau Canevas</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Uploadez un fichier Excel vierge (Normes OTR, Bénin, UEMOA). Notre IA "Auto-Mapping" va lire le fichier pour localiser les cellules à remplir.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Nom du Modèle</Label>
                            <Input className="bg-slate-950 border-slate-700 text-slate-200" value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="Ex: Liasse OTR 2028" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Fichier (.xlsx)</Label>
                            <Input className="bg-slate-950 border-slate-700 text-slate-200 file:text-slate-200" type="file" accept=".xlsx" ref={fileInputRef} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300" onClick={() => setIsUploadDialogOpen(false)}>Annuler</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={handleUploadTemplate} disabled={uploading}>
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                            Importer et Analyser
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---- GENERATE DIALOG ---- */}
            <Dialog open={isDialogOpen} onOpenChange={(open: boolean) => { setIsDialogOpen(open); if (!open) setValidation(null); }}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-100">
                            {validating ? <Loader2 className="h-5 w-5 animate-spin" /> :
                                validation?.ready ? <ShieldCheck className="h-5 w-5 text-emerald-400" /> :
                                    validation ? <ShieldAlert className="h-5 w-5 text-red-400" /> :
                                        <FileText className="h-5 w-5" />
                            }
                            Vérification avant génération
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Dossier : <span className="font-medium text-slate-200">{activeCompany.name}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {/* Source selector */}
                    <div className="grid gap-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-300">Modèle Utilisé</Label>
                            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-200">
                                    <SelectValue placeholder="Sélectionner un modèle..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                    {templates.map((t) => (
                                        <SelectItem key={t.id} value={t.id.toString()} className="focus:bg-slate-800 focus:text-slate-100">{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="source" className="text-sm font-medium text-slate-300">Source des données (Balance)</Label>
                            <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                                <SelectTrigger id="source" className="bg-slate-950 border-slate-700 text-slate-200">
                                    <SelectValue placeholder="Sélectionner un fichier..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                                    <SelectItem value="all" className="focus:bg-slate-800 focus:text-slate-100">Tout le dossier (cumul)</SelectItem>
                                    {documents.map((doc) => (
                                        <SelectItem key={doc.id} value={doc.id.toString()} className="focus:bg-slate-800 focus:text-slate-100">
                                            {doc.name} — {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedDocId === "all" && (
                            <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-900/50 rounded px-3 py-2">
                                ⚠ Toutes les écritures du dossier seront utilisées.
                            </p>
                        )}
                    </div>

                    {/* Validation Results */}
                    <div className="space-y-2">
                        {validating && (
                            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
                        )}
                        {validation && !validating && (
                            <>
                                <div className={cn(
                                    "flex items-center justify-between rounded-lg px-4 py-3 border text-sm font-medium",
                                    validation.ready ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400" : "bg-red-950/30 border-red-900/50 text-red-400"
                                )}>
                                    <div className="flex items-center gap-2">
                                        {validation.ready
                                            ? <><ShieldCheck className="h-4 w-4" /> Prêt pour la génération</>
                                            : <><ShieldAlert className="h-4 w-4" /> Génération impossible</>
                                        }
                                    </div>
                                    <div className="flex gap-2 text-xs">
                                        {nbKO > 0 && <Badge variant="destructive" className="bg-red-900/80 text-red-100">{nbKO} bloquant{nbKO > 1 ? "s" : ""}</Badge>}
                                        {nbWarn > 0 && <Badge className="bg-amber-600 hover:bg-amber-500 text-white">{nbWarn} alerte{nbWarn > 1 ? "s" : ""}</Badge>}
                                        {nbKO === 0 && nbWarn === 0 && <Badge className="bg-emerald-600/80 text-emerald-50">Tout OK</Badge>}
                                    </div>
                                </div>
                                {validation.blockers.length > 0 && (
                                    <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3">
                                        {validation.blockers.map((b, i) => (<p key={i} className="text-xs text-red-400">• {b}</p>))}
                                    </div>
                                )}
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                                    {validation.checks.map((check, i) => (
                                        <div key={i} className={cn("flex items-start gap-3 rounded-lg border p-3 text-sm",
                                            check.status === "OK" ? "bg-emerald-950/20 border-emerald-900/30" :
                                                check.status === "WARNING" ? "bg-amber-950/20 border-amber-900/30" :
                                                    "bg-red-950/20 border-red-900/30"
                                        )}>
                                            {check.status === "OK" ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> :
                                                check.status === "WARNING" ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /> :
                                                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-slate-200">{check.name}</div>
                                                <div className="text-slate-400 text-xs mt-0.5 leading-relaxed break-words">{check.detail}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        {generateError && (
                            <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400 font-medium">
                                Erreur: {generateError}
                            </div>
                        )}

                        {/* PREFLIGHT VISUAL BALANCE CHUNKS */}
                        {preflight && validation && validation.ready && (
                            <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 mt-2 grid grid-cols-2 gap-3">
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-1">Total Débit</h4>
                                    <p className="text-sm font-mono text-slate-300">{preflight.total_debit.toLocaleString("fr-FR")} <span className="text-xs text-slate-500">FCFA</span></p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-1">Total Crédit</h4>
                                    <p className="text-sm font-mono text-slate-300">{preflight.total_credit.toLocaleString("fr-FR")} <span className="text-xs text-slate-500">FCFA</span></p>
                                </div>

                                {preflight.compte_13_present && (
                                    <div className="col-span-2 pt-2 mt-1 border-t border-slate-800/50 flex justify-between items-center">
                                        <div>
                                            <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-0.5">Résultat Net (Compte 13)</h4>
                                            <p className={cn("text-sm font-medium", preflight.resultat_net_13 < 0 ? "text-emerald-400" : "text-amber-400")}>
                                                {preflight.resultat_net_13 < 0 ? "Bénéfice de " : "Perte de "}
                                                {Math.abs(preflight.resultat_net_13).toLocaleString("fr-FR")} FCFA
                                            </p>
                                        </div>
                                        <Badge className="bg-slate-800 text-slate-300 pointer-events-none">{preflight.nb_comptes} comptes</Badge>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                        <Button onClick={handleConfirmGenerate} disabled={!validation?.ready || validating || !!generating} className="bg-blue-600 hover:bg-blue-500 text-white">
                            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Générer & Télécharger
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---- PAGE HEADER ---- */}
            <div className="flex flex-col gap-1 mb-10">
                <div className="text-[13px] text-slate-400 flex items-center gap-1.5 mb-1 font-medium">
                    <span className="hover:text-slate-300 cursor-pointer">Home</span> <span className="text-slate-600">/</span>
                    <span className="hover:text-slate-300 cursor-pointer">Dashboard</span>
                </div>
                <h1 className="text-3xl font-semibold text-white tracking-tight">
                    États Financiers & Modèles
                </h1>
            </div>

            {/* ---- SECTION STATS OFFICIELS ---- */}
            <div className="mb-12">
                <h2 className="text-[17px] font-semibold tracking-wide text-slate-200 flex items-center gap-2 mb-5">
                    Déclarations Officielles (OTR)
                </h2>
                <div className="grid gap-6 md:grid-cols-2">

                    {/* LIASSE NORMALE CARD (Purple Glow) */}
                    <div className="relative group">
                        {/* Glow effect */}
                        <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500/20 to-blue-500/0 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition duration-500"></div>

                        <Card className="relative h-full border-0 shadow-2xl rounded-2xl bg-[#232d3f]/80 backdrop-blur-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-purple-500/40 transition-all duration-300">
                            {/* Inner gradient artifact */}
                            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-emerald-500/10 to-transparent opacity-50"></div>

                            <CardContent className="p-6 relative z-10 flex flex-col sm:flex-row gap-6 items-start h-full">
                                {/* Icon / Illustration Area */}
                                <div className="shrink-0 w-32 h-36 bg-slate-800/50 rounded-xl border border-white/5 flex items-center justify-center p-3 relative mt-1 shadow-inner">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl"></div>
                                    {/* Mock Document */}
                                    <div className="w-full h-full bg-slate-100 rounded-md shadow-sm border border-slate-300 relative transform -rotate-2">
                                        <div className="absolute top-2 left-2 bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">TAX</div>
                                        <div className="mt-8 px-2 space-y-1">
                                            <div className="h-1.5 w-full bg-slate-300 rounded-full"></div>
                                            <div className="h-1.5 w-4/5 bg-slate-300 rounded-full"></div>
                                            <div className="h-1.5 w-full bg-slate-200 mt-2 rounded-full"></div>
                                            <div className="h-1.5 w-full bg-slate-200 rounded-full"></div>
                                            <div className="h-1.5 w-2/3 bg-slate-200 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col h-full">
                                    <h3 className="text-[17px] font-semibold text-white leading-tight mb-2">Liasse Fiscale Complète<br />(Normal)</h3>
                                    <p className="text-[13px] text-slate-400 mb-4 leading-relaxed">
                                        Liasse fiscale complète (normal) and fiscale fiscale normal.
                                    </p>

                                    <div className="mb-6">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                                            Ready to File
                                        </div>
                                    </div>

                                    <div className="mt-auto flex gap-3">
                                        <Button
                                            onClick={() => handleOpenDialog("normal")}
                                            disabled={!!generating}
                                            className="bg-white hover:bg-slate-200 text-slate-900 h-9 rounded-lg font-semibold shadow-md text-[13px] px-5"
                                        >
                                            {generating === "normal" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Report"}
                                        </Button>
                                        <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white h-9 rounded-lg text-[13px] px-5">
                                            Review
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* SMT CARD (Green Glow) */}
                    <div className="relative group">
                        {/* Glow effect */}
                        <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/20 to-blue-500/0 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition duration-500"></div>

                        <Card className="relative h-full border-0 shadow-2xl rounded-2xl bg-[#232d3f]/80 backdrop-blur-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-emerald-500/40 transition-all duration-300">
                            {/* Inner gradient artifact */}
                            <div className="absolute bottom-0 right-0 w-2/3 h-2/3 bg-gradient-to-tl from-emerald-500/10 to-transparent opacity-50"></div>

                            <CardContent className="p-6 relative z-10 flex flex-col sm:flex-row gap-6 items-start h-full">
                                {/* Icon / Illustration Area */}
                                <div className="shrink-0 w-32 h-36 bg-slate-800/50 rounded-xl border border-white/5 flex items-center justify-center p-3 relative mt-1 shadow-inner">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl"></div>
                                    {/* Mock Chart Doc */}
                                    <div className="w-full h-full bg-white rounded-md shadow-sm border border-slate-200 flex flex-col px-2 py-3 overflow-hidden transform rotate-1">
                                        <div className="text-[9px] font-bold text-slate-700 mb-2">Cash Flow</div>
                                        <div className="flex items-end gap-1 h-8 border-b border-slate-100 pb-1 mb-2">
                                            <div className="w-3 bg-emerald-400 h-full rounded-t-sm"></div>
                                            <div className="w-3 bg-blue-500 h-[60%] rounded-t-sm"></div>
                                            <div className="w-3 bg-emerald-400 h-[80%] rounded-t-sm"></div>
                                            <div className="w-3 bg-blue-500 h-[40%] rounded-t-sm"></div>
                                            <div className="w-3 bg-slate-300 h-[70%] rounded-t-sm"></div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center"><div className="text-[6px] text-slate-500 font-bold">Status</div><div className="w-8 h-1 bg-emerald-400 rounded-full"></div></div>
                                            <div className="w-full h-[1px] bg-slate-100"></div>
                                            <div className="flex justify-between items-center"><div className="text-[6px] text-slate-500 font-bold">Metric</div><div className="w-6 h-1 bg-slate-300 rounded-full"></div></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col h-full">
                                    <h3 className="text-[17px] font-semibold text-white leading-tight mb-2">Système Minimal de<br />Trésorerie (SMT)</h3>
                                    <p className="text-[13px] text-slate-400 mb-4 leading-relaxed">
                                        Système minimal de reporting.
                                    </p>

                                    <div className="mb-6 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-emerald-400"></span> Metrics to</div>
                                            <div className="font-semibold text-white pl-2.5">Cash flow</div>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-purple-400"></span> Report mex.</div>
                                            <div className="font-semibold text-white pl-2.5">reporting</div>
                                        </div>
                                    </div>

                                    <div className="mt-auto flex gap-3">
                                        <Button
                                            onClick={() => handleOpenDialog("smt")}
                                            disabled={!!generating}
                                            className="bg-white hover:bg-slate-200 text-slate-900 h-9 rounded-lg font-semibold shadow-md text-[13px] px-5"
                                        >
                                            {generating === "smt" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Report"}
                                        </Button>
                                        <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white h-9 rounded-lg text-[13px] px-5">
                                            Review
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* ---- SECTION MODELES DYNAMIQUES ---- */}
            <div>
                <div className="mb-6 shadow-[0_1px_0_0_rgba(255,255,255,0.05)] pb-1">
                    <h2 className="text-[17px] font-semibold tracking-wide text-slate-200 mb-1">
                        Modèles Personnalisés & Auto-Mapping
                    </h2>
                    <p className="text-[13px] text-slate-400">Upload & Map new template and configure mapping template.</p>
                </div>

                <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

                    {/* UPLOAD NEW CARD */}
                    <div className="relative h-[280px] group cursor-pointer" onClick={() => setIsUploadDialogOpen(true)}>
                        <div className="absolute inset-0 bg-[#232d3f]/60 rounded-xl border-2 border-dashed border-slate-600/60 group-hover:border-emerald-500/50 group-hover:bg-[#232d3f]/80 transition-all duration-300 flex flex-col items-center justify-center p-6 text-center">
                            <div className="mb-4 relative">
                                <FileSpreadsheet className="w-16 h-16 text-slate-500 group-hover:text-emerald-500/70 transition-colors" />
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">X</div>
                            </div>
                            <h3 className="text-white font-medium text-[15px] mb-1">Upload & Map New</h3>
                            <p className="text-[11px] text-slate-400 mb-6">Excel, CSV</p>
                            <Button className="bg-white hover:bg-slate-200 text-slate-900 h-8 rounded-md font-semibold text-[12px] px-6">
                                Choose File
                            </Button>
                        </div>
                    </div>

                    {/* DYNAMIC TEMPLATES LIST */}
                    {templates.map(t => {
                        const isMapped = t.mapping_config && t.mapping_config !== "{}" && t.mapping_config !== "{\n\n}";
                        return (
                            <Card key={t.id} className="relative h-[280px] bg-[#232d3f]/80 backdrop-blur-md border-0 ring-1 ring-white/10 rounded-xl overflow-hidden hover:ring-white/20 transition-all flex flex-col">
                                <CardContent className="p-4 flex-1 flex flex-col relative">
                                    {/* Mock Mapping Visualization */}
                                    <div className="bg-white rounded-lg shadow-inner flex flex-col p-3 mb-4 flex-1 min-h-[140px]">
                                        {/* Browser-like dots */}
                                        <div className="flex gap-1 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                        </div>
                                        <div className="flex justify-between text-[9px] font-semibold text-slate-500 mb-3 px-1 uppercase tracking-wider">
                                            <span>Source</span>
                                            <span>Target</span>
                                        </div>
                                        {/* Mapping Rows */}
                                        <div className="flex-1 flex flex-col justify-around relative px-1">
                                            {/* Bezier Curves Mock */}
                                            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                                                <path d="M 40 20 C 70 20, 70 60, 100 60" fill="transparent" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" />
                                                <path d="M 40 60 C 70 60, 70 20, 100 20" fill="transparent" stroke="rgba(59,130,246,0.3)" strokeWidth="1.5" />
                                                <path d="M 40 100 C 70 100, 70 100, 100 100" fill="transparent" stroke="rgba(52,211,153,0.3)" strokeWidth="1.5" />
                                            </svg>

                                            <div className="flex justify-between items-center relative z-10 w-full">
                                                <div className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded w-16 text-center font-medium shadow-sm">P&L</div>
                                                <div className="bg-slate-100 border border-slate-200 text-slate-400 text-[10px] px-2 py-1 rounded w-[80px] shadow-sm truncate">Accounts...</div>
                                            </div>
                                            <div className="flex justify-between items-center relative z-10 w-full">
                                                <div className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded w-16 text-center font-medium shadow-sm">P&E</div>
                                                <div className="bg-slate-100 border border-slate-200 text-slate-400 text-[10px] px-2 py-1 rounded w-[80px] shadow-sm truncate">Accounts...</div>
                                            </div>
                                            <div className="flex justify-between items-center relative z-10 w-full">
                                                <div className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded w-16 text-center font-medium shadow-sm">PSB</div>
                                                <div className="bg-slate-100 border border-slate-200 text-slate-400 text-[10px] px-2 py-1 rounded w-[80px] shadow-sm truncate">Accounts...</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Template Info */}
                                    <div className="mt-auto">
                                        <h4 className="text-[13px] font-semibold text-white leading-tight mb-2 line-clamp-2" title={t.name}>{t.name}</h4>
                                        <div className="flex justify-between items-end">
                                            <p className="text-[11px] text-slate-400">{isMapped ? "Mapped" : "Unmapped"} • Ex {t.year}</p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditMappingClick(t) }}
                                                    className="text-slate-400 hover:text-white transition-colors"
                                                    title="Configurer Line Mapping"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id.toString(), t.name) }}
                                                    className="text-slate-500 hover:text-red-400 transition-colors"
                                                    title="Supprimer le modèle"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action overlays like "Generate" could be added here on hover, but keeping it clean for now */}
                                </CardContent>
                                {isMapped && (
                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] z-20"></div>
                                )}
                            </Card>
                        )
                    })}
                </div>
            </div>

            {/* ---- MAPPING EDITOR DIALOG (Cerveau) ---- */}
            <Dialog open={isMappingDialogOpen} onOpenChange={setIsMappingDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-slate-700 bg-slate-900 shadow-2xl text-slate-200">
                    <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-lg">
                                <Settings className="h-5 w-5 text-orange-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-slate-100 text-lg">Éditeur d&apos;Auto-Mapping</DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs">
                                    Modèle : <span className="text-orange-400 font-mono">{editingTemplate?.name}</span>
                                </DialogDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsMappingDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                            <XCircle className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex flex-1 overflow-hidden h-[600px]">
                        {/* Editor Section */}
                        <div className="flex-1 flex flex-col bg-[#0d131f]">
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                config.json
                            </div>
                            <div className="flex-1 relative overflow-hidden group">
                                <Textarea
                                    className="font-mono text-sm h-full w-full border-none focus-visible:ring-0 p-6 resize-none bg-transparent text-slate-300 selection:bg-orange-500/30 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 focus:outline-none"
                                    value={mappingValue}
                                    onChange={e => setMappingValue(e.target.value)}
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        {/* Help / Guide Section */}
                        <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto hidden md:block">
                            <h4 className="text-slate-200 font-semibold text-sm mb-4 flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Guide de Syntaxe
                            </h4>
                            <div className="space-y-6">
                                <section>
                                    <p className="text-[11px] text-slate-500 font-bold mb-2 uppercase tracking-wider">Structure Clé</p>
                                    <div className="bg-[#0d131f] p-3 rounded-md border border-slate-800 font-mono text-xs text-slate-300">
                                        "Feuille!Cellule"
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 italic">Ex: "BILAN ACTIF!C15"</p>
                                </section>

                                <section>
                                    <p className="text-[11px] text-slate-500 font-bold mb-2 uppercase tracking-wider">Règles Comptables</p>
                                    <ul className="space-y-2 text-[11px] text-slate-400">
                                        <li><code className="text-orange-400 font-mono text-[12px] bg-orange-400/10 px-1 rounded">"411*"</code> : Totaux des comptes 411</li>
                                        <li><code className="text-orange-400 font-mono text-[12px] bg-orange-400/10 px-1 rounded">"-70*"</code> : Inverse le signe (Produits)</li>
                                        <li><code className="text-orange-400 font-mono text-[12px] bg-orange-400/10 px-1 rounded">"ABS(28*)"</code> : Force en valeur absolue</li>
                                        <li><code className="text-orange-400 font-mono text-[12px] bg-orange-400/10 px-1 rounded">"60*, 61*"</code> : Somme de plusieurs groupes</li>
                                    </ul>
                                </section>

                                <section>
                                    <p className="text-[11px] text-slate-500 font-bold mb-2 uppercase tracking-wider">Variables Annexes</p>
                                    <ul className="space-y-2 text-[11px] text-slate-400">
                                        <li><code className="text-blue-400 font-mono text-[12px] bg-blue-400/10 px-1 rounded">"#nif"</code> : NIF de la société</li>
                                        <li><code className="text-blue-400 font-mono text-[12px] bg-blue-400/10 px-1 rounded">"#dirigeant_nom"</code> : Nom du dirigeant</li>
                                        <li><code className="text-blue-400 font-mono text-[12px] bg-blue-400/10 px-1 rounded">"#effectif_total"</code> : Total salariés</li>
                                    </ul>
                                </section>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsMappingDialogOpen(false)}
                            className="bg-transparent border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSaveMapping}
                            disabled={savingMapping}
                            className="bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-lg shadow-orange-900/20"
                        >
                            {savingMapping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Sauvegarder les règles
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
