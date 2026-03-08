export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erreur API (${res.status})`);
    }

    return res.json();
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

    const res = await fetch(`${API_BASE_URL}/accounting/import-balance/${companyId}`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Échec de l'import");
    }

    return res.json();
}
