"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Upload, 
    Download, 
    ShieldCheck, 
    Users, 
    CreditCard, 
    CheckCircle2, 
    XCircle, 
    RefreshCw,
    AlertCircle,
    Server,
    FileCode
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

type Plan = {
    id: string;
    name: string;
    price: number;
    duration_days: number;
};

type PaymentProof = {
    id: string;
    user_email: string;
    plan_name: string;
    image_path: string;
    status: string;
    created_at: string;
};

export default function AdminPage() {
    const [proofs, setProofs] = useState<PaymentProof[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingExe, setUploadingExe] = useState(false);
    const exeInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        setLoading(true);
        const token = localStorage.getItem("access_token");
        try {
            const [proofsRes, plansRes] = await Promise.all([
                fetch(`${API_BASE_URL}/saas/admin/proofs`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/saas/plans`)
            ]);

            if (proofsRes.ok) setProofs(await proofsRes.json());
            if (plansRes.ok) setPlans(await plansRes.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadExe = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingExe(true);
        try {
            const token = localStorage.getItem("access_token");
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`${API_BASE_URL}/saas/admin/upload-exe`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                alert("Exécutable mis à jour avec succès !");
            } else {
                alert("Erreur lors de l'upload de l'EXE.");
            }
        } catch (error) {
            console.error(error);
            alert("Erreur de connexion.");
        } finally {
            setUploadingExe(false);
            if (exeInputRef.current) exeInputRef.current.value = "";
        }
    };

    const handleReviewProof = async (id: string, action: "approve" | "reject") => {
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_BASE_URL}/saas/admin/proofs/${id}/review?action=${action}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                fetchAdminData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="container mx-auto p-10 max-w-6xl space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-4">
                        <ShieldCheck className="w-12 h-12 text-indigo-500" />
                        Panel Admin Auditia
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">
                        Gestion de la plateforme SaaS, des abonnements et des ressources applicatives.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="exe" className="w-full">
                <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl mb-8">
                    <TabsTrigger value="exe" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2">
                        <Server className="w-4 h-4" /> Exécutables
                    </TabsTrigger>
                    <TabsTrigger value="proofs" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2">
                        <CreditCard className="w-4 h-4" /> Preuves Paiement 
                        {proofs.length > 0 && <Badge className="ml-2 bg-red-500">{proofs.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="plans" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2">
                        <Users className="w-4 h-4" /> Forfaits & Utilisateurs
                    </TabsTrigger>
                </TabsList>

                {/* EXE MANAGEMENT */}
                <TabsContent value="exe">
                    <Card className="bg-[#111823]/80 border-slate-800 shadow-2xl">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <FileCode className="w-5 h-5 text-indigo-400" /> Gestion de l'Exécutable Windows
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Chargez la nouvelle version de l'application desktop Auditia. Les utilisateurs pourront la télécharger depuis leur interface.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-4 bg-slate-900/30">
                                <div className="p-4 bg-indigo-500/10 rounded-full">
                                    <Upload className="w-10 h-10 text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-lg">Mettre à jour l'installeur (.exe)</p>
                                    <p className="text-slate-500 text-sm max-w-md mx-auto mt-1">
                                        Fichier attendu : auditia-setup-1.0.0.exe. Ce fichier sera servi immédiatement sur le cloud.
                                    </p>
                                </div>
                                <input 
                                    type="file" 
                                    accept=".exe" 
                                    className="hidden" 
                                    ref={exeInputRef}
                                    onChange={handleUploadExe}
                                />
                                <Button 
                                    onClick={() => exeInputRef.current?.click()}
                                    disabled={uploadingExe}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8"
                                >
                                    {uploadingExe ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
                                    Sélectionner et Charger
                                </Button>
                            </div>

                            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Download className="w-6 h-6 text-slate-500" />
                                    <div>
                                        <p className="text-white font-medium">Lien de téléchargement actuel</p>
                                        <p className="text-xs text-slate-500 font-mono">/downloads/auditia-setup-1.0.0.exe</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" asChild>
                                    <a href="/downloads/auditia-setup-1.0.0.exe" download>
                                        Vérifier le fichier
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PAYMENT PROOFS */}
                <TabsContent value="proofs">
                    <Card className="bg-[#111823]/80 border-slate-800 shadow-2xl">
                        <CardHeader>
                            <CardTitle className="text-white">Vérification des Paiements</CardTitle>
                            <CardDescription className="text-slate-400">
                                Examinez les preuves de paiement envoyées par les utilisateurs pour activer leurs forfaits.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-10 text-slate-500">Chargement...</div>
                            ) : proofs.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 flex flex-col items-center gap-2">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500/50" />
                                    Aucune preuve en attente.
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {proofs.map(p => (
                                        <div key={p.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-slate-800 p-2 rounded-lg">
                                                    <CreditCard className="w-6 h-6 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold">{p.user_email}</p>
                                                    <p className="text-slate-400 text-sm">{p.plan_name} • {new Date(p.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a href={`${API_BASE_URL.replace('/api','')}/uploads/proofs/${p.image_path}`} target="_blank" rel="noreferrer">
                                                        Voir Image
                                                    </a>
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    className="bg-emerald-600 hover:bg-emerald-500"
                                                    onClick={() => handleReviewProof(p.id, "approve")}
                                                >
                                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approuver
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="destructive"
                                                    onClick={() => handleReviewProof(p.id, "reject")}
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" /> Rejeter
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PLANS MANAGEMENT */}
                <TabsContent value="plans">
                    <Card className="bg-[#111823]/80 border-slate-800 shadow-2xl">
                        <CardHeader>
                            <CardTitle className="text-white">Configuration des Forfaits</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                {plans.map(plan => (
                                    <div key={plan.id} className="p-4 bg-slate-800/50 rounded-xl flex justify-between items-center text-white">
                                        <div>
                                            <p className="font-bold">{plan.name}</p>
                                            <p className="text-sm text-slate-400">{plan.price} FCFA / {plan.duration_days} jours</p>
                                        </div>
                                        <Button variant="outline" size="sm" className="border-slate-700">Editer</Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                <div>
                    <h3 className="font-bold text-white uppercase text-xs tracking-wider">Note de l'administrateur</h3>
                    <p className="text-sm text-slate-400 leading-relaxed mt-1">
                        Toutes les actions effectuées ici impactent directement les utilisateurs finaux. L'upload d'un nouvel exécutable écrase la version précédente.
                    </p>
                </div>
            </div>
        </div>
    );
}
