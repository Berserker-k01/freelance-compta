"use client";

import { useState } from "react";
import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Upload, FileSpreadsheet, CheckCircle, AlertCircle,
    ArrowLeft, AlertTriangle, ArrowRight, Table2, BookOpen
} from "lucide-react";
import { importBalance } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ImportResult {
    status: string;
    document_id: number;
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
    { cols: "8 colonnes (standard)", desc: "Compte | Libellé | Débit Mvt | Crédit Mvt | AN D | AN C | Solde D | Solde C" },
];

export default function ImportPage() {
    const { activeCompany } = useCompany();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setResult(null);
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
        return <div className="p-10 text-muted-foreground">Veuillez sélectionner un dossier.</div>;
    }

    const formatNumber = (n: number) =>
        new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

    return (
        <div className="container mx-auto p-10 max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="pl-0 mb-4 hover:bg-transparent hover:underline text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Dashboard
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400">
                    Import de Balance Générale
                </h1>
                <p className="text-muted-foreground mt-1">
                    Importez votre balance SYSCOHADA (Excel ou CSV) pour <strong>{activeCompany.name}</strong>.
                    Les soldes alimenteront automatiquement la liasse fiscale.
                </p>
            </div>

            <div className="grid gap-6">
                {/* How it works */}
                <Card className="border-blue-100 bg-blue-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-blue-800 text-base">
                            <BookOpen className="h-4 w-4" /> Comment ça marche
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-blue-800 space-y-2">
                        <p>
                            La balance générale est la <strong>source unique</strong> pour générer la liasse OTR.
                            Chaque compte est mappé automatiquement selon les règles SYSCOHADA Révisé :
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                            <div className="bg-white rounded border border-blue-200 p-3">
                                <p className="font-semibold text-xs uppercase tracking-wide mb-1">Bilan Actif</p>
                                <p className="text-xs text-muted-foreground">BRUT = Solde D (cl. 2,3,4,5) • AMORT = Solde C (cl. 28,29,39,49) • NET = Brut − Amort</p>
                            </div>
                            <div className="bg-white rounded border border-blue-200 p-3">
                                <p className="font-semibold text-xs uppercase tracking-wide mb-1">Bilan Passif</p>
                                <p className="text-xs text-muted-foreground">Soldes C (cl. 1) → Capitaux • 401, 43, 44 → Dettes • 131/139 → Résultat</p>
                            </div>
                            <div className="bg-white rounded border border-blue-200 p-3">
                                <p className="font-semibold text-xs uppercase tracking-wide mb-1">Compte de Résultat</p>
                                <p className="text-xs text-muted-foreground">701–707 → CA (TA) • 60–65 → Charges • cl. 8 → HAO</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* File Upload */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Table2 className="h-5 w-5 text-green-600" />
                            Sélection du Fichier Balance
                        </CardTitle>
                        <CardDescription>
                            Formats acceptés : Excel (.xlsx, .xls) ou CSV avec séparateur point-virgule ou virgule.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Accepted formats */}
                        <div className="rounded-lg border bg-muted/30 p-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Formats de colonnes reconnus automatiquement
                            </p>
                            <div className="space-y-1.5">
                                {ACCEPTED_FORMATS.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                        <span className="font-mono bg-background border rounded px-1.5 py-0.5 text-emerald-700 font-semibold shrink-0">
                                            {f.cols}
                                        </span>
                                        <span className="text-muted-foreground">{f.desc}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-amber-700 mt-2">
                                ⚠ Pour les balances à 6 ou 8 colonnes, les <strong>Soldes</strong> (Débiteur / Créditeur)
                                sont automatiquement préférés aux colonnes Mouvements.
                            </p>
                        </div>

                        {/* File input */}
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="balance-file">Fichier Balance (.xlsx, .xls, .csv)</Label>
                            <Input
                                id="balance-file"
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileChange}
                                className="cursor-pointer"
                            />
                        </div>

                        {file && (
                            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                                <span className="font-medium">{file.name}</span>
                                <span className="text-muted-foreground ml-auto shrink-0">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                            </div>
                        )}

                        <div className="pt-2">
                            <Button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {loading
                                    ? <><Upload className="mr-2 h-4 w-4 animate-spin" /> Import en cours...</>
                                    : <><Upload className="mr-2 h-4 w-4" /> Importer la Balance</>
                                }
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Error */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Erreur d&apos;import</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Success result */}
                {result && (
                    <Card className="border-emerald-200 bg-emerald-50/30">
                        <CardContent className="pt-6">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2.5 bg-emerald-100 rounded-full">
                                    <CheckCircle className="h-7 w-7 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-emerald-900">Import réussi !</h3>
                                    <p className="text-sm text-emerald-700">
                                        Exercice {result.fiscal_year} — Document #{result.document_id}
                                    </p>
                                </div>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                {[
                                    { label: "Lignes importées", value: result.entries_count, color: "text-blue-700" },
                                    { label: "Comptes créés", value: result.accounts_created, color: "text-purple-700" },
                                    { label: "Comptes existants", value: result.accounts_matched, color: "text-emerald-700" },
                                    { label: "Lignes ignorées", value: result.skipped_rows, color: "text-amber-700" },
                                ].map((stat) => (
                                    <div key={stat.label} className="bg-white rounded-lg border p-3 text-center">
                                        <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Balance check */}
                            <div className={cn(
                                "rounded-lg border p-3 mb-4 text-sm",
                                result.gap === 0
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-amber-50 border-amber-200"
                            )}>
                                <div className="flex items-center gap-2 font-semibold mb-1">
                                    {result.gap === 0
                                        ? <CheckCircle className="h-4 w-4 text-emerald-600" />
                                        : <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    }
                                    Équilibre de la balance
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs text-center mt-2">
                                    <div>
                                        <p className="text-muted-foreground">Σ Débit</p>
                                        <p className="font-mono font-semibold">{formatNumber(result.total_debit)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Σ Crédit</p>
                                        <p className="font-mono font-semibold">{formatNumber(result.total_credit)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Écart</p>
                                        <p className={cn(
                                            "font-mono font-semibold",
                                            result.gap === 0 ? "text-emerald-700" : "text-amber-700"
                                        )}>
                                            {formatNumber(Math.abs(result.gap))}
                                        </p>
                                    </div>
                                </div>
                                {result.gap_note && (
                                    <p className="text-xs text-amber-800 mt-2 leading-relaxed">{result.gap_note}</p>
                                )}
                            </div>

                            {/* CTAs */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push("/dashboard/documents")}
                                    className="border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                                >
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    Voir dans les Documents
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={() => router.push("/dashboard/templates")}
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-sm flex-1 sm:flex-none"
                                >
                                    Générer la Liasse Fiscale
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
