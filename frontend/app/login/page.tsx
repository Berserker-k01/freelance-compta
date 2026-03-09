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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login, saveToken } from "@/lib/auth";

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(4),
});

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const data = await login(values.email, values.password);
            saveToken(data.access_token);
            router.push("/dashboard/accounts"); // Redirect to Dashboard
        } catch (err) {
            setError("Email ou mot de passe incorrect.");
        }
    }

    return (
        <div className="relative flex items-center justify-center min-h-screen bg-[#1a2332] selection:bg-purple-500/30 overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            <Card className="relative z-10 w-[400px] border-0 shadow-2xl rounded-2xl bg-[#232d3f]/80 backdrop-blur-xl ring-1 ring-white/10">
                <CardHeader className="pt-8 pb-4">
                    <CardTitle className="text-3xl font-bold tracking-tight text-center text-white">
                        Financial <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Cloud</span>
                    </CardTitle>
                    <CardDescription className="text-center text-slate-400 text-sm mt-2">
                        Connectez-vous à votre espace financier sécurisé
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-300">Email professionnel</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="expert@entreprise.com"
                                                className="bg-slate-950/50 border-slate-700 text-slate-200 focus-visible:ring-emerald-500 h-11"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-slate-300">Mot de passe</FormLabel>
                                            <a href="#" className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline">Mot de passe oublié ?</a>
                                        </div>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="••••••••"
                                                className="bg-slate-950/50 border-slate-700 text-slate-200 focus-visible:ring-emerald-500 h-11"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-red-400" />
                                    </FormItem>
                                )}
                            />
                            {error && <p className="text-sm font-medium text-red-400 bg-red-950/30 border border-red-900/50 p-2.5 rounded-md text-center animate-in fade-in">{error}</p>}
                            <Button type="submit" className="w-full h-11 text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/50 transition-all hover:-translate-y-0.5 mt-2">
                                Se connecter
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
