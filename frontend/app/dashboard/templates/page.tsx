"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, FileSpreadsheet, Upload, Globe, Play, Settings } from "lucide-react";
import { getTemplates, uploadTemplate, deleteTemplate, generateReportFromTemplate, Template } from "@/lib/templates-api";

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Load templates
    const load = async () => {
        try {
            const data = await getTemplates();
            setTemplates(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // Form handling
    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setUploading(true);

        try {
            const formData = new FormData(e.currentTarget);
            await uploadTemplate(formData);
            await load(); // Reload list
            (e.target as HTMLFormElement).reset(); // Reset form
        } catch (err: any) {
            alert("Erreur upload: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Supprimer ce modèle ?")) return;
        await deleteTemplate(id);
        load();
    }

    const handleGenerate = async (id: number, name: string) => {
        setGenerating(true);
        try {
            const blob = await generateReportFromTemplate(id, 1); // Company ID 1 hardcoded
            // Download Blob
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Liasse_${name}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            alert("Erreur génération");
        } finally {
            setGenerating(false);
        }
    }

    return (
        <div className="container mx-auto p-10 max-w-5xl space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400">Modèles de Liasses (Templates)</h1>
                    <p className="text-muted-foreground">Gérez vos fichiers Excel (SYSCOHADA, OTR, GUDEF) pour chaque pays et année.</p>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Upload Form */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Nouveau Modèle</CardTitle>
                        <CardDescription>Ajouter un fichier vierge (.xlsx)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nom du Modèle</Label>
                                <Input id="name" name="name" placeholder="Ex: Liasse GUDEF Togo" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="country">Pays</Label>
                                    <Input id="country" name="country" placeholder="TG" defaultValue="TG" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="year">Année</Label>
                                    <Input id="year" name="year" type="number" defaultValue="2026" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="file">Fichier Excel</Label>
                                <Input id="file" name="file" type="file" accept=".xlsx" required />
                            </div>

                            <Button type="submit" className="w-full" disabled={uploading}>
                                {uploading ? "Envoi..." : "Uploader"} <Upload className="ml-2 h-4 w-4" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Modèles Disponibles</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Pays / Année</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {templates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            Aucun modèle. Uploadez votre premier fichier Excel.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    templates.map((t) => (
                                        <TableRow key={t.id}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                                {t.name}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-3 w-3" /> {t.country}
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{t.year}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleGenerate(t.id, t.name)} disabled={generating}>
                                                    <Play className="h-4 w-4 mr-1 text-blue-600" /> {generating ? "..." : "Générer"}
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
