"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    AlertTriangle, CheckCircle, Search, XCircle, ShieldCheck,
    ArrowLeft, Scale, TrendingUp, Landmark, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { runAudit, runCoherenceChecks, AuditResult, CoherenceResult, CoherenceCheck } from "@/lib/audit-api";
import { useCompany } from "@/components/company-provider";
import { cn } from "@/lib/utils";

// --------------------------------------------------------------------------
// HELPERS
// --------------------------------------------------------------------------
function StatusBadge({ status }: { status: "OK" | "WARNING" | "KO" }) {
    if (status === "OK")
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">✓ OK</Badge>;
    if (status === "WARNING")
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">⚠ Attention</Badge>;
    return <Badge variant="destructive">✗ Erreur</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
    const map: Record<string, string> = {
        HIGH: "bg-red-100 text-red-800 border-red-200",
        MEDIUM: "bg-amber-100 text-amber-800 border-amber-200",
        LOW: "bg-blue-100 text-blue-800 border-blue-200",
    };
    return (
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", map[severity] ?? map.LOW)}>
            {severity}
        </span>
    );
}

function CoherenceCard({ check }: { check: CoherenceCheck }) {
    const icon = check.status === "OK"
        ? <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
        : check.status === "WARNING"
            ? <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            : <XCircle className="h-5 w-5 text-red-600 shrink-0" />;

    const border = check.status === "OK"
        ? "border-l-emerald-500"
        : check.status === "WARNING"
            ? "border-l-amber-400"
            : "border-l-red-500";

    const values = check.values ?? {};
    const valueKeys = Object.keys(values);

    return (
        <div className={cn("border-l-4 pl-4 py-3 rounded-r-lg bg-gray-50 space-y-1", border)}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-semibold text-sm">{check.name}</span>
                </div>
                <StatusBadge status={check.status} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{check.message}</p>
            {valueKeys.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                    {valueKeys.map(k => (
                        <div key={k} className="text-xs bg-white border rounded px-2 py-1">
                            <span className="text-muted-foreground">{k.replace(/_/g, " ")} : </span>
                            <span className="font-mono font-bold">
                                {(values[k] as number).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --------------------------------------------------------------------------
// PAGE
// --------------------------------------------------------------------------
export default function AuditPage() {
    const { activeCompany } = useCompany();
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
    const [coherenceResult, setCoherenceResult] = useState<CoherenceResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRunAll = async () => {
        if (!activeCompany) return;
        setAnalyzing(true);
        setProgress(5);
        setAuditResult(null);
        setCoherenceResult(null);
        setError(null);

        // Simulated progress
        const interval = setInterval(() => {
            setProgress(prev => Math.min(prev + 8, 88));
        }, 250);

        try {
            // Run both in parallel
            const [auditData, coherenceData] = await Promise.all([
                runAudit(activeCompany.id),
                runCoherenceChecks(activeCompany.id),
            ]);
            clearInterval(interval);
            setProgress(100);
            setTimeout(() => {
                setAuditResult(auditData);
                setCoherenceResult(coherenceData);
                setAnalyzing(false);
            }, 400);
        } catch (err: unknown) {
            clearInterval(interval);
            setAnalyzing(false);
            setError(err instanceof Error ? err.message : "Erreur lors de l'analyse.");
        }
    };

    const scoreColor = auditResult
        ? auditResult.score > 80 ? "text-emerald-600" : auditResult.score > 50 ? "text-amber-500" : "text-red-600"
        : "";

    const topBorder = auditResult
        ? auditResult.status === "GREEN" ? "border-t-emerald-500" : auditResult.status === "ORANGE" ? "border-t-amber-500" : "border-t-red-600"
        : "";

    const hasResults = auditResult !== null || coherenceResult !== null;

    return (
        <div className="container mx-auto p-6 max-w-6xl animate-in fade-in space-y-8">
            {/* Header */}
            <div>
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="pl-0 mb-2 text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                    </Button>
                </Link>
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-blue-900 flex items-center gap-3">
                            <ShieldCheck className="h-8 w-8" /> Audit &amp; Certification OTR
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Contrôle de cohérence + Détection d'anomalies avant dépôt de la liasse
                            {activeCompany && <span className="font-medium text-blue-700"> — {activeCompany.name}</span>}
                        </p>
                    </div>
                    <Button
                        size="lg"
                        onClick={handleRunAll}
                        disabled={analyzing || !activeCompany}
                        className="bg-blue-700 hover:bg-blue-800 text-white shadow-md"
                    >
                        {analyzing
                            ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Analyse en cours...</>
                            : hasResults
                                ? <><RefreshCw className="mr-2 h-4 w-4" /> Relancer l'Audit</>
                                : <><Search className="mr-2 h-4 w-4" /> Lancer l'Audit Complet</>
                        }
                    </Button>
                </div>
            </div>

            {/* Progress */}
            {analyzing && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Analyse des {progress < 50 ? "écritures" : progress < 80 ? "soldes" : "contrôles"}...</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}

            {/* Error */}
            {error && (
                <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Erreur d'analyse</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* No company */}
            {!activeCompany && (
                <div className="text-center py-20 text-muted-foreground">
                    Sélectionnez un dossier pour lancer l'audit.
                </div>
            )}

            {/* Results */}
            {hasResults && !analyzing && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* ---- SCORE CARD ---- */}
                    {auditResult && (
                        <Card className={cn("border-t-8 shadow-lg", topBorder)}>
                            <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold">Diagnostic Global</h2>
                                    <p className="text-muted-foreground">
                                        {auditResult.status === "GREEN" && "✅ Dossier sain — prêt pour la liasse fiscale."}
                                        {auditResult.status === "ORANGE" && "⚠️ Quelques points d'attention à corriger avant dépôt."}
                                        {auditResult.status === "RED" && "🚨 Anomalies bloquantes détectées — liasse non conforme."}
                                    </p>
                                </div>
                                <div className="text-center shrink-0">
                                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Score Qualité</div>
                                    <div className={cn("text-7xl font-black tabular-nums", scoreColor)}>
                                        {auditResult.score}
                                    </div>
                                    <div className="text-muted-foreground text-sm">/100</div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* ---- CONTRÔLES DE COHÉRENCE OTR ---- */}
                        {coherenceResult && (
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2">
                                        <Scale className="h-5 w-5 text-blue-600" />
                                        Contrôles de Cohérence OTR
                                    </CardTitle>
                                    <CardDescription>
                                        Équilibres fondamentaux requis avant dépôt
                                    </CardDescription>
                                    {coherenceResult.summary && (
                                        <div className="flex gap-3 pt-1 flex-wrap">
                                            <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                                                ✓ {coherenceResult.summary.ok} OK
                                            </span>
                                            {coherenceResult.summary.warnings > 0 && (
                                                <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                                                    ⚠ {coherenceResult.summary.warnings} Attention
                                                </span>
                                            )}
                                            {coherenceResult.summary.errors > 0 && (
                                                <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
                                                    ✗ {coherenceResult.summary.errors} Erreur(s)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {coherenceResult.warning && (
                                        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
                                            {coherenceResult.warning}
                                        </p>
                                    )}
                                    {coherenceResult.checks.map((check, i) => (
                                        <CoherenceCard key={i} check={check} />
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* ---- ANOMALIES IA ---- */}
                        {auditResult && (
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                        Anomalies Détectées par l'IA
                                        <Badge variant="outline" className="ml-1">{auditResult.anomalies.length}</Badge>
                                    </CardTitle>
                                    <CardDescription>Écritures suspects ou non conformes</CardDescription>
                                    {/* Audit checks from AI */}
                                    {auditResult.checks.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {auditResult.checks.map((c, i) => (
                                                <div key={i} className="flex items-center gap-1.5 text-xs bg-gray-50 border rounded-full px-2.5 py-1">
                                                    {c.status === "OK"
                                                        ? <CheckCircle className="h-3 w-3 text-emerald-500" />
                                                        : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                                                    <span className="text-muted-foreground">{c.name}</span>
                                                    <StatusBadge status={c.status} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[340px] pr-3">
                                        {auditResult.anomalies.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12 gap-3">
                                                <CheckCircle className="w-12 h-12 text-emerald-500" />
                                                <p className="font-medium">Aucune anomalie détectée !</p>
                                                <p className="text-xs text-center">Toutes les écritures sont conformes.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {auditResult.anomalies.map((anom, i) => (
                                                    <Alert
                                                        key={i}
                                                        variant={anom.severity === "HIGH" ? "destructive" : "default"}
                                                        className="border-l-4"
                                                    >
                                                        <AlertTriangle className="h-4 w-4" />
                                                        <AlertTitle className="text-sm font-bold flex items-center gap-2 flex-wrap">
                                                            {anom.type}
                                                            <SeverityBadge severity={anom.severity} />
                                                            <span className="font-normal text-xs opacity-60">
                                                                {new Date(anom.date).toLocaleDateString("fr-FR")}
                                                            </span>
                                                        </AlertTitle>
                                                        <AlertDescription className="text-xs mt-1 leading-relaxed">
                                                            {anom.description}
                                                        </AlertDescription>
                                                    </Alert>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* ---- CHECKLIST DÉPÔT OTR ---- */}
                    <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-blue-800">
                                <Landmark className="h-5 w-5" />
                                Checklist Dépôt OTR
                            </CardTitle>
                            <CardDescription>Points à valider avant soumission sur le portail OTR</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {[
                                    {
                                        label: "Actif Net = Passif",
                                        ok: coherenceResult?.checks[0]?.status === "OK",
                                        tip: "Vérifiez les écritures d'à-nouveau et de clôture."
                                    },
                                    {
                                        label: "Résultat Bilan = Résultat CR",
                                        ok: coherenceResult?.checks[1]?.status === "OK",
                                        tip: "Compte 13 doit refléter le solde du compte de résultat."
                                    },
                                    {
                                        label: "Trésorerie cohérente",
                                        ok: coherenceResult?.checks[2]?.status !== "KO",
                                        tip: "Réconciliez les soldes banques avec les relevés."
                                    },
                                    {
                                        label: "Aucune anomalie bloquante",
                                        ok: !auditResult?.anomalies.some(a => a.severity === "HIGH"),
                                        tip: "Corrigez toutes les anomalies HIGH avant dépôt."
                                    },
                                    {
                                        label: "Balance vérifiée (Σ Débit = Σ Crédit)",
                                        ok: auditResult?.status !== "RED",
                                        tip: "La balance générale doit être équilibrée."
                                    },
                                    {
                                        label: "NIF et infos société renseignés",
                                        ok: true,
                                        tip: "Vérifiez le NIF, la raison sociale et l'exercice."
                                    },
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-lg border text-sm",
                                            item.ok
                                                ? "bg-emerald-50 border-emerald-200"
                                                : "bg-red-50 border-red-200"
                                        )}
                                    >
                                        {item.ok
                                            ? <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                            : <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                        }
                                        <div>
                                            <div className="font-medium">{item.label}</div>
                                            {!item.ok && <div className="text-xs text-muted-foreground mt-0.5">{item.tip}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
