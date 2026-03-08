import { fetchAPI } from "./api";

export interface Company {
    id: string;
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

export async function updateCompany(id: string, data: Partial<Company>): Promise<Company> {
    return fetchAPI(`/companies/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function deleteCompany(id: string) {
    return fetchAPI(`/companies/${id}`, { method: "DELETE" });
}

export async function getCompanyAnnexes(companyId: string): Promise<any> {
    return fetchAPI(`/companies/${companyId}/annexes`);
}

export async function updateCompanyAnnexes(companyId: string, data: any): Promise<any> {
    return fetchAPI(`/companies/${companyId}/annexes`, {
        method: "PUT",
        body: JSON.stringify({ data }),
    });
}
