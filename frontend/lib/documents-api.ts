import { API_BASE_URL, fetchAPI } from "./api";

export interface Document {
    id: string;
    name: string;
    filename: string;
    file_type: string;
    created_at: string;
    company_id: string;
}

export async function getDocuments(companyId: string): Promise<Document[]> {
    return fetchAPI(`/documents/list/${companyId}`);
}

export async function deleteDocument(id: string): Promise<void> {
    await fetchAPI(`/documents/${id}`, {
        method: "DELETE",
    });
}
