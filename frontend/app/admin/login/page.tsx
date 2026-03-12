"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { login, saveToken } from "@/lib/auth";
import { ShieldAlert, Fingerprint } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(4),
});

export default function AdminLoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            const data = await login(values.email, values.password);
            saveToken(data.access_token);
            // Redirige vers le dashboard admin SaaS
            router.push("/admin/saas");
        } catch (err) {
            setError("Accès refusé. Privilèges insuffisants.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="relative flex items-center justify-center min-h-screen bg-[#070b14] selection:bg-orange-500/30 overflow-hidden">
            {/* Background effects strict & admin */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-600/10 rounded-full blur-[150px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-red-600/5 rounded-full blur-[150px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>

            <Card className="relative z-10 w-[420px] border border-orange-500/20 shadow-[0_0_50px_rgba(249,115,22,0.1)] rounded-2xl bg-[#111827]/90 backdrop-blur-xl">
                <CardHeader className="pt-8 pb-6 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/30 mb-4 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                        <ShieldAlert className="w-8 h-8 text-orange-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-white">
                        Portail Administrateur
                    </CardTitle>
                    <CardDescription className="text-center text-slate-400 text-sm mt-2">
                        Accès réservé - Console SaaS
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                placeholder="admin@auditia.com"
                                                className="bg-[#1f2937]/50 border-slate-700 text-slate-200 focus-visible:ring-orange-500 h-12 text-center"
                                                {...field}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                className="bg-[#1f2937]/50 border-slate-700 text-slate-200 focus-visible:ring-orange-500 h-12 text-center"
                                                {...field}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            {error && <p className="text-sm font-medium text-orange-400 bg-orange-950/30 border border-orange-900/50 p-3 rounded-md text-center">{error}</p>}
                            <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_20px_rgba(234,88,12,0.4)] transition-all">
                                {loading ? "Vérification..." : "Accès Sécurisé"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-slate-800 pt-4 pb-6">
                    <Link href="/login" className="text-sm text-slate-500 hover:text-orange-400 transition-colors flex items-center gap-2">
                        <Fingerprint className="w-4 h-4" />
                        Retour à l'Espace Client
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
