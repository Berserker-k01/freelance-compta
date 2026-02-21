"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Save, ArrowLeft, FileSpreadsheet, ListFilter } from "lucide-react";
import Link from "next/link";

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
import { getAccounts, Account, getJournals, Journal } from "@/lib/api";
import { useCompany } from "@/components/company-provider";

// --- SCHEMA & TYPES ---
const entrySchema = z.object({
    date: z.date(),
    reference: z.string().min(2, "Référence requise"),
    label: z.string().min(2, "Libellé requis"),
    journal_id: z.coerce.number().min(1, "Journal requis"),
    lines: z.array(z.object({
        account_id: z.coerce.number().min(1, "Compte requis"),
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
    id?: number;
    account_code?: string;
    account_name?: string;
    label: string;
    debit: number;
    credit: number;
}

interface JournalEntry {
    id: number;
    date: string;
    reference: string;
    label: string;
    journal_id: number;
    document_id?: number;
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

    // Form setup
    const form = useForm<EntryFormValues>({
        resolver: zodResolver(entrySchema) as any,
        defaultValues: {
            date: new Date(),
            reference: "",
            label: "",
            journal_id: 1,
            lines: [
                { account_id: 0, debit: 0, credit: 0, label: "" },
                { account_id: 0, debit: 0, credit: 0, label: "" }
            ]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "lines"
    });

    const loadAccounts = async () => {
        if (!activeCompany) return;
        try {
            const data = await getAccounts(activeCompany.id);
            setAccounts(data);
        } catch (error) {
            console.error("Failed to load accounts", error);
        }
    };

    const loadJournals = async () => {
        if (!activeCompany) return;
        try {
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
        if (!activeCompany) return;
        setLoadingEntries(true);
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
                journal_id: 1,
                lines: [
                    { account_id: 0, debit: 0, credit: 0 },
                    { account_id: 0, debit: 0, credit: 0 }
                ]
            });
            setTimeout(() => setSuccess(null), 3000);
            loadEntries(); // Refresh list
        } catch (error) {
            alert("Erreur: " + error);
        }
    }

    if (!activeCompany) {
        return <div className="p-10">Veuillez sélectionner un dossier.</div>;
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl animate-in fade-in">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="pl-0 mb-2 text-muted-foreground">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-blue-900">Journal des Saisies</h1>
                    <p className="text-muted-foreground">
                        {documentIdFilter ? "Modification du fichier importé" : "Gestion des écritures comptables"} - {activeCompany.name}
                    </p>
                </div>
                {documentIdFilter && (
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md border border-blue-200 flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Mode Fichier lié (ID: {documentIdFilter})
                    </div>
                )}
            </div>

            <Tabs defaultValue={documentIdFilter ? "grid" : "form"} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="form" className="flex items-center gap-2"><Plus className="h-4 w-4" /> Saisie Manuelle</TabsTrigger>
                    <TabsTrigger value="grid" className="flex items-center gap-2"><ListFilter className="h-4 w-4" /> Grand Livre / Historique</TabsTrigger>
                </TabsList>

                {/* --- TAB 1: SAISIE MANUELLE --- */}
                <TabsContent value="form">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {/* ... Header Card ... */}
                            <Card>
                                <CardHeader><CardTitle>En-tête de pièce</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Date</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
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
                                                <FormLabel>Référence Pièce</FormLabel>
                                                <FormControl><Input placeholder="ex: OD-2026-001" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="label"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Libellé Général</FormLabel>
                                                <FormControl><Input placeholder="ex: Régularisation TVA" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {/* ... Lines Card ... */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Lignes d'écriture</CardTitle>
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ account_id: 0, debit: 0, credit: 0, label: "" })}>
                                        <Plus className="mr-2 h-4 w-4" /> Ajouter une ligne
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[300px]">Compte</TableHead>
                                                <TableHead>Libellé (Optionnel)</TableHead>
                                                <TableHead className="w-[150px]">Débit</TableHead>
                                                <TableHead className="w-[150px]">Crédit</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.map((field, index) => (
                                                <TableRow key={field.id}>
                                                    <TableCell>
                                                        <FormField
                                                            control={form.control}
                                                            name={`lines.${index}.account_id`}
                                                            render={({ field }) => (
                                                                <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Compte" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {accounts.map(acc => (
                                                                            <SelectItem key={acc.id} value={acc.id.toString()}>
                                                                                {acc.code} - {acc.name}
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
                                                                <Input {...field} placeholder="Libellé ligne" />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormField
                                                            control={form.control}
                                                            name={`lines.${index}.debit`}
                                                            render={({ field }) => (
                                                                <Input type="number" step="0.01" {...field} />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormField
                                                            control={form.control}
                                                            name={`lines.${index}.credit`}
                                                            render={({ field }) => (
                                                                <Input type="number" step="0.01" {...field} />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Grand Livre des Écritures</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingEntries ? (
                                <div>Chargement...</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Journal</TableHead>
                                            <TableHead>Réf</TableHead>
                                            <TableHead>Libellé</TableHead>
                                            <TableHead>Document</TableHead>
                                            <TableHead className="text-right">Débit</TableHead>
                                            <TableHead className="text-right">Crédit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {entries.length === 0 && (
                                            <TableRow><TableCell colSpan={7} className="text-center">Aucune écriture.</TableCell></TableRow>
                                        )}
                                        {entries.map((entry) => (
                                            // Ideally we just show Entry HEADER here, or expand lines?
                                            // Let's list LINES for a Grand Livre view.
                                            // Ah wait, entries endpoint returns Entries with Lines embedded.
                                            // We should flatten or show Entry level.
                                            // Let's show Entry Level and collapsible? Or just flatten.
                                            // Flattening is better for "Excel like" view.
                                            entry.lines.map((line, idx) => {
                                                // Need to account cache to get code/name?
                                                // The API `EntryLine` should probably return account details.
                                                // If not, we might miss them.
                                                // For MVP let's assume filtering.
                                                return (
                                                    <TableRow key={`${entry.id}-${idx}`} className="hover:bg-slate-50 cursor-pointer">
                                                        <TableCell>{format(new Date(entry.date), "dd/MM/yyyy")}</TableCell>
                                                        <TableCell>OD</TableCell>
                                                        <TableCell>{entry.reference}</TableCell>
                                                        <TableCell>{line.label || entry.label}</TableCell>
                                                        <TableCell>{entry.document_id ? <span className="text-blue-600">Lié</span> : "-"}</TableCell>
                                                        <TableCell className="text-right">{line.debit > 0 ? line.debit.toFixed(2) : "-"}</TableCell>
                                                        <TableCell className="text-right">{line.credit > 0 ? line.credit.toFixed(2) : "-"}</TableCell>
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
