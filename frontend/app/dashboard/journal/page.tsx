"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Save, ArrowLeft, FileSpreadsheet, ListFilter, RefreshCw, Wand2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { createEntry, getEntries } from "@/lib/entries-api";
import { getAccounts, Account, getJournals, Journal, repairEncoding } from "@/lib/api";
import { useCompany } from "@/components/company-provider";

// --- SCHEMA & TYPES ---
const entrySchema = z.object({
    date: z.date(),
    reference: z.string().min(2, "Référence requise"),
    label: z.string().min(2, "Libellé requis"),
    journal_id: z.string().min(1, "Journal requis"),
    lines: z.array(z.object({
        account_id: z.string().min(1, "Compte requis"),
        debit: z.coerce.number().min(0).default(0),
        credit: z.coerce.number().min(0).default(0),
        label: z.string().optional(),
    })).min(2, "Au moins 2 lignes (Débit/Crédit) requises")
        .refine((data) => {
            const totalDebit = data.reduce((acc, curr) => acc + (curr.debit || 0), 0);
            const totalCredit = data.reduce((acc, curr) => acc + (curr.credit || 0), 0);
            return Math.abs(totalDebit - totalCredit) < 0.01;
        }, "L'écriture n'est pas équilibrée (Débit ≠ Crédit)"),
});

type EntryFormValues = z.infer<typeof entrySchema>;

interface EntryLine {
    id?: string;
    account_id: string;
    account_code?: string;
    account_name?: string;
    label: string;
    debit: number;
    credit: number;
}

interface JournalEntry {
    id: string;
    date: string;
    reference: string;
    label: string;
    journal_id: string;
    document_id?: string;
    lines: EntryLine[];
}

