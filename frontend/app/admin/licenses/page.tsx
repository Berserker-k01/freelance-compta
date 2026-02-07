"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE_URL } from "@/lib/api";
import { Copy, Key, ShieldCheck, Plus } from "lucide-react";
import { format } from "date-fns";

interface License {
    id: number;
    key: string;
    client_name: string;
    max_workstations: number;
    expiration_date: string;
    is_active: boolean;
    machine_id?: string;
    created_at: string;
}

export default function AdminLicensesPage() {
    // In a real app, this should be protected by Admin Auth
    const [licenses, setLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(false);

    // Form state
    const [clientName, setClientName] = useState("");
    const [duration, setDuration] = useState("365");
    const [workstations, setWorkstations] = useState("1");
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);

    // Mock fetch for now (since we don't have a list endpoint yet, let's just show generated one)
    // Actually, I should probably add a list endpoint to the router if I want to see them.
    // For MVP, let's just focus on Generation.

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/licenses/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    client_name: clientName,
                    max_workstations: parseInt(workstations),
                    duration_days: parseInt(duration)
                })
            });

            if (res.ok) {
                const data = await res.json();
                setGeneratedKey(data.key);
                setLicenses([data, ...licenses]); // Add to local list
            }
        } catch (error) {
            console.error("Error generating license:", error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Clé copiée !");
    };

    return (
        <div className="container mx-auto p-10 max-w-5xl">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-100 rounded-full">
                    <ShieldCheck className="h-8 w-8 text-indigo-700" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-indigo-900">Administration des Licences</h1>
                    <p className="text-indigo-500">Générateur de clés d'activation pour vos clients.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Generator Form */}
                <Card className="md:col-span-1 border-indigo-200 shadow-lg">
                    <CardHeader className="bg-indigo-50/50">
                        <CardTitle className="text-indigo-800">Nouvelle Licence</CardTitle>
                        <CardDescription>Créer une clé d'activation.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                            <Label>Nom du Client</Label>
                            <Input
                                placeholder="Ex: Société ABC"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Durée de validité</Label>
                            <Select value={duration} onValueChange={setDuration}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="30">1 Mois (Essai)</SelectItem>
                                    <SelectItem value="365">1 An</SelectItem>
                                    <SelectItem value="730">2 Ans</SelectItem>
                                    <SelectItem value="1095">3 Ans</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Postes autorisés</Label>
                            <Input
                                type="number"
                                min="1"
                                value={workstations}
                                onChange={(e) => setWorkstations(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full bg-indigo-600 hover:bg-indigo-700 mt-4"
                            onClick={handleGenerate}
                            disabled={loading || !clientName}
                        >
                            {loading ? "Génération..." : "Générer la Clé"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results / List */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Clés Générées (Session)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {generatedKey && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col items-center text-center animate-in zoom-in">
                                <h3 className="text-green-800 font-semibold mb-2">Clé Générée avec Succès !</h3>
                                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded border border-green-300 shadow-sm">
                                    <Key className="h-5 w-5 text-green-600" />
                                    <code className="text-xl font-mono tracking-widest text-green-700 font-bold">{generatedKey}</code>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 ml-2 text-gray-500 hover:text-green-700" onClick={() => copyToClipboard(generatedKey)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-green-600 mt-2">Valide pour {clientName} ({workstations} poste(s))</p>
                            </div>
                        )}

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Clé</TableHead>
                                    <TableHead>Expiration</TableHead>
                                    <TableHead>Postes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {licenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            Aucune clé générée dans cette session.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    licenses.map((lic) => (
                                        <TableRow key={lic.id}>
                                            <TableCell className="font-medium">{lic.client_name}</TableCell>
                                            <TableCell className="font-mono text-xs">{lic.key}</TableCell>
                                            <TableCell>{format(new Date(lic.expiration_date), "dd/MM/yyyy")}</TableCell>
                                            <TableCell>{lic.max_workstations}</TableCell>
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
