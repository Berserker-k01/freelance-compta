"use client";

import { useState } from "react";
import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { importBalance } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ImportPage() {
    const { activeCompany } = useCompany();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!activeCompany || !file) return;

        setLoading(true);
        setError(null);
        try {
            const data = await importBalance(activeCompany.id, file);
            setResult(data);
            // Refresh logic could go here if we had a global mutate
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de l'import.");
        } finally {
            setLoading(false);
        }
    };

    if (!activeCompany) {
        return <div className="p-10">Veuillez sélectionner un dossier.</div>;
    }

    return (
        <div className="container mx-auto p-10 max-w-4xl">
            <div className="mb-8">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="pl-0 mb-4 hover:bg-transparent hover:underline text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Dashboard
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400">Import de Balance</h1>
                <p className="text-muted-foreground">
                    Importez votre Balance Générale (Excel ou CSV) pour alimenter la comptabilité de <strong>{activeCompany.name}</strong>.
                </p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Sélection du Fichier</CardTitle>
                        <CardDescription>
                            Le fichier doit contenir les colonnes : <strong>Compte</strong>, <strong>Libellé</strong>, <strong>Débit</strong>, <strong>Crédit</strong> (ou <strong>Solde</strong>).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="balance-file">Fichier Balance (.xlsx, .csv)</Label>
                            <Input id="balance-file" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                        </div>

                        {file && (
                            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-100">
                                <FileSpreadsheet className="h-4 w-4" />
                                {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </div>
                        )}

                        <div className="pt-4">
                            <Button onClick={handleUpload} disabled={!file || loading} className="w-full sm:w-auto">
                                {loading && <Upload className="mr-2 h-4 w-4 animate-spin" />}
                                {!loading && <Upload className="mr-2 h-4 w-4" />}
                                {loading ? "Import en cours..." : "Importer la Balance"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Erreur</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {result && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-green-100 rounded-full">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-green-900 mb-2">Import réussi !</h3>
                        <p className="text-green-700 mb-6">
                            <strong>{result.entries_count}</strong> lignes ont été importées. La balance est à jour.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button variant="outline" onClick={() => router.push('/dashboard/documents')} className="border-green-600 text-green-700 hover:bg-green-100">
                                📂 Voir les documents
                            </Button>
                            <Button size="lg" onClick={() => router.push('/dashboard/templates')} className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200">
                                <FileSpreadsheet className="mr-2 h-5 w-5" />
                                Générer la Liasse
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
