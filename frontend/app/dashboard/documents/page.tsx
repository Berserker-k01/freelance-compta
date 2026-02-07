"use client";

import { useEffect, useState } from "react";
import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { FileText, Download, Trash2, ArrowLeft, Upload, FileSpreadsheet, ArrowUpRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";

interface Document {
    id: number;
    name: string;
    filename: string;
    file_type: string;
    created_at: string;
}

export default function DocumentsPage() {
    const { activeCompany } = useCompany();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeCompany) {
            fetchDocuments();
        }
    }, [activeCompany]);

    const fetchDocuments = async () => {
        if (!activeCompany) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/documents/list/${activeCompany.id}`);
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (docId: number, filename: string) => {
        // Direct download link
        window.open(`${API_BASE_URL}/documents/download/${docId}`, "_blank");
    };

    const handleDelete = async (docId: number) => {
        if (!confirm("Voulez-vous vraiment supprimer ce document ?")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/documents/${docId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                fetchDocuments();
            }
        } catch (error) {
            console.error("Error deleting document:", error);
        }
    };

    if (!activeCompany) {
        return <div className="p-10">Veuillez sélectionner un dossier.</div>;
    }

    return (
        <div className="container mx-auto p-10 max-w-6xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="pl-0 mb-2 hover:bg-transparent hover:underline text-muted-foreground">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Dashboard
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-400">Espace Documentaire</h1>
                    <p className="text-muted-foreground">
                        Gérez les fichiers du dossier <strong>{activeCompany.name}</strong>.
                    </p>
                </div>
                <Link href="/dashboard/import">
                    <Button>
                        <Upload className="mr-2 h-4 w-4" /> Importer une Balance
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Documents Stockés</CardTitle>
                    <CardDescription>
                        Historique des imports et fichiers liés.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date d'ajout</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4">Chargement...</TableCell>
                                </TableRow>
                            ) : documents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        Aucun document trouvé.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                documents.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            {doc.file_type === 'balance' ? <FileSpreadsheet className="h-4 w-4 text-green-600" /> : <FileText className="h-4 w-4 text-blue-600" />}
                                            {doc.name}
                                        </TableCell>
                                        <TableCell>
                                            <span className="capitalize">{doc.file_type}</span>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {doc.file_type === 'balance' && (
                                                <>
                                                    <Link href={`/dashboard/journal?documentId=${doc.id}`}>
                                                        <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50 mr-2">
                                                            <FileText className="h-4 w-4 mr-1" /> Voir/Modifier
                                                        </Button>
                                                    </Link>
                                                    <Link href="/dashboard/templates">
                                                        <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50 mr-2">
                                                            <ArrowUpRight className="h-4 w-4 mr-1" /> Générer Liasse
                                                        </Button>
                                                    </Link>
                                                </>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => handleDownload(doc.id, doc.filename)}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(doc.id)}>
                                                <Trash2 className="h-4 w-4" />
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
    );
}
