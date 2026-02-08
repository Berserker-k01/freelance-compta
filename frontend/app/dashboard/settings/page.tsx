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
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
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
                <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400">Paramètres & Licence</h1>
                <p className="text-muted-foreground">Gérez votre abonnement et vos postes connectés.</p>
            </div>

            <Card className="border-t-4 border-t-blue-600 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-blue-600" />
                        Licence Logiciel
                    </CardTitle>
                    <CardDescription>
                        Identifiant unique de votre abonnement Auditia.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!licenseInfo ? (
                        <div className="flex gap-4 items-end">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="license">Clé de Licence</Label>
                                <Input
                                    type="text"
                                    id="license"
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value)}
                                />
                            </div>
                            <Button onClick={() => fetchLicenseInfo(licenseKey)} disabled={loading || !licenseKey}>
                                {loading ? "Chargement..." : "Vérifier"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 rounded-lg border">
                                    <p className="text-xs text-muted-foreground mb-1">Client</p>
                                    <p className="font-semibold text-lg">{licenseInfo.client_name}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border">
                                    <p className="text-xs text-muted-foreground mb-1">Expiration</p>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-lg">
                                            {new Date(licenseInfo.expiration_date).toLocaleDateString()}
                                        </p>
                                        {new Date(licenseInfo.expiration_date) > new Date() ? (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Actif</Badge>
                                        ) : (
                                            <Badge variant="destructive">Expiré</Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border">
                                    <p className="text-xs text-muted-foreground mb-1">Postes</p>
                                    <p className="font-semibold text-lg">
                                        {licenseInfo.activations.length} / {licenseInfo.max_workstations}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-slate-100 p-2 rounded justify-between">
                                <div className="flex-1 font-mono">{licenseInfo.key}</div>
                                <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                    Déconnecter
                                </Button>
                            </div>
                        </div>
                    )}
                    {error && <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</p>}
                </CardContent>
            </Card>

            {licenseInfo && (
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Monitor className="h-5 w-5 text-slate-600" />
                            Gestion des Postes (Flotte)
                        </CardTitle>
                        <CardDescription>
                            Liste des machines autorisées à utiliser cette licence.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {!isCurrentMachineActivated && (
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-yellow-100 rounded-full text-yellow-700">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-yellow-900">Ce poste n'est pas activé</p>
                                            <p className="text-sm text-yellow-700">Vous consultez les paramètres, mais les fonctions avancées seront bloquées.</p>
                                        </div>
                                    </div>
                                    <Button onClick={handleActivate} disabled={loading} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                                        Activer ce poste
                                    </Button>
                                </div>
                            )}

                            <div className="border rounded-md divide-y">
                                {licenseInfo.activations.length === 0 && (
                                    <div className="p-4 text-center text-muted-foreground text-sm">
                                        Aucun poste activé pour le moment.
                                    </div>
                                )}
                                {licenseInfo.activations.map((activation) => (
                                    <div key={activation.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${activation.machine_id === machineId ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                <Monitor className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium flex items-center gap-2">
                                                    {activation.machine_name || "Poste Inconnu"}
                                                    {activation.machine_id === machineId && <Badge className="bg-green-600 text-[10px] h-5">Moi</Badge>}
                                                </p>
                                                <p className="text-xs text-muted-foreground font-mono">ID: {activation.machine_id}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Activé le {new Date(activation.activated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRevoke(activation.id)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
