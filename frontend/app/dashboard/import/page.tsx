"use client";

import { useState, useRef, useEffect } from "react";
import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Upload, FileSpreadsheet, CheckCircle, AlertCircle,
    ArrowLeft, AlertTriangle, ArrowRight, Table2, BookOpen, ChevronDown, Check
} from "lucide-react";
import { importBalance } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ImportResult {
    status: string;
    document_id: string;
    entries_count: number;
    accounts_created: number;
    accounts_matched: number;
    skipped_rows: number;
    fiscal_year: number;
    total_debit: number;
    total_credit: number;
    gap: number;
    gap_note: string | null;
}

const ACCEPTED_FORMATS = [
    { cols: "4 colonnes", desc: "Compte | Libellé | Débit | Crédit" },
    { cols: "6 colonnes", desc: "Compte | Libellé | Débit Mvt | Crédit Mvt | Solde D | Solde C" },
    { cols: "8 colonnes (standard)", desc: "Compte | Libellé | Débit | Crédit | AN D | AN C | Solde D | Solde C" },
];

export default function ImportPage() {
    const { activeCompany } = useCompany();
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFile(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [activeCompany]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setResult(null);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (
                droppedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                droppedFile.type === "application/vnd.ms-excel" ||
                droppedFile.type === "text/csv" ||
                droppedFile.name.endsWith('.xlsx') ||
                droppedFile.name.endsWith('.xls') ||
                droppedFile.name.endsWith('.csv')
            ) {
                setFile(droppedFile);
                setError(null);
                setResult(null);
            } else {
                setError("Format de fichier non supporté. Veuillez utiliser Excel (.xlsx, .xls) ou CSV.");
            }
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleUpload = async () => {
        if (!activeCompany || !file) return;
        setLoading(true);
        setError(null);
        try {
            const data = await importBalance(activeCompany.id, file);
            setResult(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Une erreur est survenue lors de l'import.");
        } finally {
            setLoading(false);
        }
    };

    if (!activeCompany) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">Aucun dossier sélectionné.</h3>
                <p className="text-sm text-muted-foreground mt-2">Veuillez sélectionner un dossier client depuis le Dashboard.</p>
                <Button className="mt-4" onClick={() => router.push('/dashboard')}>Retour au Dashboard</Button>
            </div>
        );
    }

    const formatNumber = (n: number) =>
        new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

    return (
        <div className="container mx-auto p-8 max-w-4xl space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="pl-0 mb-4 hover:bg-transparent text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Dashboard
                </Button>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                        <Table2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                            Import Balance Générale
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Dossier : <strong className="text-slate-700 dark:text-slate-300">{activeCompany.name}</strong>. Intégrez vos données comptables rapidement.
                        </p>
                    </div>
                </div>
            </div>

            {/* Guide Collapsible */}
            <Collapsible open={isGuideOpen} onOpenChange={setIsGuideOpen} className="border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl overflow-hidden shadow-sm">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors">
                    <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-semibold">
                        <BookOpen className="h-5 w-5" />
                        Comment structurer mon fichier ?
                    </div>
                    <ChevronDown className={cn("h-5 w-5 text-indigo-400 transition-transform duration-300", isGuideOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="p-4 pt-0 border-t border-indigo-100/50 mt-2 space-y-4">
                        <div className="flex gap-4 mb-4">
                            {ACCEPTED_FORMATS.map((f, i) => (
                                <div key={i} className="flex-1 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-800 rounded-lg p-3 text-center shadow-sm">
                                    <span className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-md mb-2">{f.cols}</span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>Le système détecte automatiquement les colonnes. Pour les balances à 6 ou 8 colonnes, les colonnes <strong>Soldes</strong> sont utilisées en priorité pour générer la liasse SYSCOHADA.</span>
                        </p>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* Error */}
            {error && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Échec de l'import</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Dropzone View (Show only if no result yet) */}
            {!result && (
                <Card className="border-0 shadow-lg shadow-slate-200/50 overflow-hidden">
                    <CardContent className="p-0">
                        <div
                            className={cn(
                                "flex flex-col items-center justify-center p-12 transition-all duration-300 border-2 border-dashed bg-slate-50/50 dark:bg-slate-900/50 rounded-lg m-2",
                                isDragging
                                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[0.99]"
                                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                file && "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                            )}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={!file ? triggerFileInput : undefined}
                            style={{ cursor: !file ? 'pointer' : 'default' }}
                        >
                            <Input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileChange}
                                className="hidden"
                                ref={fileInputRef}
                            />

                            {!file ? (
                                <>
                                    <div className="w-20 h-20 mb-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <Upload className={cn("w-10 h-10 text-blue-600 transition-transform duration-300", isDragging && "-translate-y-2")} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Glissez-déposez votre fichier ici</h3>
                                    <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
                                        Ou cliquez pour parcourir votre ordinateur.<br />Formats attendus: <strong>.xlsx, .xls, .csv</strong>
                                    </p>
                                    <Button type="button" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); triggerFileInput(); }}>
                                        Parcourir les fichiers
                                    </Button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center w-full animate-in zoom-in-95 duration-300">
                                    <div className="w-16 h-16 mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center relative">
                                        <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
                                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">{file.name}</h3>
                                    <p className="text-slate-500 mb-6 font-mono text-sm">{(file.size / 1024).toFixed(1)} KB</p>

                                    <div className="flex gap-4">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="text-slate-500"
                                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                            disabled={loading}
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                                            disabled={loading}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 px-8 transition-all hover:scale-105"
                                        >
                                            {loading
                                                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Analyse en cours...</>
                                                : <><Upload className="mr-2 h-4 w-4" /> Lancer l'Import</>
                                            }
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Success Result View */}
            {result && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fill-mode-both">
                    <Card className="border-0 shadow-xl shadow-emerald-500/10 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                        <CardContent className="pt-8">
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4 ring-8 ring-emerald-50 dark:ring-emerald-900/10 scale-in-center">
                                    <Check className="w-10 h-10 text-emerald-600 stroke-[3]" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Balance importée avec succès !</h2>
                                <p className="text-emerald-700 dark:text-emerald-400 mt-2 font-medium">
                                    {result.entries_count} écritures comptables traitées pour l'exercice {result.fiscal_year}.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                {[
                                    { label: "Lignes Valides", value: result.entries_count, color: "text-blue-700", bg: "bg-blue-50" },
                                    { label: "Nvx Comptes C.", value: result.accounts_created, color: "text-purple-700", bg: "bg-purple-50" },
                                    { label: "Comptes Associés", value: result.accounts_matched, color: "text-emerald-700", bg: "bg-emerald-50" },
                                    { label: "Lignes Exclues", value: result.skipped_rows, color: "text-slate-600", bg: "bg-slate-100" },
                                ].map((stat) => (
                                    <div key={stat.label} className={cn("rounded-xl p-4 text-center border border-slate-100", stat.bg)}>
                                        <p className={cn("text-3xl font-black mb-1", stat.color)}>{stat.value}</p>
                                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            <div className={cn(
                                "rounded-xl p-5 mb-8 border",
                                result.gap === 0
                                    ? "bg-emerald-50/50 border-emerald-200"
                                    : "bg-amber-50/50 border-amber-200"
                            )}>
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200/50">
                                    <div className="flex items-center gap-2 font-bold text-slate-800">
                                        {result.gap === 0
                                            ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                                            : <AlertTriangle className="h-5 w-5 text-amber-600" />
                                        }
                                        Vérification de l'équilibre
                                    </div>
                                    <div className="text-xs font-mono text-slate-500 font-medium">Doc ID: {result.document_id.slice(0, 8)}...</div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wide">Total Débit</p>
                                        <p className="font-mono text-lg font-bold text-slate-700">{formatNumber(result.total_debit)}</p>
                                    </div>
                                    <div className="border-x border-slate-200">
                                        <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wide">Total Crédit</p>
                                        <p className="font-mono text-lg font-bold text-slate-700">{formatNumber(result.total_credit)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wide">Écart Constaté</p>
                                        <p className={cn(
                                            "font-mono text-xl font-black",
                                            result.gap === 0 ? "text-emerald-600" : "text-amber-600"
                                        )}>
                                            {formatNumber(Math.abs(result.gap))}
                                        </p>
                                    </div>
                                </div>
                                {result.gap_note && (
                                    <div className="mt-4 p-3 bg-white rounded-lg border border-amber-200 text-sm text-amber-800 flex gap-2">
                                        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
                                        <span className="leading-relaxed">{result.gap_note}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => { setFile(null); setResult(null); }}
                                    className="px-6"
                                >
                                    Faire un autre import
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={() => router.push("/dashboard/templates")}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 px-8 group transition-all"
                                >
                                    Éditer Liasses SYSCOHADA
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

