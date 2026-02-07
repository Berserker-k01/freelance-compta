"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/lib/api";
import { Key, Lock, CheckCircle, ShieldAlert } from "lucide-react";

export default function ActivationPage() {
    const router = useRouter();
    const [key, setKey] = useState("");
    const [machineId, setMachineId] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState("");

    useEffect(() => {
        // Generate or retrieve a Machine ID (fingerprint)
        // For web/MVP, we'll generate a random UUID stored in localStorage to simulate a machine lock.
        let storedId = localStorage.getItem("auditia_machine_id");
        if (!storedId) {
            storedId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem("auditia_machine_id", storedId);
        }
        setMachineId(storedId);
    }, []);

    const handleActivate = async () => {
        if (!key) return;
        setLoading(true);
        setStatus('idle');

        try {
            const res = await fetch(`${API_BASE_URL}/licenses/activate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: key,
                    machine_id: machineId
                })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(data.message || "Logiciel activé.");
                // Store activation status/token if needed
                localStorage.setItem("auditia_license_key", key);

                setTimeout(() => {
                    router.push("/dashboard"); // Redirect to App
                }, 2000);
            } else {
                setStatus('error');
                setMessage(data.detail || "Activation échouée.");
            }
        } catch (error) {
            setStatus('error');
            setMessage("Impossible de contacter le serveur d'activation.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-100">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>

            <Card className="w-[450px] border-slate-700 bg-slate-800 shadow-2xl relative z-10">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-blue-600/20 p-4 rounded-full w-fit mb-4">
                        <Lock className="h-10 w-10 text-blue-500" />
                    </div>
                    <CardTitle className="text-2xl text-white">Activation Requise</CardTitle>
                    <CardDescription className="text-slate-400">
                        Veuillez saisir votre clé de licence pour déverrouiller Auditia.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Clé de Licence (XXXX-XXXX-XXXX-XXXX)</Label>
                        <Input
                            placeholder="A1B2-C3D4-E5F6-G7H8"
                            value={key}
                            onChange={(e) => setKey(e.target.value.toUpperCase())}
                            className="bg-slate-900 border-slate-700 text-white font-mono tracking-widest text-center uppercase"
                        />
                    </div>

                    {status === 'error' && (
                        <div className="bg-red-900/50 border border-red-800 text-red-200 p-3 rounded-md flex items-center gap-2 text-sm">
                            <ShieldAlert className="h-4 w-4" /> {message}
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="bg-green-900/50 border border-green-800 text-green-200 p-3 rounded-md flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4" /> {message} Redirection...
                        </div>
                    )}

                    <div className="text-xs text-slate-500 text-center">
                        ID Machine : <span className="font-mono">{machineId}</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                        onClick={handleActivate}
                        disabled={loading || key.length < 5}
                    >
                        {loading ? "Vérification..." : "Activer le Logiciel"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
