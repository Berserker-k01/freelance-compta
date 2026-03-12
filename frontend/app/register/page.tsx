"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Lock, Mail, ShieldCheck, Zap, User } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import Link from "next/link";

export default function UserRegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/users/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    full_name: fullName,
                }),
            });

            if (res.ok) {
                // Connecter l'utilisateur dans la foulée
                const formData = new URLSearchParams();
                formData.append("username", email);
                formData.append("password", password);

                const loginRes = await fetch(`${API_BASE_URL}/auth/token`, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: formData.toString(),
                });

                if (loginRes.ok) {
                    const data = await loginRes.json();
                    localStorage.setItem("access_token", data.access_token);
                    router.push("/dashboard/subscription");
                } else {
                    router.push("/login");
                }
            } else {
                const err = await res.json();
                setError(err.detail || "Erreur lors de la création du compte.");
            }
        } catch (err) {
            setError("Erreur de connexion au serveur.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0b101e] flex flex-col items-center justify-center relative overflow-hidden text-slate-200">
            {/* Background effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute w-[800px] h-[800px] rounded-full bg-blue-600/10 blur-[100px] -top-[400px] -left-[200px]"></div>
                <div className="absolute w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[100px] bottom-[100px] -right-[200px]"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>
            </div>

            <div className="z-10 w-full max-w-md px-6">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4 shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                        <Zap className="h-8 w-8 text-blue-500" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                        Auditia Espace Client
                    </h1>
                    <p className="text-slate-400 mt-2">Créez votre compte pour commencer.</p>
                </div>

                <Card className="bg-[#151c2c]/80 backdrop-blur-xl border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <CardHeader>
                        <CardTitle className="text-xl text-white">Inscription</CardTitle>
                        <CardDescription className="text-slate-400">Rejoignez-nous en quelques secondes.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleRegister}>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm text-center">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2 relative">
                                <Label htmlFor="fullname" className="text-slate-300">Nom complet</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="fullname"
                                        type="text"
                                        placeholder="Jean Dubois"
                                        className="pl-9 bg-slate-900 border-slate-700 text-slate-200 focus-visible:ring-blue-500 placeholder:text-slate-600"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 relative">
                                <Label htmlFor="email" className="text-slate-300">Email professionnel</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="vous@entreprise.com"
                                        className="pl-9 bg-slate-900 border-slate-700 text-slate-200 focus-visible:ring-blue-500 placeholder:text-slate-600"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 relative">
                                <Label htmlFor="password" className="text-slate-300">Mot de passe</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-9 bg-slate-900 border-slate-700 text-slate-200 focus-visible:ring-blue-500 placeholder:text-slate-600"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4">
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 transition-all duration-200"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Créer le compte"}
                            </Button>

                            <div className="text-center text-sm text-slate-400 mt-2">
                                Vous avez déjà un compte ? <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium hover:underline">Connectez-vous</Link>
                            </div>
                        </CardFooter>
                    </form>
                </Card>
            </div>

        </div>
    );
}
