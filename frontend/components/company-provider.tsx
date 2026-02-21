"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Company, getCompanies } from "@/lib/companies-api";

interface CompanyContextType {
    companies: Company[];
    activeCompany: Company | null;
    setActiveCompany: (c: Company) => void;
    refreshCompanies: () => Promise<void>;
    loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshCompanies = async () => {
        try {
            const data = await getCompanies();
            setCompanies(data);

            // Restore active company from localStorage
            if (data.length > 0) {
                const savedId = localStorage.getItem("auditia_activeCompanyId");
                const found = savedId ? data.find(c => c.id === Number(savedId)) : null;
                // Only auto-select if no active company is set yet
                setActiveCompanyState(prev => {
                    if (prev) return prev; // keep existing selection
                    return found || data[0];
                });
            }
        } catch (e) {
            console.error("Failed to load companies:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshCompanies();
    }, []);

    const handleSetActive = (c: Company) => {
        setActiveCompanyState(c);
        localStorage.setItem("auditia_activeCompanyId", c.id.toString());
    };

    return (
        <CompanyContext.Provider value={{
            companies,
            activeCompany,
            setActiveCompany: handleSetActive,
            refreshCompanies,
            loading
        }}>
            {children}
        </CompanyContext.Provider>
    );
}

export function useCompany() {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error("useCompany must be used within a CompanyProvider");
    }
    return context;
}
