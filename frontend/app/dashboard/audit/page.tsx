"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Search, XCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { runAudit, AuditResult } from "@/lib/audit-api";

import { useCompany } from "@/components/company-provider";

export default function AuditPage() {
    const { activeCompany } = useCompany();
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<AuditResult | null>(null);

    const handleRunAudit = async () => {
        if (!activeCompany) return;
        setAnalyzing(true);
        setProgress(10);
        setResult(null);

        // Simulate progress for UX
        const interval = setInterval(() => {
            setProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        try {
            const data = await runAudit(activeCompany.id);
            clearInterval(interval);
            setProgress(100);
            setTimeout(() => {
                setResult(data);
                setAnalyzing(false);
            }, 500);
        } catch (error) {
            clearInterval(interval);
            setAnalyzing(false);
            alert("Erreur lors de l'analyse");
        }
    };

    const getStatusColor = (status: string) => {
        if (status === "GREEN") return "bg-green-100 text-green-800 border-green-200";
        if (status === "ORANGE") return "bg-orange-100 text-orange-800 border-orange-200";
        return "bg-red-100 text-red-800 border-red-200";
    };

    return (
        <div className="container mx-auto p-10 max-w-6xl space-y-10">
            <div className="flex flex-col gap-4 mb-4">
                <div className="self-start">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="pl-0 hover:bg-transparent hover:underline text-muted-foreground">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Dashboard
                        </Button>
                    </Link>
                </div>
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-blue-900 flex items-center justify-center gap-3">
                        <ShieldCheck className="w-12 h-12" /> Centre de Certification
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Analysez la cohérence de votre dossier avant l'export de la Liasse Fiscale.
                    </p>
                    {!analyzing && !result && (
                        <Button size="lg" onClick={handleRunAudit} className="mt-4 text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700 shadow-lg">
                            <Search className="mr-2 h-5 w-5" /> Lancer l'Audit Automatique
                        </Button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            {analyzing && (
                <div className="space-y-4 max-w-xl mx-auto">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Analyse en cours...</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">

                    {/* 1. Main Score Card */}
                    <Card className={`border-t-8 ${result.status === "GREEN" ? "border-t-green-500" : result.status === "ORANGE" ? "border-t-orange-500" : "border-t-red-600"} shadow-lg`}>
                        <CardContent className="p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Diagnostic Global</h2>
                                <p className="text-muted-foreground text-lg">
                                    {result.status === "GREEN" && "Votre dossier est sain et prêt pour la liasse."}
                                    {result.status === "ORANGE" && "Quelques points d'attention à vérifier."}
                                    {result.status === "RED" && "Attention : Bloquant pour la liasse fiscale."}
                                </p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <div className="text-sm font-semibold uppercase text-muted-foreground">Score Qualité</div>
                                    <div className={`text-6xl font-black ${result.score > 80 ? "text-green-600" : result.score > 50 ? "text-orange-500" : "text-red-600"}`}>
                                        {result.score}/100
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* 2. Global Checks (Logic) */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Contrôles de Cohérence</CardTitle>
                                <CardDescription>Vérification des grands équilibres</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {result.checks.map((check, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="font-medium">{check.name}</div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-muted-foreground mr-2">{check.message}</span>
                                            {check.status === "OK" ? (
                                                <Badge className="bg-green-600 hover:bg-green-700">OK</Badge>
                                            ) : (
                                                <Badge variant="destructive">{check.status}</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* 3. Detailed Anomalies List */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Anomalies Détectées ({result.anomalies.length})</CardTitle>
                                <CardDescription>Détails des écritures à corriger</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[300px] pr-4">
                                    {result.anomalies.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
                                            <CheckCircle className="w-10 h-10 mb-2 text-green-500" />
                                            <p>Aucune anomalie !</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {result.anomalies.map((anom, i) => (
                                                <Alert key={i} variant={anom.severity === "HIGH" ? "destructive" : "default"} className="border-l-4">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    <AlertTitle className="text-sm font-bold">
                                                        {anom.type} <span className="font-normal text-xs ml-2 opacity-70">{new Date(anom.date).toLocaleDateString()}</span>
                                                    </AlertTitle>
                                                    <AlertDescription className="text-xs mt-1">
                                                        {anom.description}
                                                    </AlertDescription>
                                                </Alert>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
