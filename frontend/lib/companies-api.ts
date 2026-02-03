import { fetchAPI } from "./api";

export interface Company {
    id: number;
    name: string;
    tax_id: string;
    address?: string;
    city?: string;
    email?: string;
    phone?: string;
    status?: "active" | "closed" | "archived";
    created_at: string;
}

export async function getCompanies(): Promise<Company[]> {
    return fetchAPI("/companies/");
}

export async function createCompany(data: Partial<Company>): Promise<Company> {
    const res = await fetch("http://localhost:8000/companies/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Creation failed");
    }
    return res.json();
}

export async function deleteCompany(id: number) {
    return fetchAPI(`/companies/${id}`, { method: "DELETE" });
}
