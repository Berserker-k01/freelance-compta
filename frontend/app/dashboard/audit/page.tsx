"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, Search } from "lucide-react";
import { runAudit, Anomaly } from "@/lib/audit-api";

export default function AuditPage() {
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [anomalies, setAnomalies] = useState<Anomaly[] | null>(null);

    const COMPANY_ID = 1;

    const handleRunAudit = async () => {
        setAnalyzing(true);
        setProgress(10);
        setAnomalies(null);

        // Simulate progress for UX
        const interval = setInterval(() => {
            setProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        try {
            const results = await runAudit(COMPANY_ID);
            clearInterval(interval);
            setProgress(100);
            setTimeout(() => {
                setAnomalies(results);
                setAnalyzing(false);
            }, 500);
        } catch (error) {
            clearInterval(interval);
            setAnalyzing(false);
            alert("Erreur lors de l'analyse");
        }
    };

    return (
        <div className="container mx-auto p-10 max-w-5xl">
            <div className="mb-8 text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-blue-900 dark:text-blue-400 flex items-center justify-center gap-3">
                    <Search className="w-10 h-10" /> AuditIA Intelligence
                </h1>
                <p className="text-lg text-muted-foreground">
                    Détections d'anomalies comptables en temps réel propulsée par l'IA.
                </p>
            </div>

            <div className="flex justify-center mb-10">
                {!analyzing && !anomalies && (
                    <Button size="lg" onClick={handleRunAudit} className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                        Lancer l'Analyse Complète
                    </Button>
                )}
            </div>

            {analyzing && (
                <div className="space-y-4 max-w-xl mx-auto">
                    <div className="flex justify-between text-sm font-medium">
                        <span>Analyse des écritures...</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                </div>
            )}

            {anomalies && (
                <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {anomalies.length === 0 ? (
                                    <CheckCircle className="text-green-500 w-6 h-6" />
                                ) : (
                                    <AlertTriangle className="text-orange-500 w-6 h-6" />
                                )}
                                Résultat de l'analyse
                            </CardTitle>
                            <CardDescription>
                                {anomalies.length} anomalie(s) détectée(s) sur les écritures analysées.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {anomalies.length === 0 ? (
                                <Alert className="bg-green-50 border-green-200">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertTitle className="text-green-800">Tout est conformé !</AlertTitle>
                                    <AlertDescription className="text-green-700">
                                        Aucune anomalie détectée dans les journaux comptables.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <ScrollArea className="h-[400px] rounded-md border p-4">
                                    <div className="space-y-4">
                                        {anomalies.map((anomaly, index) => (
                                            <Alert key={index} variant={anomaly.severity === "HIGH" ? "destructive" : "default"}
                                                className={`border-l-4 ${anomaly.severity === "LOW" ? "border-l-blue-400" : "border-l-orange-500"}`}>
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle className="font-bold">
                                                    {anomaly.type}
                                                    <span className="text-xs font-normal ml-2 text-muted-foreground">
                                                        {new Date(anomaly.date).toLocaleDateString()}
                                                    </span>
                                                </AlertTitle>
                                                <AlertDescription>
                                                    {anomaly.description}
                                                </AlertDescription>
                                            </Alert>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
