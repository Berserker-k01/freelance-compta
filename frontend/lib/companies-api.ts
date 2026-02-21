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
    return fetchAPI("/companies/", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateCompany(id: number, data: Partial<Company>): Promise<Company> {
    return fetchAPI(`/companies/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function deleteCompany(id: number) {
    return fetchAPI(`/companies/${id}`, { method: "DELETE" });
}
