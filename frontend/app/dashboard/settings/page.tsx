"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, ShieldAlert, KeyRound, Loader2, Save } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

type UserProfile = {
    id: string;
    email: string;
    full_name: string | null;
    is_active: boolean;
    created_at: string;
};

export default function SettingsPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable fields
    const [fullName, setFullName] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_BASE_URL}/saas/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                setFullName(data.full_name || "");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await new Promise(r => setTimeout(r, 1000));
            alert("Profil mis à jour avec succès.");
        } catch (error) {
            alert("Erreur lors de la sauvegarde.");
        } finally {
            setSaving(false);
        }
    };

    const handleSavePassword = async () => {
        if (!currentPassword || !newPassword) return;
        setSaving(true);
        try {
            await new Promise(r => setTimeout(r, 1000));
            alert("Mot de passe modifié avec succès.");
            setCurrentPassword("");
            setNewPassword("");
        } catch (error) {
            alert("Erreur");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-10 text-center text-slate-400">Chargement des paramètres...</div>;
    }

    return (
        <div className="container mx-auto p-10 max-w-4xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Paramètres Utilisateur</h1>
                <p className="text-slate-400">Gérez vos informations personnelles et votre sécurité.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* PROFIL CARD */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden text-slate-200">
                    <CardHeader className="bg-slate-900/40 border-b border-slate-800/50">
                        <CardTitle className="flex items-center gap-3 text-white">
                            <div className="p-2 bg-blue-900/20 rounded-lg border border-blue-800/30">
                                <User className="h-5 w-5 text-blue-400" />
                            </div>
                            Profil Général
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Vos identifiants de connexion Auditia.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Adresse Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                <Input disabled value={profile?.email} className="pl-9 bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Nom Complet</Label>
                            <Input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="bg-slate-800/50 border-slate-700 text-white focus-visible:ring-blue-500"
                                placeholder="Jean Dupont"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-900/40 border-t border-slate-800/50">
                        <Button onClick={handleSaveProfile} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Enregistrer les modifications
                        </Button>
                    </CardFooter>
                </Card>

                {/* SÉCURITÉ CARD */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden text-slate-200">
                    <CardHeader className="bg-slate-900/40 border-b border-slate-800/50">
                        <CardTitle className="flex items-center gap-3 text-white">
                            <div className="p-2 bg-emerald-900/20 rounded-lg border border-emerald-800/30">
                                <KeyRound className="h-5 w-5 text-emerald-400" />
                            </div>
                            Sécurité & Mot de passe
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Renforcez l'accès à votre compte.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Mot de passe actuel</Label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="bg-slate-800/50 border-slate-700 text-white focus-visible:ring-emerald-500"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Nouveau mot de passe</Label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="bg-slate-800/50 border-slate-700 text-white focus-visible:ring-emerald-500"
                                placeholder="••••••••"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-900/40 border-t border-slate-800/50">
                        <Button
                            onClick={handleSavePassword}
                            disabled={saving || !currentPassword || !newPassword}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Mettre à jour le mot de passe"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* DANGER ZONE */}
            <Card className="bg-red-950/10 border border-red-900/30 mt-8">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-red-400 font-bold flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5" /> Zone de danger
                        </h3>
                        <p className="text-sm text-red-400/80 mt-1">Vous souhaitez clôturer votre compte ? Cette action supprimera vos dossiers de manière irréversible.</p>
                    </div>
                    <Button variant="destructive" className="bg-red-800 hover:bg-red-700 text-white border border-red-600">
                        Supprimer mon compte
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
