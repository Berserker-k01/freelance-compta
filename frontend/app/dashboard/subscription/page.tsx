"use client";

import { useEffect, useState, useRef } from "react";
import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, CheckCircle2, UploadCloud, Cpu, AlertCircle, Banknote, InfinityIcon } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

type SubscriptionPlan = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    duration_days: number;
    has_ai_access: boolean;
    file_limit: number | null;
    payment_link: string | null;
};

type UserData = {
    plan_id: string | null;
    plan_name?: string | null;
    plan_has_ai_access?: boolean;
    plan_file_limit?: number | null;
    plan_status: string;
    plan_expires_at: string | null;
    files_processed_count: number;
};

export default function SubscriptionPage() {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedPlanForProof, setSelectedPlanForProof] = useState<string | null>(null);
    const [payClicked, setPayClicked] = useState<Record<string, boolean>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const [plansRes, userRes] = await Promise.all([
                fetch(`${API_BASE_URL}/saas/plans`),
                fetch(`${API_BASE_URL}/saas/me`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (plansRes.ok) setPlans(await plansRes.json());
            if (userRes.ok) setUser(await userRes.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadProof = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedPlanForProof) return;

        setUploading(true);
        try {
            const token = localStorage.getItem("access_token");
            const formData = new FormData();
            formData.append("file", file);
            formData.append("plan_id", selectedPlanForProof);

            const res = await fetch(`${API_BASE_URL}/saas/upload-proof`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                alert("Preuve de paiement envoyée ! Votre abonnement sera activé par l'administrateur après vérification.");
                fetchData();
            } else {
                alert("Erreur lors de l'envoi.");
            }
        } catch (error) {
            console.error(error);
            alert("Erreur de connexion.");
        } finally {
            setUploading(false);
            setSelectedPlanForProof(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleStartPayment = (link: string, planId: string) => {
        window.open(link, "_blank");
        setPayClicked(prev => ({ ...prev, [planId]: true }));
    };

    if (loading) return <div className="p-10 text-center text-slate-400">Chargement de votre offre...</div>;

    const activePlan = plans.find(p => p.id === user?.plan_id) || (user?.plan_id ? {
        id: user.plan_id,
        name: user.plan_name || "Plan actif",
        description: null,
        price: 0,
        duration_days: 0,
        has_ai_access: !!user.plan_has_ai_access,
        file_limit: user.plan_file_limit ?? null,
        payment_link: null,
    } : undefined);
    const isPending = user?.plan_status === "pending";

    return (
        <div className="container mx-auto p-10 max-w-6xl">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Mon Abonnement SaaS</h1>
            <p className="text-slate-400 mb-8">Gérez votre offre, vos limites de traitement et payez en ligne.</p>

            {/* STATUS BANNER */}
            {user?.plan_status === "active" && activePlan ? (
                <Card className="bg-emerald-900/20 border-emerald-500/50 mb-10 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-emerald-500/20 p-3 rounded-full">
                                <ShieldCheck className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    Forfait Actif : {activePlan.name}
                                    <Badge className="bg-emerald-500">Premium</Badge>
                                </h2>
                                <p className="text-emerald-200/80 mt-1">
                                    Valide jusqu'au : {user.plan_expires_at ? new Date(user.plan_expires_at).toLocaleDateString() : "Non renseigné"}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-400 mb-1">Fichiers traités</div>
                            <div className="text-2xl font-black text-white">
                                {user.files_processed_count} <span className="text-slate-500 text-lg font-medium">/ {activePlan.file_limit || "∞"}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : isPending ? (
                <Card className="bg-amber-900/20 border-amber-500/50 mb-10">
                    <CardContent className="p-6 flex items-center gap-4">
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                        <div>
                            <h2 className="text-xl font-bold text-white">Vérification du paiement en cours</h2>
                            <p className="text-amber-200/80">Notre équipe valide votre preuve de dépôt. Votre compte sera activé dans quelques minutes.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-slate-900/50 border-slate-700 mb-10">
                    <CardContent className="p-6 text-center text-slate-400">
                        Vous n'avez actuellement aucun forfait actif. Veuillez sélectionner une offre ci-dessous.
                    </CardContent>
                </Card>
            )}

            {/* Hidden Input for Proof Upload */}
            <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleUploadProof}
            />

            {/* PLANS GRID */}
            <h2 className="text-2xl font-bold text-white mb-6">Offres Disponibles</h2>
            <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <Card key={plan.id} className="bg-[#111823] border-slate-800 relative overflow-hidden group hover:border-blue-500/50 transition-all">
                        {plan.has_ai_access && (
                            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-lg">
                                + SMART IA QWEN
                            </div>
                        )}
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-xl text-white">{plan.name}</CardTitle>
                            <div className="mt-4">
                                <span className="text-4xl font-black text-white">{plan.price}</span>
                                <span className="text-slate-500 text-sm ml-1">FCFA / {plan.duration_days}j</span>
                            </div>
                            <CardDescription className="text-slate-400 mt-2 min-h-10">{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <ul className="space-y-3">
                                <li className="flex items-center text-sm text-slate-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3" />
                                    {plan.file_limit === null ? "Génération de Liasses Illimitée" : `Jusqu'à ${plan.file_limit} liasses traitées`}
                                </li>
                                <li className="flex items-center text-sm text-slate-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3" />
                                    Tableaux SYSCOHADA et SMT
                                </li>
                                <li className="flex items-center text-sm text-slate-300">
                                    {plan.has_ai_access ? (
                                        <Cpu className="w-5 h-5 text-indigo-400 mr-3 shrink-0" />
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5 text-slate-600 mr-3" />
                                    )}
                                    <span className={plan.has_ai_access ? "text-indigo-300 font-medium" : "text-slate-500 line-through"}>
                                        Audit IA Expert Embarqué
                                    </span>
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            {plan.payment_link && (
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 uppercase shadow-lg shadow-blue-900/20"
                                    onClick={() => handleStartPayment(plan.payment_link!, plan.id)}
                                >
                                    <Banknote className="w-5 h-5 mr-2" /> PAYER D&apos;ABORD
                                </Button>
                            )}

                            {(!plan.payment_link || payClicked[plan.id]) && (
                                <Button
                                    variant={plan.payment_link ? "ghost" : "default"}
                                    className={cn(
                                        "w-full transition-all animate-in fade-in slide-in-from-top-1 duration-500",
                                        !plan.payment_link ? "bg-slate-800 hover:bg-slate-700 h-11 font-bold uppercase" : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-[11px] font-semibold"
                                    )}
                                    onClick={() => {
                                        setSelectedPlanForProof(plan.id);
                                        fileInputRef.current?.click();
                                    }}
                                    disabled={uploading && selectedPlanForProof === plan.id}
                                >
                                    {(uploading && selectedPlanForProof === plan.id) ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <UploadCloud className={cn("mr-2", plan.payment_link ? "w-3 h-3" : "w-5 h-5")} />
                                    )}
                                    {plan.payment_link ? "J'ai déjà payé, envoyer la preuve" : "ENVOYER PREUVE PAIEMENT"}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
            {plans.length === 0 && (
                <div className="text-center py-20 text-slate-500 border border-slate-800 border-dashed rounded-xl">
                    Aucun forfait n'a été publié par l'administrateur pour le moment.
                </div>
            )}
        </div>
    );
}
