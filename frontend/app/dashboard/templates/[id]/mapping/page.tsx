"use client";

import { useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, ArrowLeft, Trash2 } from "lucide-react";
import { getTemplate, updateTemplateMapping, Template } from "@/lib/templates-api";

interface MappingRule {
    cell: string;
    rule: string; // "701", "SUM(70*)", etc.
    desc: string;
}

export default function MappingPage({ params }: { params: Promise<{ id: string }> }) {
    // Correctly unwrap params using React.use()
    const { id } = use(params);
    const templateId = id;

    const [template, setTemplate] = useState<Template | null>(null);
    const [rules, setRules] = useState<MappingRule[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // New Rule State
    const [newCell, setNewCell] = useState("");
    const [newRule, setNewRule] = useState("");
    const [newDesc, setNewDesc] = useState("");

    useEffect(() => {
        if (!templateId) return;
        getTemplate(templateId).then(t => {
            if (t) {
                setTemplate(t as any); // Cast slightly if types mismatch (mapping_config missing in type def)
                try {
                    // Check if mapping_config exists on the fetched object. 
                    // Since getTemplates returns a list, and our frontend type definition might be outdated, we cast.
                    const configStr = (t as any).mapping_config || "{}";
                    const parsed = JSON.parse(configStr);
                    // Conversion JSON -> Array
                    const loadedRules = Object.entries(parsed).map(([cell, rule]) => ({
                        cell,
                        rule: rule as string,
                        desc: "Règle importée"
                    }));
                    setRules(loadedRules);
                } catch (e) {
                    console.error("Mapping parse error", e);
                }
            }
            setLoading(false);
        });
    }, [templateId]);

    const addRule = () => {
        if (!newCell || !newRule) return;
        setRules([...rules, { cell: newCell, rule: newRule, desc: newDesc }]);
        setNewCell("");
        setNewRule("");
        setNewDesc("");
    };

    const removeRule = (index: number) => {
        const newRules = [...rules];
        newRules.splice(index, 1);
        setRules(newRules);
    };

    const saveMapping = async () => {
        if (!template) return;
        // Convert Array -> JSON
        // { "F14": "701", ... }
        const mappingObj: Record<string, string> = {};
        rules.forEach(r => {
            mappingObj[r.cell] = r.rule;
        });

        try {
            await updateTemplateMapping(template.id, JSON.stringify(mappingObj));
            alert("Mapping sauvegardé avec succès !");
            router.push("/dashboard/templates");
        } catch (e) {
            alert("Erreur lors de la sauvegarde.");
        }
    };

    if (loading) return <div className="p-10">Chargement...</div>;
    if (!template) return <div className="p-10">Modèle introuvable.</div>;

    return (
        <div className="container mx-auto p-10 max-w-5xl bg-[#1a2332] min-h-screen text-slate-200 selection:bg-purple-500/30">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Configuration du Mapping</h1>
                    <p className="text-slate-400 mt-1">Modèle : <strong className="text-purple-400">{template.name}</strong> ({template.year})</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Form to add */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-slate-800/50 bg-slate-900/40">
                        <CardTitle className="text-white">Ajouter une Règle</CardTitle>
                        <CardDescription className="text-slate-400">Liez une cellule Excel à un compte comptable.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Cellule Excel</Label>
                                <Input
                                    placeholder="Ex: F14 ou Feuil1!F14"
                                    value={newCell}
                                    onChange={e => setNewCell(e.target.value)}
                                    className="bg-slate-950/50 border-slate-700 text-slate-200 focus-visible:ring-purple-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Compte(s)</Label>
                                <Input
                                    placeholder="Ex: 701, 702 ou 70*"
                                    value={newRule}
                                    onChange={e => setNewRule(e.target.value)}
                                    className="bg-slate-950/50 border-slate-700 text-slate-200 focus-visible:ring-purple-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Description (Optionnel)</Label>
                            <Input
                                placeholder="Ex: Ventes de marchandises"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                                className="bg-slate-950/50 border-slate-700 text-slate-200 focus-visible:ring-purple-500"
                            />
                        </div>
                        <Button onClick={addRule} className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-md">
                            <Plus className="h-4 w-4 mr-2" /> Ajouter la règle
                        </Button>
                    </CardContent>
                </Card>

                {/* Rules List */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden">
                    <CardHeader className="border-b border-slate-800/50 bg-slate-900/40">
                        <CardTitle className="text-white">Règles Actives ({rules.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700">
                        <Table>
                            <TableHeader className="bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm shadow-sm border-b border-slate-700/50">
                                <TableRow className="hover:bg-transparent border-slate-700/50">
                                    <TableHead className="font-semibold text-slate-300 pl-6 w-[100px]">Cellule</TableHead>
                                    <TableHead className="font-semibold text-slate-300">Règle</TableHead>
                                    <TableHead className="w-[60px] pr-6"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rules.length === 0 && (
                                    <TableRow><TableCell colSpan={3} className="text-center py-12 text-slate-400">Aucune règle définie.</TableCell></TableRow>
                                )}
                                {rules.map((r, i) => (
                                    <TableRow key={i} className="hover:bg-slate-800/30 border-slate-700/50 transition-colors group">
                                        <TableCell className="font-mono font-bold text-emerald-400 pl-6">{r.cell}</TableCell>
                                        <TableCell>
                                            <div className="font-mono text-xs bg-slate-800/50 border border-slate-700 text-slate-200 p-1.5 rounded inline-block">
                                                {r.rule}
                                            </div>
                                            {r.desc && <div className="text-xs text-slate-400 mt-1">{r.desc}</div>}
                                        </TableCell>
                                        <TableCell className="pr-6 text-right">
                                            <Button variant="ghost" size="icon" onClick={() => removeRule(i)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/30 hover:text-red-400 text-slate-500">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="pt-6 border-t border-slate-700/50 mt-8 flex justify-end">
                <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-500/50" onClick={saveMapping}>
                    <Save className="h-5 w-5 mr-2" />
                    Sauvegarder la Configuration
                </Button>
            </div>
        </div>
    );
}
