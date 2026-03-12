"use client";

import { useEffect, useState, useRef } from "react";
import { useCompany } from "@/components/company-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { FileText, Download, Trash2, ArrowLeft, Upload, Plus, FileSpreadsheet, ArrowUpRight, MoreHorizontal, Eye, Loader2 } from "lucide-react";
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
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        window.open(`${API_BASE_URL}/documents/download/${docId}`, "_blank");
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !activeCompany) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("name", file.name);
            formData.append("file_type", "other"); // Define as non-balance generic document

            const res = await fetch(`${API_BASE_URL}/documents/upload/${activeCompany.id}`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                fetchDocuments();
            } else {
                alert("Erreur lors de l'import du document.");
            }
        } catch (error) {
            console.error("Error uploading document:", error);
            alert("Erreur de connexion.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
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
                        <Button variant="ghost" size="sm" className="pl-0 mb-4 hover:bg-transparent hover:underline text-slate-400 hover:text-white group">
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Retour au Dashboard
                        </Button>
                    </Link>
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl rounded-full opacity-50"></div>
                        <h1 className="relative text-3xl font-bold tracking-tight text-white">Espace Documentaire</h1>
                        <p className="relative text-slate-400 mt-2 text-lg">
                            Gérez les fichiers du dossier <strong className="text-white">{activeCompany.name}</strong>.
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {/* Hidden input for generic document upload */}
                    <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />

                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all rounded-xl font-medium px-4 h-11"
                    >
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-400" /> : <Plus className="mr-2 h-4 w-4" />}
                        {uploading ? "Envoi..." : "Nouveau Document"}
                    </Button>

                    <Link href="/dashboard/import">
                        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-blue-500/50 transition-all rounded-xl font-medium px-4 h-11 transform hover:-translate-y-0.5">
                            <Upload className="mr-2 h-4 w-4" /> Importer une Balance
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden text-slate-200">
                <CardHeader className="border-b border-slate-800/50 bg-slate-900/40">
                    <CardTitle className="text-white">Documents Stockés</CardTitle>
                    <CardDescription className="text-slate-400">
                        Historique des imports et fichiers liés.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-900/50 hover:bg-slate-900/50">
                            <TableRow className="border-b border-slate-800">
                                <TableHead className="font-semibold text-slate-400 pl-6 h-12">Nom du Fichier</TableHead>
                                <TableHead className="font-semibold text-slate-400 h-12">Type</TableHead>
                                <TableHead className="font-semibold text-slate-400 h-12">Date d'ajout</TableHead>
                                <TableHead className="text-right font-semibold text-slate-400 pr-6 h-12">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow className="border-b border-slate-800 hover:bg-transparent">
                                    <TableCell colSpan={4} className="text-center py-12 text-slate-400">Chargement des documents...</TableCell>
                                </TableRow>
                            ) : documents.length === 0 ? (
                                <TableRow className="border-b border-slate-800 hover:bg-transparent">
                                    <TableCell colSpan={4} className="text-center py-16 text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <FileText className="h-10 w-10 text-slate-500" />
                                            <p>Aucun document trouvé.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                documents.map((doc) => (
                                    <TableRow key={doc.id} className="hover:bg-slate-800/40 border-b border-slate-800/50 transition-colors group">
                                        <TableCell className="font-medium text-white pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-lg border", doc.file_type === 'balance' ? "bg-emerald-900/40 border-emerald-800/50 text-emerald-400" : "bg-blue-900/40 border-blue-800/50 text-blue-400")}>
                                                    {doc.file_type === 'balance' ? <FileSpreadsheet className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span>{doc.name}</span>
                                                    <span className="text-xs text-slate-400 font-normal">{doc.filename}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", doc.file_type === 'balance' ? "bg-emerald-900/20 text-emerald-400 border-emerald-800/50" : "bg-slate-800/50 text-slate-400 border-slate-700")}>
                                                {doc.file_type === 'balance' ? 'Balance Générale' : 'Autre Document'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-300">
                                            {format(new Date(doc.created_at), "dd/MM/yyyy à HH:mm")}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800/80">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-slate-200 shadow-2xl">
                                                    <DropdownMenuLabel className="text-slate-300">Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator className="bg-slate-800/50" />
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
                                                            <DropdownMenuSeparator className="bg-slate-800/50" />
                                                        </>
                                                    )}
                                                    <DropdownMenuItem onClick={() => handleDownload(doc.id, doc.filename)} className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800">
                                                        <Download className="mr-2 h-4 w-4 text-slate-400" />
                                                        Télécharger l'original
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-500/20 hover:bg-red-500/20 transition-colors">
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
