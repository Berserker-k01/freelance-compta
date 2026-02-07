"use client";

import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, Lock, User } from "lucide-react";

export default function SettingsPage() {
    const { activeCompany } = useCompany();

    if (!activeCompany) {
        return <div className="p-10">Veuillez sélectionner un dossier.</div>;
    }

    return (
        <div className="container mx-auto p-10 max-w-4xl animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-slate-100 rounded-full">
                    <Settings className="h-6 w-6 text-slate-700" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Paramètres du Dossier</h1>
                    <p className="text-slate-500">Configuration générale pour <strong>{activeCompany.name}</strong>.</p>
                </div>
            </div>

            <div className="grid gap-6">
                {/* General Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" /> Informations Générales
                        </CardTitle>
                        <CardDescription>Modifiez les informations légales de la société.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Raison Sociale</Label>
                                <Input id="name" defaultValue={activeCompany.name} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="nif">NIF (Numéro d'Identification Fiscale)</Label>
                                <Input id="nif" defaultValue={activeCompany.tax_id} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Adresse</Label>
                                <Input id="address" defaultValue={activeCompany.address || ""} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">Ville</Label>
                                <Input id="city" defaultValue={activeCompany.city || ""} />
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button>
                                <Save className="mr-2 h-4 w-4" /> Enregistrer les modifications
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Account Settings (Placeholder for now) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Lock className="h-5 w-5 text-orange-600" /> Sécurité & Accès
                        </CardTitle>
                        <CardDescription>Gérez les utilisateurs ayant accès à ce dossier (Bientôt disponible).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-md text-orange-800 text-sm">
                            La gestion multi-utilisateurs sera disponible dans la prochaine mise à jour.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
