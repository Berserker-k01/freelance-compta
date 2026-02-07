"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, FileText, Settings, ShieldCheck, FileSpreadsheet, Building2, ChevronDown, PlusCircle, Upload, Folder } from "lucide-react";
import { CompanyProvider, useCompany } from "@/components/company-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

function SidebarContent() {
    const pathname = usePathname();
    const { companies, activeCompany, setActiveCompany } = useCompany();
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const navSections = [
        {
            title: "Pilotage",
            items: [
                { name: "Vue d'ensemble", href: "/dashboard", icon: LayoutDashboard },
            ]
        },
        {
            title: "Production",
            items: [
                { name: "Importer Balance", href: "/dashboard/import", icon: Upload }, // Renamed for clarity
                { name: "Journal Saisie", href: "/dashboard/journal", icon: FileText },
            ]
        },
        {
            title: "Gestion",
            items: [
                { name: "Mes Documents", href: "/dashboard/documents", icon: Folder },
                { name: "Plan Comptable", href: "/dashboard/accounts", icon: BookOpen },
            ]
        },
        {
            title: "États & Sorties",
            items: [
                { name: "Liasses Fiscales", href: "/dashboard/templates", icon: FileSpreadsheet },
                { name: "Audit & IA", href: "/dashboard/audit", icon: ShieldCheck },
            ]
        },
        {
            title: "Administration",
            items: [
                { name: "Mes Clients", href: "/dashboard/companies", icon: Building2 },
                { name: "Paramètres", href: "/dashboard/settings", icon: Settings },
            ]
        }
    ];

    return (
        <aside className="w-64 bg-white border-r shadow-sm flex-shrink-0 hidden md:flex flex-col h-screen">
            <div className="p-6 border-b">
                <h1 className="text-2xl font-bold text-blue-900 mb-4 tracking-tight">Auditia</h1>

                {/* COMPANY SWITCHER */}
                {mounted ? (
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between bg-slate-50 border-slate-200 text-slate-900"
                            >
                                {activeCompany ? (
                                    <span className="truncate font-bold">{activeCompany.name}</span>
                                ) : (
                                    "Sélectionnez un dossier..."
                                )}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-2">
                            <div className="flex flex-col gap-2">
                                <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1">
                                    {companies.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">Aucun dossier.</p>}
                                    {companies.map((company) => (
                                        <Button
                                            key={company.id}
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "justify-start font-normal px-2 text-left w-full truncate",
                                                activeCompany?.id === company.id && "bg-blue-50 text-blue-700 font-medium"
                                            )}
                                            onClick={() => {
                                                setActiveCompany(company);
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4 shrink-0",
                                                    activeCompany?.id === company.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className="truncate">{company.name}</span>
                                        </Button>
                                    ))}
                                </div>
                                <div className="border-t pt-2">
                                    <Link href="/dashboard/companies" onClick={() => setOpen(false)}>
                                        <Button size="sm" variant="ghost" className="w-full justify-start text-blue-600 px-2">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Dossier
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                ) : (
                    <Button variant="outline" className="w-full justify-between opacity-50 cursor-not-allowed">
                        Chargement...
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                {activeCompany ? (
                    navSections.map((section, idx) => (
                        <div key={idx}>
                            <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                {section.title}
                            </h3>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center space-x-3 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-blue-50 text-blue-700"
                                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                            )}
                                        >
                                            <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500")} />
                                            <span>{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center p-4 text-gray-500 text-sm">
                        Veuillez sélectionner ou créer un dossier pour accéder au menu.
                        <Link href="/dashboard/companies" className="block mt-4 text-blue-600 underline">Gérer les dossiers</Link>
                    </div>
                )}
            </nav>

            <div className="p-4 mt-auto border-t">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-xs font-semibold text-blue-800">Support Auditia</p>
                    <p className="text-xs text-blue-600 mt-1">contact@auditia.com</p>
                </div>
            </div>
        </aside>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <CompanyProvider>
            <div className="flex h-screen bg-gray-100">
                <SidebarContent />

                {/* Mobile Header (Simplified) */}
                <div className="md:hidden fixed top-0 w-full z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
                    <span className="font-bold text-lg">Auditia</span>
                </div>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
                    {children}
                </main>
            </div>
        </CompanyProvider>
    );
}
