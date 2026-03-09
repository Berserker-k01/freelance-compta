"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Monitor, ShieldCheck, Trash2, Key } from "lucide-react";
import { activateLicense, getLicenseInfo, License, revokeActivation } from "@/lib/licenses-api";

// Simple manual UUID generator to avoid installing uuid package if not desired, 
// but using a robust one is better. For now, let's use a simple function.
function generateMachineId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getMachineId() {
    if (typeof window !== "undefined") {
        let id = localStorage.getItem("auditia_machine_id");
        if (!id) {
            id = generateMachineId();
            localStorage.setItem("auditia_machine_id", id);
        }
        return id;
    }
    return "";
}

export default function SettingsPage() {
    const [licenseKey, setLicenseKey] = useState("");
    const [licenseInfo, setLicenseInfo] = useState<License | null>(null);
    const [loading, setLoading] = useState(false);
    const [machineId, setMachineId] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMachineId(getMachineId());
        // Try to load saved key
        const savedKey = localStorage.getItem("auditia_license_key");
        if (savedKey) {
            setLicenseKey(savedKey);
            fetchLicenseInfo(savedKey);
        }
    }, []);

    const fetchLicenseInfo = async (key: string) => {
        setLoading(true);
        setError(null);
        try {
            const info = await getLicenseInfo(key);
            setLicenseInfo(info);
            localStorage.setItem("auditia_license_key", key);
        } catch (err) {
            console.error(err);
            // Don't clear key immediately, maybe network error
            setError("Impossible de récupérer les infos de la licence.");
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async () => {
        setLoading(true);
        setError(null);
        try {
            await activateLicense(licenseKey, machineId, "Poste Actuel (Navigateur)");
            await fetchLicenseInfo(licenseKey);
        } catch (err: any) {
            setError(err.message || "Activation échouée.");
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (activationId: number) => {
        if (!confirm("Voulez-vous vraiment désactiver ce poste ?")) return;
        setLoading(true);
        try {
            await revokeActivation(activationId);
            await fetchLicenseInfo(licenseKey);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = () => {
        setLicenseInfo(null);
        setLicenseKey("");
        localStorage.removeItem("auditia_license_key");
    };

    const isCurrentMachineActivated = licenseInfo?.activations.some(a => a.machine_id === machineId);

    return (
        <div className="container mx-auto p-10 max-w-4xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Paramètres & Licence</h1>
                <p className="text-slate-400">Gérez votre abonnement et vos postes connectés.</p>
            </div>

            <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 border-t-4 border-t-blue-500 shadow-xl overflow-hidden text-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-white">
                        <div className="p-2 bg-blue-900/20 rounded-lg border border-blue-800/30">
                            <Key className="h-5 w-5 text-blue-400" />
                        </div>
                        Licence Logiciel
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Identifiant unique de votre abonnement Auditia.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!licenseInfo ? (
                        <div className="flex gap-4 items-end">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="license" className="text-slate-300">Clé de Licence</Label>
                                <Input
                                    type="text"
                                    id="license"
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value)}
                                    className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus-visible:ring-blue-500"
                                />
                            </div>
                            <Button onClick={() => fetchLicenseInfo(licenseKey)} disabled={loading || !licenseKey} className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-blue-500/50">
                                {loading ? "Chargement..." : "Vérifier"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <p className="text-xs text-slate-400 mb-1">Client</p>
                                    <p className="font-semibold text-lg text-white">{licenseInfo.client_name}</p>
                                </div>
                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <p className="text-xs text-slate-400 mb-1">Expiration</p>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-lg text-white">
                                            {new Date(licenseInfo.expiration_date).toLocaleDateString()}
                                        </p>
                                        {new Date(licenseInfo.expiration_date) > new Date() ? (
                                            <Badge variant="outline" className="text-emerald-400 border-emerald-800/50 bg-emerald-900/20">Actif</Badge>
                                        ) : (
                                            <Badge variant="destructive" className="bg-red-900/40 text-red-400 border border-red-800/50">Expiré</Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <p className="text-xs text-slate-400 mb-1">Postes</p>
                                    <p className="font-semibold text-lg text-white">
                                        {licenseInfo.activations.length} / {licenseInfo.max_workstations}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/80 border border-slate-700 p-3 rounded-lg justify-between">
                                <div className="flex-1 font-mono">{licenseInfo.key}</div>
                                <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-red-400 hover:text-red-300 hover:bg-red-500/20">
                                    Déconnecter
                                </Button>
                            </div>
                        </div>
                    )}
                    {error && <p className="text-sm text-red-400 flex items-center gap-2 bg-red-900/20 p-2 rounded border border-red-900/50"><AlertCircle className="h-4 w-4" /> {error}</p>}
                </CardContent>
            </Card>

            {licenseInfo && (
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden text-slate-200 mt-8">
                    <CardHeader className="border-b border-slate-800/50 pb-4 bg-slate-900/40">
                        <CardTitle className="flex items-center gap-3 text-white">
                            <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/50">
                                <Monitor className="h-5 w-5 text-slate-400" />
                            </div>
                            Gestion des Postes (Flotte)
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Liste des machines autorisées à utiliser cette licence.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            {!isCurrentMachineActivated && (
                                <div className="bg-orange-900/20 border border-orange-800/50 p-4 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-900/40 rounded-full text-orange-400">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-orange-300">Ce poste n'est pas activé</p>
                                            <p className="text-sm text-orange-400/80">Vous consultez les paramètres, mais les fonctions avancées seront bloquées.</p>
                                        </div>
                                    </div>
                                    <Button onClick={handleActivate} disabled={loading} className="bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.3)] border border-orange-500/50">
                                        Activer ce poste
                                    </Button>
                                </div>
                            )}

                            <div className="border border-slate-700 rounded-md divide-y divide-slate-700/50 bg-slate-800/30">
                                {licenseInfo.activations.length === 0 && (
                                    <div className="p-6 text-center text-slate-500 text-sm">
                                        Aucun poste activé pour le moment.
                                    </div>
                                )}
                                {licenseInfo.activations.map((activation) => (
                                    <div key={activation.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${activation.machine_id === machineId ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                                <Monitor className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium flex items-center gap-2 text-white">
                                                    {activation.machine_name || "Poste Inconnu"}
                                                    {activation.machine_id === machineId && <Badge className="bg-emerald-600 text-[10px] h-5 border-0 hover:bg-emerald-500 text-white">Moi</Badge>}
                                                </p>
                                                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {activation.machine_id}</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Activé le {new Date(activation.activated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRevoke(activation.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
