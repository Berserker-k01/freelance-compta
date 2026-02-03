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
    const templateId = Number(id);

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
        <div className="container mx-auto p-10 max-w-4xl space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Configuration du Mapping</h1>
                    <p className="text-muted-foreground">Modèle : {template.name} ({template.year})</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Form to add */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ajouter une Règle</CardTitle>
                        <CardDescription>Liez une cellule Excel à un compte comptable.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cellule Excel</Label>
                                <Input
                                    placeholder="Ex: F14 ou Feuil1!F14"
                                    value={newCell}
                                    onChange={e => setNewCell(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Compte(s)</Label>
                                <Input
                                    placeholder="Ex: 701, 702 ou 70*"
                                    value={newRule}
                                    onChange={e => setNewRule(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description (Optionnel)</Label>
                            <Input
                                placeholder="Ex: Ventes de marchandises"
                                value={newDesc}
                                onChange={e => setNewDesc(e.target.value)}
                            />
                        </div>
                        <Button onClick={addRule} className="w-full">
                            <Plus className="h-4 w-4 mr-2" /> Ajouter
                        </Button>
                    </CardContent>
                </Card>

                {/* Rules List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Règles Actives ({rules.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cellule</TableHead>
                                    <TableHead>Règle</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rules.map((r, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-mono font-bold">{r.cell}</TableCell>
                                        <TableCell>
                                            <div className="font-mono text-xs bg-slate-100 p-1 rounded inline-block">
                                                {r.rule}
                                            </div>
                                            {r.desc && <div className="text-xs text-muted-foreground">{r.desc}</div>}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => removeRule(i)}>
                                                <Trash2 className="h-3 w-3 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Button size="lg" className="w-full bg-green-600 hover:bg-green-700" onClick={saveMapping}>
                <Save className="h-5 w-5 mr-2" /> Sauvegarder la Configuration
            </Button>
        </div>
    );
}
