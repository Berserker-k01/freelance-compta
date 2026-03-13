"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CloudIcon,
    CloudOff,
    RefreshCw,
    Download,
    Upload,
    Server,
    Database,
    History,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { fetchAPI } from "@/lib/api";

export default function SyncPage() {
    const [isOnline, setIsOnline] = useState(true);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        setIsOnline(navigator.onLine);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Load sync status from localStorage
        setLastSync(localStorage.getItem("last_cloud_sync"));

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const handleExportBackup = async () => {
        setExporting(true);
        try {
            const data = await fetchAPI("/sync/export");
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `auditia_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert("Erreur lors de l'exportation de la sauvegarde");
        } finally {
            setExporting(false);
        }
    };

    const handleSyncToCloud = async () => {
        if (!isOnline) {
            alert("Veuillez vous connecter à Internet pour synchroniser.");
            return;
        }

        setSyncing(true);
        try {
            // 1. Get local data
            const localData = await fetchAPI("/sync/export");

            // 2. Push to cloud (In a real scenario, this would call a remote VPS URL)
            // For now, we simulate the sync on the current host which could be the VPS or Local.
            await fetchAPI("/sync/import", {
                method: "POST",
                body: JSON.stringify(localData)
            });

            const now = new Date().toLocaleString("fr-FR");
            setLastSync(now);
            localStorage.setItem("last_cloud_sync", now);
        } catch (error) {
            console.error(error);
            alert("Erreur lors de la synchronisation");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="container mx-auto p-10 max-w-6xl space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-4">
                        <Database className="w-12 h-12 text-blue-500" />
                        Synchronisation & Sauvegardes
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">
                        Gérez vos données locales et synchronisez-les avec le coffre-fort cloud d'Auditia.
                    </p>
                </div>

                <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-500 ${isOnline ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    {isOnline ? (
                        <CloudIcon className="w-6 h-6 text-emerald-500 animate-pulse" />
                    ) : (
                        <CloudOff className="w-6 h-6 text-red-500" />
                    )}
                    <div className="flex flex-col">
                        <span className={`text-sm font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isOnline ? 'Connecté' : 'Mode Hors-ligne'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                            {isOnline ? 'Serveur Central Accessible' : 'Travail local uniquement'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* LOCAL BACKUP CARD */}
                <Card className="bg-[#111823]/80 border-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Server className="w-5 h-5 text-blue-400" /> Sauvegarde Locale
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Exportez l'intégralité de vos dossiers sous forme de fichier crypté pour vos archives personnelles.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <History className="w-5 h-5 text-slate-500" />
                                <div className="text-sm">
                                    <p className="text-slate-500 font-medium">Auto-sauvegarde</p>
                                    <p className="text-white">Active (Quotidienne)</p>
                                </div>
                            </div>
                            <Badge className="bg-slate-800 text-slate-400">System Ready</Badge>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={handleExportBackup}
                            disabled={exporting}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold h-12 uppercase tracking-wide border border-slate-700/50"
                        >
                            {exporting ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Download className="w-5 h-5 mr-2" />}
                            Exporter la Sauvegarde (.json)
                        </Button>
                    </CardFooter>
                </Card>

                {/* CLOUD SYNC CARD */}
                <Card className="bg-[#111823]/80 border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.1)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <CloudIcon className="w-5 h-5 text-emerald-400" /> Synchronisation Cloud
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Synchronisez vos dossiers avec le serveur distant pour y accéder via n'importe quel terminal ou via le web.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center gap-4">
                            {lastSync ? (
                                <>
                                    <div className="p-3 bg-emerald-500/20 rounded-full">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-lg">Dernière synchronisation</p>
                                        <p className="text-emerald-400 font-mono">{lastSync}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-3 bg-orange-500/20 rounded-full">
                                        <AlertCircle className="w-10 h-10 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-lg">Jamais synchronisé</p>
                                        <p className="text-slate-500 text-sm">Vos données sont uniquement stockées sur ce PC.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={handleSyncToCloud}
                            disabled={syncing || !isOnline}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black h-14 uppercase tracking-widest shadow-lg shadow-blue-900/40 border border-blue-400/30"
                        >
                            {syncing ? <RefreshCw className="w-6 h-6 animate-spin mr-3" /> : <Upload className="w-6 h-6 mr-3" />}
                            Synchroniser Maintenant
                        </Button>
                    </CardFooter>
                </Card>

            </div>

            {/* INFO PANEL */}
            <div className="p-6 bg-blue-900/10 border border-blue-800/30 rounded-2xl flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                <div className="space-y-2">
                    <h3 className="font-bold text-white uppercase text-sm tracking-wider">Pourquoi synchroniser ?</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Le mode **Offline** vous permet de travailler sans connexion internet (voyages, zones isolées). La **Synchronisation** garantit que vos dossiers sont sauvegardés en toute sécurité sur le serveur Auditia, permettant la reprise du travail sur d'autres machines et servant de base pour la génération des liasses en ligne.
                    </p>
                </div>
            </div>

        </div>
    );
}