export default function JournalPage() {
    const { activeCompany } = useCompany();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [journals, setJournals] = useState<Journal[]>([]);
    const [success, setSuccess] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const documentIdFilter = searchParams.get('documentId');

    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(false);
    const [repairing, setRepairing] = useState(false);

    // Form setup
    const form = useForm<EntryFormValues>({
        resolver: zodResolver(entrySchema) as any,
        defaultValues: {
            date: new Date(),
            reference: "",
            label: "",
            journal_id: "",
            lines: [
                { account_id: "", debit: 0, credit: 0, label: "" },
                { account_id: "", debit: 0, credit: 0, label: "" }
            ]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines"
    });

    const loadAccounts = async () => {
        if (!activeCompany) {
            setAccounts([]);
            return;
        }
        try {
            setAccounts([]);
            const data = await getAccounts(activeCompany.id);
            setAccounts(data);
        } catch (error) {
            console.error("Failed to load accounts", error);
        }
    };

    const loadJournals = async () => {
        if (!activeCompany) {
            setJournals([]);
            return;
        }
        try {
            setJournals([]);
            const data = await getJournals(activeCompany.id);
            setJournals(data);
            // Auto-select first journal (OD)
            if (data.length > 0) {
                form.setValue("journal_id", data[0].id);
            }
        } catch (error) {
            console.error("Failed to load journals", error);
        }
    };

    const loadEntries = async () => {
        if (!activeCompany) {
            setEntries([]);
            return;
        }
        setLoadingEntries(true);
        setEntries([]);
        try {
            // Use centralized API call
            // Ideally backend should support filtering by document_id
            const data = await getEntries(activeCompany.id, documentIdFilter);

            // Client-side filter for MVP if backend doesn't support it yet
            const filtered = documentIdFilter
                ? data.filter((e: any) => e.document_id == documentIdFilter)
                : data;
            setEntries(filtered);
        } catch (error) {
            console.error("Failed to load entries", error);
            // Optional: set error state to show in UI
        } finally {
            setLoadingEntries(false);
        }
    };

    useEffect(() => {
        loadAccounts();
        loadJournals();
        loadEntries();
    }, [activeCompany, documentIdFilter]);

    const totalDebit = form.watch("lines").reduce((acc, curr) => acc + Number(curr.debit || 0), 0);
    const totalCredit = form.watch("lines").reduce((acc, curr) => acc + Number(curr.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    async function onSubmit(data: EntryFormValues) {
        if (!activeCompany) {
            alert("Veuillez sélectionner un dossier.");
            return;
        }

        try {
            await createEntry({
                ...data,
                company_id: activeCompany.id,
                date: data.date.toISOString(),
            });
            setSuccess("Écriture enregistrée avec succès !");
            form.reset({
                date: new Date(),
                reference: "",
                label: "",
                journal_id: journals.length > 0 ? journals[0].id : "",
                lines: [
                    { account_id: "", debit: 0, credit: 0 },
                    { account_id: "", debit: 0, credit: 0 }
                ]
            });
            setTimeout(() => setSuccess(null), 3000);
            loadEntries(); // Refresh list
        } catch (error) {
            alert("Erreur: " + error);
        }
    }

    const handleRepairEncoding = async () => {
        if (!activeCompany) return;
        setRepairing(true);
        try {
            const res = await repairEncoding(activeCompany.id);
            alert(`Réparation terminée !\nComptes réparés: ${res.accounts_repaired}\nLignes réparées: ${res.entry_lines_repaired}`);
            loadAccounts();
            loadEntries();
        } catch (error: any) {
            alert("Erreur: " + (error.message || error));
        } finally {
            setRepairing(false);
        }
    };

    if (!activeCompany) {
        return <div className="p-10">Veuillez sélectionner un dossier.</div>;
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl animate-in fade-in space-y-8">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="pl-0 mb-4 hover:bg-transparent text-slate-400 hover:text-white transition-colors group">
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Retour
                        </Button>
                    </Link>
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl rounded-full opacity-50"></div>
                        <h1 className="relative text-3xl font-bold tracking-tight text-white">Journal des Saisies</h1>
                        <p className="relative text-slate-400 mt-2 text-lg">
                            {documentIdFilter ? "Modification du fichier importé" : "Gestion des écritures comptables"} - <strong className="text-blue-400">{activeCompany.name}</strong>
                        </p>
                    </div>
                </div>
                {documentIdFilter && (
                    <div className="bg-blue-900/20 text-blue-400 px-4 py-2 rounded-xl border border-blue-800/50 flex items-center gap-2 font-medium shadow-sm">
                        <FileSpreadsheet className="h-4 w-4" />
                        Mode Fichier lié (ID: {documentIdFilter})
                    </div>
                )}
            </div>

            <Tabs defaultValue={documentIdFilter ? "grid" : "form"} className="space-y-6">
                <TabsList className="bg-slate-900/60 p-1 border border-slate-700/50 backdrop-blur-xl">
                    <TabsTrigger value="form" className="flex items-center gap-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 hover:text-slate-200"><Plus className="h-4 w-4" /> Saisie Manuelle</TabsTrigger>
                    <TabsTrigger value="grid" className="flex items-center gap-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 hover:text-slate-200"><ListFilter className="h-4 w-4" /> Grand Livre / Historique</TabsTrigger>
                </TabsList>

                {/* --- TAB 1: SAISIE MANUELLE --- */}
                <TabsContent value="form">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* ... Header Card ... */}
                            <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl">
                                <CardHeader className="py-3 border-b border-slate-800/50 bg-slate-900/40"><CardTitle className="text-base text-white">En-tête de pièce</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 pb-6">
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-slate-300">Date</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal bg-slate-950/50 border-slate-700 text-slate-200 hover:bg-slate-900 hover:text-white", !field.value && "text-slate-500")}>
                                                                {field.value ? format(field.value, "PPP") : <span>Choisir une date</span>}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700 text-slate-200" align="start">
                                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date: Date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage className="text-red-400" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="reference"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-300">Référence Pièce</FormLabel>
                                                <FormControl><Input placeholder="ex: OD-2026-001" className="bg-slate-950/50 border-slate-700 text-slate-200 focus-visible:ring-blue-500" {...field} /></FormControl>
                                                <FormMessage className="text-red-400" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="label"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-300">Libellé Général</FormLabel>
                                                <FormControl><Input placeholder="ex: Régularisation TVA" className="bg-slate-950/50 border-slate-700 text-slate-200 focus-visible:ring-blue-500" {...field} /></FormControl>
                                                <FormMessage className="text-red-400" />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {/* ... Lines Card ... */}
                            <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden">
                                <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-slate-800/50 bg-slate-900/40">
                                    <CardTitle className="text-base text-white">Lignes d'écriture</CardTitle>
                                    <Button type="button" variant="outline" size="sm" className="text-blue-400 border-blue-900/50 bg-blue-950/30 hover:bg-blue-900/50 hover:text-blue-300 transition-colors" onClick={() => append({ account_id: 0, debit: 0, credit: 0, label: "" } as any)}>
                                        <Plus className="mr-2 h-4 w-4" /> Ajouter une ligne
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-slate-800/50">
                                            <TableRow className="hover:bg-transparent border-slate-700/50">
                                                <TableHead className="w-[300px] font-semibold text-slate-300 pl-6">Compte</TableHead>
                                                <TableHead className="font-semibold text-slate-300">Libellé (Optionnel)</TableHead>
                                                <TableHead className="w-[150px] font-semibold text-slate-300 text-right">Débit</TableHead>
                                                <TableHead className="w-[150px] font-semibold text-slate-300 text-right">Crédit</TableHead>
                                                <TableHead className="w-[60px] pr-6"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.map((field, index) => (
                                                <TableRow key={field.id} className="hover:bg-slate-800/30 border-slate-700/50 transition-colors">
                                                    <TableCell className="pl-6 py-3">
                                                        <FormField
                                                            control={form.control}
                                                            name={`lines.${index}.account_id`}
                                                            render={({ field }) => (
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger className="bg-slate-950/50 border-slate-700 text-slate-200 focus:ring-blue-500">
                                                                            <SelectValue placeholder="Compte" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 max-h-60">
                                                                        {accounts.map(acc => (
                                                                            <SelectItem key={acc.id} value={acc.id} className="focus:bg-slate-800 focus:text-white">
                                                                                {acc.code} - <span className="text-slate-400">{acc.name}</span>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <FormField
                                                            control={form.control}
                                                            name={`lines.${index}.label`}
                                                            render={({ field }) => (
                                                                <Input {...field} placeholder="Libellé ligne" className="bg-slate-950/50 border-slate-700 text-slate-200 focus-visible:ring-blue-500" />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <FormField
                                                            control={form.control}
                                                            name={`lines.${index}.debit`}
                                                            render={({ field }) => (
                                                                <Input type="number" step="0.01" {...field} className="bg-slate-950/50 border-slate-700 text-right font-medium text-emerald-400 focus-visible:ring-emerald-500" />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <FormField
                                                            control={form.control}
                                                            name={`lines.${index}.credit`}
                                                            render={({ field }) => (
                                                                <Input type="number" step="0.01" {...field} className="bg-slate-950/50 border-slate-700 text-right font-medium text-amber-400 focus-visible:ring-amber-500" />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="pr-6 text-right py-3">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="hover:bg-red-900/30 hover:text-red-400 text-slate-500 transition-colors">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* ... Footer ... */}
                            <div className="flex justify-end gap-8 items-center p-6 bg-slate-900/60 border border-slate-700/50 backdrop-blur-xl rounded-xl shadow-lg">
                                <div className="text-right">
                                    <div className="text-sm text-slate-400">Total Débit</div>
                                    <div className="text-xl font-bold text-emerald-400">{totalDebit.toFixed(2)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-400">Total Crédit</div>
                                    <div className={cn("text-xl font-bold", !isBalanced ? "text-amber-400" : "text-amber-400")}>{totalCredit.toFixed(2)}</div>
                                </div>
                                <Button type="submit" size="lg" disabled={!isBalanced} className={cn("ml-4 shadow-lg transition-transform hover:-translate-y-0.5", !isBalanced ? "opacity-50" : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-500/50")}>
                                    <Save className="mr-2 h-5 w-5" /> Enregistrer
                                </Button>
                            </div>
                            {!isBalanced && <p className="text-red-400 text-right font-medium animate-pulse">L'écriture n'est pas équilibrée (Écart: {Math.abs(totalDebit - totalCredit).toFixed(2)})</p>}
                            {success && <p className="text-emerald-400 text-right font-bold text-lg animate-pulse">{success}</p>}
                        </form>
                    </Form>
                </TabsContent>

                {/* --- TAB 2: GRAND LIVRE (GRID) --- */}
                <TabsContent value="grid">
                    <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CardHeader className="border-b border-slate-800/50 bg-slate-900/40 flex flex-row items-center justify-between py-4">
                            <CardTitle className="text-white">Grand Livre des Écritures</CardTitle>
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-amber-400 border-amber-900/50 bg-amber-950/30 hover:bg-amber-900/50 hover:text-amber-300 transition-colors"
                                    onClick={handleRepairEncoding}
                                    disabled={repairing}
                                    title="Corriger les accents (é, à, è...) si l'import initial était mal encodé"
                                >
                                    {repairing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                                    Réparer les accents (é/à)
                                </Button>
                                <Badge variant="outline" className="bg-slate-800/50 border-slate-700 text-slate-300 font-normal">
                                    {entries.reduce((acc, e) => acc + e.lines.length, 0)} Ligne(s) trouvée(s)
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[60vh] overflow-auto scrollbar-thin scrollbar-thumb-slate-700">
                            {loadingEntries ? (
                                <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                                    <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
                                    <span>Chargement des écritures...</span>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm shadow-sm border-b border-slate-700/50">
                                        <TableRow className="hover:bg-transparent border-slate-700/50">
                                            <TableHead className="font-semibold text-slate-300 pl-6 w-[120px]">Date</TableHead>
                                            <TableHead className="font-semibold text-slate-300 w-[100px]">Journal</TableHead>
                                            <TableHead className="font-semibold text-slate-300 w-[120px]">Réf</TableHead>
                                            <TableHead className="font-semibold text-slate-300 min-w-[200px]">Compte</TableHead>
                                            <TableHead className="font-semibold text-slate-300 min-w-[250px]">Libellé</TableHead>
                                            <TableHead className="font-semibold text-slate-300 w-[100px]">Liaison</TableHead>
                                            <TableHead className="text-right font-semibold text-slate-300 w-[150px]">Débit</TableHead>
                                            <TableHead className="text-right font-semibold text-slate-300 pr-6 w-[150px]">Crédit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {entries.length === 0 && (
                                            <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400">Aucune écriture trouvée.</TableCell></TableRow>
                                        )}
                                        {entries.map((entry) => (
                                            entry.lines.map((line, idx) => {
                                                const assignedAcc = accounts.find(a => a.id === line.account_id);
                                                const accountDisplay = assignedAcc ? `${assignedAcc.code} - ${assignedAcc.name}` : "Compte inconnu";

                                                return (
                                                    <TableRow key={`${entry.id}-${idx}`} className="hover:bg-blue-900/20 transition-colors even:bg-slate-800/30 group border-b border-slate-700/30 text-slate-200">
                                                        <TableCell className="pl-6 text-sm opacity-90">{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                                                        <TableCell className="font-medium text-blue-400 text-sm">OD</TableCell>
                                                        <TableCell className="text-slate-400 font-mono text-xs truncate" title={entry.reference}>{entry.reference}</TableCell>
                                                        <TableCell className="font-semibold text-emerald-400 text-xs truncate max-w-[200px]" title={accountDisplay}>{accountDisplay}</TableCell>
                                                        <TableCell className="text-slate-300 truncate max-w-[250px] text-sm" title={line.label || entry.label}>{line.label || entry.label}</TableCell>
                                                        <TableCell>{entry.document_id ? <Badge className="bg-blue-900/30 text-blue-400 border border-blue-800/50 hover:bg-blue-800/50 font-normal px-1 py-0 text-[10px]">Doc Lié</Badge> : "-"}</TableCell>
                                                        <TableCell className="text-right font-semibold text-emerald-400 text-sm">{line.debit > 0 ? line.debit.toFixed(2) : ""}</TableCell>
                                                        <TableCell className="text-right font-semibold text-amber-400 pr-6 text-sm">{line.credit > 0 ? line.credit.toFixed(2) : ""}</TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
