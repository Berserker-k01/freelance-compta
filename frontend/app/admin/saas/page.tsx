"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { CreditCard, CheckCircle, XCircle, Search, Users, Banknote, ShieldAlert, Cpu, Infinity as InfinityIcon, LogOut, Upload, Trash2, FileCode, Download, RefreshCw, AlertCircle, Server } from "lucide-react";
import { useRef } from "react";
import { API_BASE_URL } from "@/lib/api";

type SubscriptionPlan = {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    has_ai_access: boolean;
    file_limit: number | null;
    payment_link: string;
    created_at: string;
};

type UserData = {
    id: string;
    email: string;
    full_name: string;
    plan_id: string;
    plan_status: string;
    files_processed_count: number;
    created_at: string;
};

type PaymentProof = {
    id: string;
    user_email: string;
    plan_name: string;
    image_path: string;
    status: string;
    created_at: string;
};

export default function AdminSaasDashboard() {
    const router = useRouter();
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [proofs, setProofs] = useState<PaymentProof[]>([]);

    // Plan states
    const [newPlan, setNewPlan] = useState({
        name: "", description: "", price: 0, duration_days: 30, has_ai_access: false, file_limit: "", payment_link: ""
    });
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
    const [assigningUser, setAssigningUser] = useState<UserData | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");

    // Exe states
    const [uploadingExe, setUploadingExe] = useState(false);
    const exeInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchPlans();
        fetchUsers();
        fetchProofs();
    }, []);

    const fetchPlans = async () => {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE_URL}/saas/plans`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setPlans(await res.json());
    };

    const fetchUsers = async () => {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE_URL}/saas/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setUsers(await res.json());
    };

    const fetchProofs = async () => {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE_URL}/saas/admin/proofs?status=pending`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setProofs(await res.json());
    };

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem("access_token");
        const payload = {
            ...newPlan,
            file_limit: newPlan.file_limit === "" ? null : parseInt(newPlan.file_limit as string),
        };
        const res = await fetch(`${API_BASE_URL}/saas/admin/plans`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            setNewPlan({ name: "", description: "", price: 0, duration_days: 30, has_ai_access: false, file_limit: "", payment_link: "" });
            fetchPlans();
            alert("Plan créé !");
        }
    };

    const handleUpdatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlan) return;
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE_URL}/saas/admin/plans/${editingPlan.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(editingPlan),
        });
        if (res.ok) {
            setEditingPlan(null);
            fetchPlans();
            alert("Forfait mis à jour !");
        }
    };

    const handleAssignPlan = async () => {
        if (!assigningUser || !selectedPlanId) return;
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE_URL}/saas/admin/users/${assigningUser.id}/assign-plan?plan_id=${selectedPlanId}&status=active`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            setAssigningUser(null);
            setSelectedPlanId("");
            fetchUsers();
            alert("Forfait assigné avec succès !");
        } else {
            alert("Erreur lors de l'assignation.");
        }
    };

    const handleReviewProof = async (proofId: string, action: "approve" | "reject") => {
        if (!confirm(`Voulez-vous ${action === "approve" ? "valider" : "rejeter"} ce paiement ?`)) return;
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE_URL}/saas/admin/proofs/${proofId}/review?action=${action}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            fetchProofs();
            fetchUsers();
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        router.push("/admin/login");
    };

    const handleUploadExe = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingExe(true);
        const token = localStorage.getItem("access_token");
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`${API_BASE_URL}/saas/admin/upload-exe`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) alert("Exécutable mis à jour !");
            else alert("Erreur lors de l'upload.");
        } catch (error) {
            console.error(error);
        } finally {
            setUploadingExe(false);
            if (exeInputRef.current) exeInputRef.current.value = "";
        }
    };

    const handleDeleteExe = async () => {
        if (!confirm("Supprimer l'installeur actuel ?")) return;
        const token = localStorage.getItem("access_token");
        try {
            const res = await fetch(`${API_BASE_URL}/saas/admin/upload-exe`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) alert("Fichier supprimé.");
            else alert("Erreur.");
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen bg-[#070b14] text-slate-200 p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                <header className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                            <ShieldAlert className="w-8 h-8 text-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Console SaaS & Abonnements</h1>
                            <p className="text-slate-400">Gestion des offres, clients et vérification des paiements.</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="bg-slate-900 border-slate-700 text-red-500 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/50 font-bold uppercase transition-all"
                    >
                        <LogOut className="w-4 h-4 mr-2" /> DÉCONNEXION
                    </Button>
                </header>

                <Tabs defaultValue="proofs" className="space-y-6">
                    <TabsList className="bg-slate-900 border border-slate-800 p-1">
                        <TabsTrigger value="proofs" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white"><Banknote className="w-4 h-4 mr-2" /> Preuves de Paiement</TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white"><Users className="w-4 h-4 mr-2" /> Clients & Abonnements</TabsTrigger>
                        <TabsTrigger value="plans" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white"><CreditCard className="w-4 h-4 mr-2" /> Offres & Forfaits</TabsTrigger>
                        <TabsTrigger value="exe" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white"><Server className="w-4 h-4 mr-2" /> Exécutables</TabsTrigger>
                    </TabsList>

                    {/* ONGLET PREUVES */}
                    <TabsContent value="proofs">
                        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-white">Validation Manuelle des Paiements</CardTitle>
                                <CardDescription className="text-slate-400">Paiements en attente de vérification ({proofs.length})</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {proofs.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">Aucun paiement en attente.</div>
                                ) : (
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        {proofs.map((p) => (
                                            <Card key={p.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                                                <div className="h-40 bg-slate-950 flex flex-col items-center justify-center p-2 relative group">
                                                    {/* In a real app we'd display `<img src={...} />` here */}
                                                    <span className="text-xs text-slate-500">[{p.image_path}]</span>
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <Button variant="outline" className="border-slate-500 text-white hover:bg-white/20">Agrandir la preuve</Button>
                                                    </div>
                                                </div>
                                                <CardContent className="p-4">
                                                    <h3 className="font-semibold text-white mb-1">{p.user_email}</h3>
                                                    <Badge className="bg-blue-600">{p.plan_name}</Badge>
                                                    <p className="text-xs text-slate-400 mt-2">Soumis le: {new Date(p.created_at).toLocaleDateString()}</p>
                                                </CardContent>
                                                <CardFooter className="bg-slate-900 p-3 flex gap-2">
                                                    <Button onClick={() => handleReviewProof(p.id, "approve")} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"><CheckCircle className="w-4 h-4 mr-1" /> Valider</Button>
                                                    <Button onClick={() => handleReviewProof(p.id, "reject")} variant="destructive" className="flex-1 bg-red-600/80 hover:bg-red-500"><XCircle className="w-4 h-4 mr-1" /> Rejeter</Button>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ONGLET USERS */}
                    <TabsContent value="users">
                        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-white">Base Clients</CardTitle>
                                <CardDescription className="text-slate-400">Modifiez manuellement les droits d'accès.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-slate-700 text-slate-400">
                                            <TableHead>Email</TableHead>
                                            <TableHead>Statut Abonnement</TableHead>
                                            <TableHead>Forfait</TableHead>
                                            <TableHead>Fichiers Traités</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.map((u) => (
                                            <TableRow key={u.id} className="border-slate-800 hover:bg-slate-800/50 text-slate-300">
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell>
                                                    {u.plan_status === "active" ? <Badge className="bg-emerald-500">Actif</Badge> :
                                                        u.plan_status === "pending" ? <Badge className="bg-amber-500">En cours</Badge> :
                                                            <Badge className="bg-slate-700 text-slate-300">Inactif</Badge>}
                                                </TableCell>
                                                <TableCell>{plans.find(p => p.id === u.plan_id)?.name || "Aucun"}</TableCell>
                                                <TableCell>{u.files_processed_count}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setAssigningUser(u);
                                                            setSelectedPlanId(u.plan_id || "");
                                                        }}
                                                        className="text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 font-bold uppercase text-[10px]"
                                                    >
                                                        FORCER LE FORFAIT
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ONGLET PLANS */}
                    <TabsContent value="plans">
                        <div className="grid md:grid-cols-3 gap-6">

                            <div className="md:col-span-1">
                                <Card className="bg-slate-900 border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.05)]">
                                    <form onSubmit={handleCreatePlan}>
                                        <CardHeader>
                                            <CardTitle className="text-white text-lg">Créer un Forfait</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-1">
                                                <Label className="text-slate-400">Nom du Forfait</Label>
                                                <Input required value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} className="bg-slate-800 border-slate-700 text-white" placeholder="Ex: Pro Unlimited" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <Label className="text-slate-400">Prix (FCFA)</Label>
                                                    <Input required type="number" value={newPlan.price} onChange={e => setNewPlan({ ...newPlan, price: Number(e.target.value) })} className="bg-slate-800 border-slate-700 text-white" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-slate-400">Durée (Jours)</Label>
                                                    <Input required type="number" value={newPlan.duration_days} onChange={e => setNewPlan({ ...newPlan, duration_days: Number(e.target.value) })} className="bg-slate-800 border-slate-700 text-white" />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-slate-400">Limite de Fichiers (Vide = Illimité)</Label>
                                                <Input type="number" value={newPlan.file_limit} onChange={e => setNewPlan({ ...newPlan, file_limit: e.target.value })} className="bg-slate-800 border-slate-700 text-white" placeholder="Illimité" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-slate-400">Lien de Paiement (Stripe, FedaPay...)</Label>
                                                <Input value={newPlan.payment_link} onChange={e => setNewPlan({ ...newPlan, payment_link: e.target.value })} className="bg-slate-800 border-slate-700 text-white" placeholder="https://buy.stripe.com/..." />
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 bg-indigo-500/10 p-2 rounded border border-indigo-500/20">
                                                <input type="checkbox" id="ai" checked={newPlan.has_ai_access} onChange={e => setNewPlan({ ...newPlan, has_ai_access: e.target.checked })} className="rounded bg-slate-800 border-slate-600 text-indigo-500" />
                                                <Label htmlFor="ai" className="text-indigo-300 font-medium cursor-pointer">Activer l'Audit IA (Qwen)</Label>
                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white">Ajouter au catalogue</Button>
                                        </CardFooter>
                                    </form>
                                </Card>
                            </div>

                            <div className="md:col-span-2 space-y-4">
                                {plans.map((p) => (
                                    <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex gap-4 items-center ring-1 ring-white/5 relative overflow-hidden">
                                        {p.has_ai_access && <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded-bl-lg">IA INCLUSE</div>}
                                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                                            <Banknote className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-white">{p.name}</h3>
                                            <div className="flex gap-4 mt-2 text-sm text-slate-400">
                                                <span>Prix: <strong className="text-orange-400">{p.price} FCFA</strong></span>
                                                <span>Durée: <strong>{p.duration_days} j.</strong></span>
                                                <span>Traitement: <strong>{p.file_limit === null ? <InfinityIcon className="w-4 h-4 inline" /> : `${p.file_limit} liasses`}</strong></span>
                                            </div>
                                            {p.payment_link && <p className="text-xs text-blue-400 mt-2 truncate w-64 block">Lien: {p.payment_link}</p>}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setEditingPlan(p)}
                                            className="bg-slate-800 border-slate-600 text-slate-200 hover:text-white hover:bg-slate-700 font-bold uppercase text-[10px] tracking-wider px-3 h-7 transition-all"
                                        >
                                            EDITER
                                        </Button>
                                    </div>
                                ))}
                                {plans.length === 0 && <p className="text-slate-500 text-center py-10 border border-dashed border-slate-700 rounded-xl">Aucun forfait configuré. Configurez votre offre SaaS.</p>}
                            </div>

                        </div>
                    </TabsContent>
                    {/* ONGLET EXE */}
                    <TabsContent value="exe">
                        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <FileCode className="w-5 h-5 text-orange-400" /> Gestion de l&apos;Exécutable Windows
                                </CardTitle>
                                <CardDescription className="text-slate-400">Chargez la nouvelle version de l&apos;application desktop pour vos clients.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div className="p-10 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-4 bg-slate-950/20">
                                    <div className="p-4 bg-orange-500/10 rounded-full">
                                        <Upload className="w-10 h-10 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-lg uppercase tracking-tight">Mettre à jour l&apos;installeur (.exe)</p>
                                        <p className="text-slate-500 text-sm max-w-md mx-auto mt-1">
                                            Le fichier sera disponible immédiatement sous le nom <b>auditia-setup-1.0.0.exe</b>.
                                        </p>
                                    </div>
                                    <input type="file" accept=".exe" className="hidden" ref={exeInputRef} onChange={handleUploadExe} />
                                    <div className="flex gap-4">
                                        <Button onClick={() => exeInputRef.current?.click()} disabled={uploadingExe} className="bg-orange-600 hover:bg-orange-500 text-white font-black px-8">
                                            {uploadingExe ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
                                            CHOISIR LE FICHIER
                                        </Button>
                                        <Button variant="outline" onClick={handleDeleteExe} className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold uppercase">
                                            <Trash2 className="w-4 h-4 mr-2" /> Supprimer l&apos;actuel
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-slate-800 rounded-lg"><Download className="w-5 h-5 text-slate-500" /></div>
                                            <div>
                                                <p className="text-white font-medium text-sm">Lien de téléchargement public</p>
                                                <p className="text-[10px] text-orange-500 font-mono">/downloads/auditia-setup-1.0.0.exe</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-slate-800 rounded-lg"><AlertCircle className="w-5 h-5 text-slate-500" /></div>
                                            <div>
                                                <p className="text-white font-medium text-sm">Statut du déploiement</p>
                                                <p className="text-[10px] text-emerald-400 font-bold">PRÊT POUR LE CLOUD</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
                {/* MODAL EDIT PLAN */}
                {editingPlan && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="bg-slate-900 border-slate-700 w-full max-w-md shadow-2xl">
                            <form onSubmit={handleUpdatePlan}>
                                <CardHeader>
                                    <CardTitle className="text-white">Modifier le Forfait</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1">
                                        <Label className="text-slate-400 font-bold uppercase text-xs">Nom</Label>
                                        <Input required value={editingPlan.name} onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-slate-400 font-bold uppercase text-xs">Prix (FCFA)</Label>
                                            <Input required type="number" value={editingPlan.price} onChange={e => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })} className="bg-slate-800 border-slate-700 text-white" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-slate-400 font-bold uppercase text-xs">Durée (j)</Label>
                                            <Input required type="number" value={editingPlan.duration_days} onChange={e => setEditingPlan({ ...editingPlan, duration_days: Number(e.target.value) })} className="bg-slate-800 border-slate-700 text-white" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-400 font-bold uppercase text-xs">Lien de Paiement</Label>
                                        <Input value={editingPlan.payment_link || ""} onChange={e => setEditingPlan({ ...editingPlan, payment_link: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                                    </div>
                                    <div className="flex items-center gap-2 bg-indigo-500/10 p-2 rounded border border-indigo-500/20">
                                        <input type="checkbox" id="edit-ai" checked={editingPlan.has_ai_access} onChange={e => setEditingPlan({ ...editingPlan, has_ai_access: e.target.checked })} />
                                        <Label htmlFor="edit-ai" className="text-indigo-400 text-sm font-bold uppercase">Audit IA Inclus</Label>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                    <Button type="button" variant="ghost" onClick={() => setEditingPlan(null)} className="flex-1 text-slate-400">Annuler</Button>
                                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase">Enregistrer</Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                )}

                {/* MODAL ASSIGN USER PLAN */}
                {assigningUser && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="bg-slate-900 border-slate-700 w-full max-w-sm shadow-2xl text-slate-200">
                            <CardHeader>
                                <CardTitle className="text-white">Assigner un Forfait</CardTitle>
                                <CardDescription>Choisir une offre pour <strong>{assigningUser.email}</strong></CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Label className="text-slate-400 font-bold uppercase text-xs">Sélectionner l&apos;offre</Label>
                                <select
                                    value={selectedPlanId}
                                    onChange={(e) => setSelectedPlanId(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="">--- Aucun Forfait ---</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.price} FCFA)</option>
                                    ))}
                                </select>
                            </CardContent>
                            <CardFooter className="flex gap-2">
                                <Button variant="ghost" onClick={() => setAssigningUser(null)} className="flex-1 text-slate-400">Annuler</Button>
                                <Button onClick={handleAssignPlan} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase">Confirmer</Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
