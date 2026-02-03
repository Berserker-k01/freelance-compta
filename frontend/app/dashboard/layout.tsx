"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, FileText, Settings, ShieldCheck, FileSpreadsheet } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        { name: "Vue d'ensemble", href: "/dashboard", icon: LayoutDashboard },
        { name: "Journal", href: "/dashboard/journal", icon: FileText },
        { name: "Comptes", href: "/dashboard/accounts", icon: BookOpen },
        { name: "Modèles (Liasses)", href: "/dashboard/templates", icon: FileSpreadsheet },
        { name: "Audit & IA", href: "/dashboard/audit", icon: ShieldCheck },
        { name: "Coffre-fort", href: "/dashboard/safe", icon: Settings }, // Assuming Safe is settings for now or dedicated
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r shadow-sm flex-shrink-0 hidden md:block">
                <div className="p-6 border-b">
                    <h1 className="text-2xl font-bold text-blue-900">Auditia</h1>
                    <p className="text-xs text-gray-500">Comptabilité & Liasse</p>
                </div>
                <nav className="p-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
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
                    })}
                </nav>

                <div className="p-4 mt-auto border-t">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-xs font-semibold text-blue-800">Besoin d'aide ?</p>
                        <p className="text-xs text-blue-600 mt-1">Contactez le support Auditia.</p>
                    </div>
                </div>
            </aside>

            {/* Mobile Header (Visible only on small screens) */}
            <div className="md:hidden fixed top-0 w-full z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
                <span className="font-bold text-lg">Auditia</span>
                {/* Mobile menu button could go here */}
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
                {children}
            </main>
        </div>
    );
}
