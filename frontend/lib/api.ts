export const API_BASE_URL = "http://localhost:8000";

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
        throw new Error(errorData.detail || "An error occurred");
    }

    return res.json();
}

export interface Account {
    id: number;
    code: string;
    name: string;
    class_code: number;
    is_active: boolean;
    company_id: number;
}

export async function getAccounts(companyId: number): Promise<Account[]> {
    // Hardcoded companyId for prototype phase if needed, but endpoint expects it
    return fetchAPI(`/accounting/accounts/${companyId}`);
}

export async function seedAccounts(companyId: number) {
    return fetchAPI(`/accounting/accounts/seed/${companyId}`, {
        method: "POST",
    });
}

export async function importBalance(companyId: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/accounting/import-balance/${companyId}`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Upload failed");
    }

    return res.json();
}
