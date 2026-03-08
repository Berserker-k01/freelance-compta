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
        <div className="container mx-auto p-6 max-w-7xl animate-in fade-in">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="pl-0 mb-4 text-muted-foreground group hover:bg-transparent hover:underline">
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Retour
                        </Button>
                    </Link>
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl rounded-full opacity-50"></div>
                        <h1 className="relative text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Journal des Saisies</h1>
                        <p className="relative text-slate-500 mt-2 text-lg">
                            {documentIdFilter ? "Modification du fichier importé" : "Gestion des écritures comptables"} - <strong className="text-slate-700">{activeCompany.name}</strong>
                        </p>
                    </div>
                </div>
                {documentIdFilter && (
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-200 flex items-center gap-2 font-medium shadow-sm">
                        <FileSpreadsheet className="h-4 w-4" />
                        Mode Fichier lié (ID: {documentIdFilter})
                    </div>
                )}
            </div>

            <Tabs defaultValue={documentIdFilter ? "grid" : "form"} className="space-y-6">
                <TabsList className="bg-slate-100 p-1 border">
                    <TabsTrigger value="form" className="flex items-center gap-2"><Plus className="h-4 w-4" /> Saisie Manuelle</TabsTrigger>
                    <TabsTrigger value="grid" className="flex items-center gap-2"><ListFilter className="h-4 w-4" /> Grand Livre / Historique</TabsTrigger>
                </TabsList>

                {/* --- TAB 1: SAISIE MANUELLE --- */}
                <TabsContent value="form">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/* ... Header Card ... */}
                            <Card className="border-0 ring-1 ring-slate-200 shadow-sm bg-white">
                                <CardHeader className="py-3 border-b bg-slate-50/50"><CardTitle className="text-base text-slate-800">En-tête de pièce</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 pb-4">
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-slate-600">Date</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal border-slate-300", !field.value && "text-muted-foreground")}>
                                                                {field.value ? format(field.value, "PPP") : <span>Choisir une date</span>}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date: Date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="reference"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-600">Référence Pièce</FormLabel>
                                                <FormControl><Input placeholder="ex: OD-2026-001" className="border-slate-300" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="label"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-600">Libellé Général</FormLabel>
                                                <FormControl><Input placeholder="ex: Régularisation TVA" className="border-slate-300" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {/* ... Lines Card ... */}
                            <Card className="border-0 ring-1 ring-slate-200 shadow-md bg-white">
                                <CardHeader className="flex flex-row items-center justify-between py-4 border-b bg-slate-50/50">
                                    <CardTitle className="text-base text-slate-800">Lignes d'écriture</CardTitle>
                                    <Button type="button" variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => append({ account_id: 0, debit: 0, credit: 0, label: "" } as any)}>
                                        <Plus className="mr-2 h-4 w-4" /> Ajouter une ligne
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-slate-50/80">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-[300px] font-semibold text-slate-600 pl-6">Compte</TableHead>
                                                <TableHead className="font-semibold text-slate-600">Libellé (Optionnel)</TableHead>
                                                <TableHead className="w-[150px] font-semibold text-slate-600 text-right">Débit</TableHead>
                                                <TableHead className="w-[150px] font-semibold text-slate-600 text-right">Crédit</TableHead>
                                                <TableHead className="w-[60px] pr-6"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.map((field, index) => (
                                                <TableRow key={field.id} className="hover:bg-transparent">
                                                    <TableCell className="pl-6">
                                                        <FormField
                                                            control={form.control}
                                                            name={`lines.${index}.account_id`}
                                                            render={({ field }) => (
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger className="border-slate-300 focus:ring-blue-500">
                                                                            <SelectValue placeholder="Compte" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {accounts.map(acc => (
                                                                            <SelectItem key={acc.id} value={acc.id}>
                                                                                {acc.code} - <span className="text-muted-foreground">{acc.name}</span>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormField
                                                            control={form.control}
                                                            name={`lines.${index}.label`}
                                                            render={({ field }) => (
                                                                <Input {...field} placeholder="Libellé ligne" className="border-slate-300" />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormField
                                                            control={form.control}
                                                            name={`lines.${index}.debit`}
                                                            render={({ field }) => (
                                                                <Input type="number" step="0.01" {...field} className="border-slate-300 text-right font-medium text-emerald-700 focus-visible:ring-emerald-500" />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormField
                                                            control={form.control}
                                                            name={`lines.${index}.credit`}
                                                            render={({ field }) => (
                                                                <Input type="number" step="0.01" {...field} className="border-slate-300 text-right font-medium text-orange-700 focus-visible:ring-orange-500" />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="pr-6 text-right">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="hover:bg-red-50 hover:text-red-700">
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* ... Footer ... */}
                            <div className="flex justify-end gap-8 items-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <div className="text-right">
                                    <div className="text-sm text-muted-foreground">Total Débit</div>
                                    <div className="text-xl font-bold">{totalDebit.toFixed(2)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-muted-foreground">Total Crédit</div>
                                    <div className={cn("text-xl font-bold", !isBalanced ? "text-red-500" : "")}>{totalCredit.toFixed(2)}</div>
                                </div>
                                <Button type="submit" size="lg" disabled={!isBalanced} className={cn("ml-4", !isBalanced ? "opacity-50" : "bg-green-600 hover:bg-green-700")}>
                                    <Save className="mr-2 h-5 w-5" /> Enregistrer
                                </Button>
                            </div>
                            {!isBalanced && <p className="text-red-500 text-right font-medium">L'écriture n'est pas équilibrée (Écart: {(totalDebit - totalCredit).toFixed(2)})</p>}
                            {success && <p className="text-green-600 text-right font-bold text-lg animate-pulse">{success}</p>}
                        </form>
                    </Form>
                </TabsContent>

                {/* --- TAB 2: GRAND LIVRE (GRID) --- */}
                <TabsContent value="grid">
                    <Card className="border-0 ring-1 ring-slate-200 shadow-lg bg-white overflow-hidden">
                        <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between py-4">
                            <CardTitle className="text-slate-800">Grand Livre des Écritures</CardTitle>
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                    onClick={handleRepairEncoding}
                                    disabled={repairing}
                                    title="Corriger les accents (é, à, è...) si l'import initial était mal encodé"
                                >
                                    {repairing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                                    Réparer les accents (é/à)
                                </Button>
                                <Badge variant="outline" className="text-slate-500 font-normal">
                                    {entries.reduce((acc, e) => acc + e.lines.length, 0)} Ligne(s) trouvée(s)
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[60vh] overflow-auto">
                            {loadingEntries ? (
                                <div className="p-8 text-center text-slate-500">Chargement des écritures...</div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-50/80 sticky top-0 z-10 shadow-sm">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="font-semibold text-slate-600 pl-6 w-[120px]">Date</TableHead>
                                            <TableHead className="font-semibold text-slate-600 w-[100px]">Journal</TableHead>
                                            <TableHead className="font-semibold text-slate-600 w-[120px]">Réf</TableHead>
                                            <TableHead className="font-semibold text-slate-600 min-w-[200px]">Compte</TableHead>
                                            <TableHead className="font-semibold text-slate-600 min-w-[250px]">Libellé</TableHead>
                                            <TableHead className="font-semibold text-slate-600 w-[100px]">Liaison</TableHead>
                                            <TableHead className="text-right font-semibold text-slate-600 w-[150px]">Débit</TableHead>
                                            <TableHead className="text-right font-semibold text-slate-600 pr-6 w-[150px]">Crédit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {entries.length === 0 && (
                                            <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-500">Aucune écriture trouvée.</TableCell></TableRow>
                                        )}
                                        {entries.map((entry) => (
                                            entry.lines.map((line, idx) => {
                                                const assignedAcc = accounts.find(a => a.id === line.account_id);
                                                const accountDisplay = assignedAcc ? `${assignedAcc.code} - ${assignedAcc.name}` : "Compte inconnu";

                                                return (
                                                    <TableRow key={`${entry.id}-${idx}`} className="hover:bg-blue-50/50 transition-colors even:bg-slate-50/50 group border-b border-slate-100">
                                                        <TableCell className="text-slate-600 pl-6 text-sm">{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                                                        <TableCell className="font-medium text-slate-700 text-sm">OD</TableCell>
                                                        <TableCell className="text-slate-500 font-mono text-xs truncate" title={entry.reference}>{entry.reference}</TableCell>
                                                        <TableCell className="font-semibold text-indigo-700 text-xs truncate max-w-[200px]" title={accountDisplay}>{accountDisplay}</TableCell>
                                                        <TableCell className="text-slate-700 truncate max-w-[250px] text-sm" title={line.label || entry.label}>{line.label || entry.label}</TableCell>
                                                        <TableCell>{entry.document_id ? <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 font-normal px-1 py-0 text-[10px]">Doc Lié</Badge> : "-"}</TableCell>
                                                        <TableCell className="text-right font-semibold text-emerald-600 text-sm">{line.debit > 0 ? line.debit.toFixed(2) : ""}</TableCell>
                                                        <TableCell className="text-right font-semibold text-orange-600 pr-6 text-sm">{line.credit > 0 ? line.credit.toFixed(2) : ""}</TableCell>
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
