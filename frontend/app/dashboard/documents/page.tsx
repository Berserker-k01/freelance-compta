"use client";

import { useEffect, useState } from "react";
import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { FileText, Download, Trash2, ArrowLeft, Upload, FileSpreadsheet, ArrowUpRight, MoreHorizontal, Eye } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Document {
    id: string;
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

    const handleDownload = (docId: string, filename: string) => {
        // Direct download link
        window.open(`${API_BASE_URL}/documents/download/${docId}`, "_blank");
    };

    const handleDelete = async (docId: string) => {
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
                        <Button variant="ghost" size="sm" className="pl-0 mb-4 hover:bg-transparent hover:underline text-muted-foreground group">
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Retour au Dashboard
                        </Button>
                    </Link>
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl rounded-full opacity-50"></div>
                        <h1 className="relative text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Espace Documentaire</h1>
                        <p className="relative text-slate-500 mt-2 text-lg">
                            Gérez les fichiers du dossier <strong className="text-slate-700">{activeCompany.name}</strong>.
                        </p>
                    </div>
                </div>
                <Link href="/dashboard/import">
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all rounded-xl font-medium px-4 h-11 transform hover:-translate-y-0.5">
                        <Upload className="mr-2 h-4 w-4" /> Importer une Balance
                    </Button>
                </Link>
            </div>

            <Card className="border-0 ring-1 ring-slate-200 shadow-lg bg-white overflow-hidden">
                <CardHeader className="border-b bg-slate-50/50">
                    <CardTitle className="text-slate-800">Documents Stockés</CardTitle>
                    <CardDescription className="text-slate-500">
                        Historique des imports et fichiers liés.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-semibold text-slate-600 pl-6">Nom du Fichier</TableHead>
                                <TableHead className="font-semibold text-slate-600">Type</TableHead>
                                <TableHead className="font-semibold text-slate-600">Date d'ajout</TableHead>
                                <TableHead className="text-right font-semibold text-slate-600 pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-slate-500">Chargement des documents...</TableCell>
                                </TableRow>
                            ) : documents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-16 text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <FileText className="h-10 w-10 text-slate-300" />
                                            <p>Aucun document trouvé.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                documents.map((doc) => (
                                    <TableRow key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <TableCell className="font-medium text-slate-700 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-lg", doc.file_type === 'balance' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600")}>
                                                    {doc.file_type === 'balance' ? <FileSpreadsheet className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span>{doc.name}</span>
                                                    <span className="text-xs text-slate-500 font-normal">{doc.filename}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", doc.file_type === 'balance' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-700 border-slate-200")}>
                                                {doc.file_type === 'balance' ? 'Balance Générale' : 'Autre Document'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            {format(new Date(doc.created_at), "dd/MM/yyyy à HH:mm")}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-200">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    {doc.file_type === 'balance' && (
                                                        <>
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/dashboard/journal?documentId=${doc.id}`} className="cursor-pointer">
                                                                    <Eye className="mr-2 h-4 w-4 text-blue-500" />
                                                                    Voir les écritures
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem asChild>
                                                                <Link href="/dashboard/templates" className="cursor-pointer">
                                                                    <ArrowUpRight className="mr-2 h-4 w-4 text-emerald-500" />
                                                                    Générer Liasse Fiscale
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                        </>
                                                    )}
                                                    <DropdownMenuItem onClick={() => handleDownload(doc.id, doc.filename)} className="cursor-pointer">
                                                        <Download className="mr-2 h-4 w-4 text-slate-500" />
                                                        Télécharger l'original
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Supprimer le document
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
