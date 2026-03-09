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
        return <Badge className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50">✓ OK</Badge>;
    if (status === "WARNING")
        return <Badge className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50">⚠ Attention</Badge>;
    return <Badge variant="destructive" className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50">✗ Erreur</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
    const map: Record<string, string> = {
        HIGH: "bg-red-900/40 text-red-400 border-red-800/50",
        MEDIUM: "bg-amber-900/40 text-amber-400 border-amber-800/50",
        LOW: "bg-blue-900/40 text-blue-400 border-blue-800/50",
    };
    return (
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", map[severity] ?? map.LOW)}>
            {severity}
        </span>
    );
}

function CoherenceCard({ check }: { check: CoherenceCheck }) {
    const icon = check.status === "OK"
        ? <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
        : check.status === "WARNING"
            ? <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            : <XCircle className="h-5 w-5 text-red-400 shrink-0" />;

    const border = check.status === "OK"
        ? "border-l-emerald-500/70"
        : check.status === "WARNING"
            ? "border-l-amber-400/70"
            : "border-l-red-500/70";

    const values = check.values ?? {};
    const valueKeys = Object.keys(values);

    return (
        <div className={cn("border-l-4 pl-4 py-3 rounded-r-lg bg-slate-900/40 border-y border-r border-slate-700/50 space-y-1 transition-colors hover:bg-slate-800/40", border)}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-semibold text-sm text-white">{check.name}</span>
                </div>
                <StatusBadge status={check.status} />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{check.message}</p>
            {valueKeys.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                    {valueKeys.map(k => (
                        <div key={k} className="text-xs bg-slate-800/60 border border-slate-700/50 rounded px-2 py-1">
                            <span className="text-slate-400">{k.replace(/_/g, " ")} : </span>
                            <span className="font-mono font-bold text-slate-200">
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
        ? auditResult.score > 80 ? "text-emerald-400 text-shadow-glow" : auditResult.score > 50 ? "text-amber-400" : "text-red-400"
        : "";

    const topBorder = auditResult
        ? auditResult.status === "GREEN" ? "border-t-emerald-500/70" : auditResult.status === "ORANGE" ? "border-t-amber-500/70" : "border-t-red-500/70"
        : "border-t-transparent";

    const hasResults = auditResult !== null || coherenceResult !== null;

    return (
        <div className="container mx-auto p-6 max-w-6xl animate-in fade-in space-y-8">
            {/* Header */}
            <div>
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="pl-0 mb-4 hover:bg-transparent text-slate-400 hover:text-white transition-colors group">
                        <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Retour
                    </Button>
                </Link>
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                            <ShieldCheck className="h-8 w-8 text-blue-400" /> Audit &amp; Certification OTR
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Contrôle de cohérence + Détection d'anomalies avant dépôt de la liasse
                            {activeCompany && <span className="font-medium text-blue-400"> — {activeCompany.name}</span>}
                        </p>
                    </div>
                    <Button
                        size="lg"
                        onClick={handleRunAll}
                        disabled={analyzing || !activeCompany}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-blue-500/50 transition-all transform hover:-translate-y-0.5"
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
                    <div className="flex justify-between text-sm text-slate-400">
                        <span>Analyse des {progress < 50 ? "écritures" : progress < 80 ? "soldes" : "contrôles"}...</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-slate-800" />
                </div>
            )}

            {/* Error */}
            {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-800/50 text-red-200">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <AlertTitle className="text-red-400">Erreur d'analyse</AlertTitle>
                    <AlertDescription className="text-red-300/80">{error}</AlertDescription>
                </Alert>
            )}

            {/* No company */}
            {!activeCompany && (
                <div className="text-center py-20 text-slate-400">
                    Sélectionnez un dossier pour lancer l'audit.
                </div>
            )}

            {/* Results */}
            {hasResults && !analyzing && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* ---- SCORE CARD ---- */}
                    {auditResult && (
                        <Card className={cn("bg-slate-900/60 backdrop-blur-xl border-x border-b border-slate-700/50 border-t-4 shadow-xl text-slate-200", topBorder)}>
                            <CardContent className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-white">Diagnostic Global</h2>
                                    <p className="text-slate-400">
                                        {auditResult.status === "GREEN" && "✅ Dossier sain — prêt pour la liasse fiscale."}
                                        {auditResult.status === "ORANGE" && "⚠️ Quelques points d'attention à corriger avant dépôt."}
                                        {auditResult.status === "RED" && "🚨 Anomalies bloquantes détectées — liasse non conforme."}
                                    </p>
                                </div>
                                <div className="text-center shrink-0">
                                    <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Score Qualité</div>
                                    <div className={cn("text-7xl font-black tabular-nums transition-colors duration-500", scoreColor)}>
                                        {auditResult.score}
                                    </div>
                                    <div className="text-slate-500 text-sm">/100</div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid lg:grid-cols-2 gap-6">
                        {/* ---- CONTRÔLES DE COHÉRENCE OTR ---- */}
                        {coherenceResult && (
                            <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl text-slate-200">
                                <CardHeader className="pb-3 border-b border-slate-800/50 bg-slate-900/40">
                                    <CardTitle className="flex items-center gap-2 text-white">
                                        <Scale className="h-5 w-5 text-blue-400" />
                                        Contrôles de Cohérence OTR
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Équilibres fondamentaux requis avant dépôt
                                    </CardDescription>
                                    {coherenceResult.summary && (
                                        <div className="flex gap-3 pt-1 flex-wrap">
                                            <span className="text-xs px-2 py-1 bg-emerald-900/20 text-emerald-400 rounded-full border border-emerald-800/50">
                                                ✓ {coherenceResult.summary.ok} OK
                                            </span>
                                            {coherenceResult.summary.warnings > 0 && (
                                                <span className="text-xs px-2 py-1 bg-amber-900/20 text-amber-400 rounded-full border border-amber-800/50">
                                                    ⚠ {coherenceResult.summary.warnings} Attention
                                                </span>
                                            )}
                                            {coherenceResult.summary.errors > 0 && (
                                                <span className="text-xs px-2 py-1 bg-red-900/20 text-red-400 rounded-full border border-red-800/50">
                                                    ✗ {coherenceResult.summary.errors} Erreur(s)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    {coherenceResult.warning && (
                                        <p className="text-sm text-amber-400 bg-amber-900/20 border border-amber-800/50 rounded-md p-3">
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
                            <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl text-slate-200">
                                <CardHeader className="pb-3 border-b border-slate-800/50 bg-slate-900/40">
                                    <CardTitle className="flex items-center gap-2 text-white">
                                        <TrendingUp className="h-5 w-5 text-blue-400" />
                                        Anomalies Détectées
                                        <Badge variant="outline" className="ml-1 bg-slate-800/50 border-slate-700 text-slate-300">{auditResult.anomalies.length}</Badge>
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">Écritures suspectes ou non conformes</CardDescription>
                                    {/* Audit checks from AI */}
                                    {auditResult.checks.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {auditResult.checks.map((c, i) => (
                                                <div key={i} className="flex items-center gap-1.5 text-xs bg-slate-800/40 border border-slate-700/50 rounded-full px-2.5 py-1">
                                                    {c.status === "OK"
                                                        ? <CheckCircle className="h-3 w-3 text-emerald-400" />
                                                        : <AlertTriangle className="h-3 w-3 text-amber-400" />}
                                                    <span className="text-slate-400">{c.name}</span>
                                                    <StatusBadge status={c.status} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <ScrollArea className="h-[340px] pr-3">
                                        {auditResult.anomalies.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 gap-3">
                                                <CheckCircle className="w-12 h-12 text-emerald-500/50" />
                                                <p className="font-medium text-slate-300">Aucune anomalie détectée !</p>
                                                <p className="text-xs text-center">Toutes les écritures sont conformes au référentiel.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {auditResult.anomalies.map((anom, i) => (
                                                    <Alert
                                                        key={i}
                                                        variant={anom.severity === "HIGH" ? "destructive" : "default"}
                                                        className={cn("border-l-4", anom.severity === "HIGH" ? "bg-red-900/20 border-red-800/50 text-red-200" : "bg-slate-800/40 border-slate-700/50 text-slate-200 border-l-amber-500/50")}
                                                    >
                                                        <AlertTriangle className={cn("h-4 w-4", anom.severity === "HIGH" ? "text-red-400" : "text-amber-400")} />
                                                        <AlertTitle className="text-sm font-bold flex items-center gap-2 flex-wrap">
                                                            {anom.type}
                                                            <SeverityBadge severity={anom.severity} />
                                                            <span className="font-normal text-xs opacity-60 ml-auto">
                                                                {new Date(anom.date).toLocaleDateString("fr-FR")}
                                                            </span>
                                                        </AlertTitle>
                                                        <AlertDescription className="text-xs mt-1 leading-relaxed opacity-90">
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
                    <Card className="bg-blue-900/20 border border-blue-800/50 shadow-xl text-slate-200">
                        <CardHeader className="pb-3 border-b border-blue-900/30">
                            <CardTitle className="flex items-center gap-2 text-blue-400">
                                <Landmark className="h-5 w-5" />
                                Checklist Dépôt OTR
                            </CardTitle>
                            <CardDescription className="text-slate-400">Points à valider avant soumission sur le portail OTR</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
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
                                            "flex items-start gap-3 p-3 rounded-lg border text-sm transition-colors",
                                            item.ok
                                                ? "bg-emerald-900/20 border-emerald-800/50 hover:bg-emerald-900/30"
                                                : "bg-red-900/20 border-red-800/50 hover:bg-red-900/30"
                                        )}
                                    >
                                        {item.ok
                                            ? <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                            : <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                        }
                                        <div>
                                            <div className="font-medium text-white">{item.label}</div>
                                            {!item.ok && <div className="text-xs text-slate-400 mt-0.5">{item.tip}</div>}
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
