"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, FileText, Settings, ShieldCheck, FileSpreadsheet, Building2, ChevronDown, PlusCircle } from "lucide-react";
import { CompanyProvider, useCompany } from "@/components/company-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

function SidebarContent() {
    const pathname = usePathname();
    const { companies, activeCompany, setActiveCompany } = useCompany();
    const [open, setOpen] = useState(false);

    const navItems = [
        { name: "Vue d'ensemble", href: "/dashboard", icon: LayoutDashboard },
        { name: "Journal", href: "/dashboard/journal", icon: FileText },
        { name: "Comptes", href: "/dashboard/accounts", icon: BookOpen },
        { name: "Modèles (Liasses)", href: "/dashboard/templates", icon: FileSpreadsheet },
        { name: "Audit & IA", href: "/dashboard/audit", icon: ShieldCheck },
        { name: "Mes Clients", href: "/dashboard/companies", icon: Building2 },
    ];

    return (
        <aside className="w-64 bg-white border-r shadow-sm flex-shrink-0 hidden md:flex flex-col h-screen">
            <div className="p-6 border-b">
                <h1 className="text-2xl font-bold text-blue-900 mb-4">Auditia</h1>

                {/* COMPANY SWITCHER */}
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between"
                        >
                            {activeCompany ? (
                                <span className="truncate font-bold">{activeCompany.name}</span>
                            ) : (
                                "Sélectionnez un dossier..."
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                        <Command>
                            <CommandInput placeholder="Rechercher un dossier..." />
                            <CommandList>
                                <CommandEmpty>Aucun dossier trouvé.</CommandEmpty>
                                <CommandGroup heading="Dossiers">
                                    {companies.map((company) => (
                                        <CommandItem
                                            key={company.id}
                                            value={company.name}
                                            onSelect={() => {
                                                setActiveCompany(company);
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    activeCompany?.id === company.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {company.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <div className="p-2 border-t">
                                    <Link href="/dashboard/companies">
                                        <Button size="sm" variant="ghost" className="w-full justify-start text-blue-600">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Nouveau Dossier
                                        </Button>
                                    </Link>
                                </div>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

            </div>

            <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                {activeCompany ? (
                    navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        // Special case for "Mes Clients" which is always available

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })
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
