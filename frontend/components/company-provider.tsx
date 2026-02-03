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
    const [activeCompany, setActiveCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshCompanies = async () => {
        try {
            const data = await getCompanies();
            setCompanies(data);

            // Auto-select first company if none selected (or if stored in localStorage)
            if (data.length > 0 && !activeCompany) {
                // Try from localStorage ?
                // const savedId = localStorage.getItem("activeCompanyId");
                // const found = data.find(c => c.id === Number(savedId));
                setActiveCompany(data[0]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshCompanies();
    }, []);

    const handleSetActive = (c: Company) => {
        setActiveCompany(c);
        // localStorage.setItem("activeCompanyId", c.id.toString());
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
