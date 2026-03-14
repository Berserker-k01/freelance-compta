export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const LOCAL_API_URL = "http://localhost:8001"; // Port de l'EXE local

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    let token = "";
    if (typeof window !== "undefined") {
        token = localStorage.getItem("access_token") || "";
    }

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let url = `${API_BASE_URL}${endpoint}`;
    
    try {
        // Tentative sur l'API principale (Cloud ou Docker port 8000)
        const res = await fetch(url, {
            ...options,
            headers,
        });

        if (!res.ok) {
            // Si c'est une 404/500 mais que le serveur a répondu, on traite l'erreur normalement
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.detail || `Erreur API (${res.status})`);
        }

        return res.json();
    } catch (error: any) {
        // En cas d'échec de connexion (serveur injoignable), on tente le moteur local si on est dans l'EXE
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
            console.warn("Serveur principal injoignable, tentative sur le moteur local...");
            const localRes = await fetch(`${LOCAL_API_URL}${endpoint}`, {
                ...options,
                headers,
            }).catch(() => {
                throw new Error("Impossible de joindre le serveur Cloud ET le moteur Local.");
            });

            if (!localRes.ok) {
                const errorData = await localRes.json().catch(() => ({}));
                throw new Error(errorData.detail || `Erreur Moteur Local (${localRes.status})`);
            }
            return localRes.json();
        }
        throw error;
    }
}

export interface Account {
    id: string;
    code: string;
    name: string;
    class_code: number;
    is_active: boolean;
    company_id: string;
}

export interface Journal {
    id: string;
    code: string;
    name: string;
    company_id: string;
}

export async function getAccounts(companyId: string): Promise<Account[]> {
    return fetchAPI(`/accounting/accounts/${companyId}`);
}

export async function seedAccounts(companyId: string) {
    return fetchAPI(`/accounting/accounts/seed/${companyId}`, {
        method: "POST",
    });
}

export async function getJournals(companyId: string): Promise<Journal[]> {
    return fetchAPI(`/accounting/journals/${companyId}`);
}

export async function importBalance(companyId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    let token = "";
    if (typeof window !== "undefined") {
        token = localStorage.getItem("access_token") || "";
    }

    const headers: Record<string, string> = {};
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Wrap the multipart fetch in a try/catch similar to fetchAPI for hybrid support
    try {
        const res = await fetch(`${API_BASE_URL}/accounting/import-balance/${companyId}`, {
            method: "POST",
            body: formData,
            headers,
        });

        if (!res.ok) throw new Error("Erreur import");
        return res.json();
    } catch (e) {
        const localRes = await fetch(`${LOCAL_API_URL}/accounting/import-balance/${companyId}`, {
            method: "POST",
            body: formData,
            headers,
        });
        if (!localRes.ok) throw new Error("Échec de l'import (Cloud et Local)");
        return localRes.json();
    }
}

export async function repairEncoding(companyId: string) {
    return fetchAPI(`/accounting/repair-encoding/${companyId}`, {
        method: "POST",
    });
}
