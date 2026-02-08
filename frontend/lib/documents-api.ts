import { API_BASE_URL, fetchAPI } from "./api";

export interface Document {
    id: number;
    name: string;
    filename: string;
    file_type: string;
    created_at: string;
    company_id: number;
}

export async function getDocuments(companyId: number): Promise<Document[]> {
    return fetchAPI(`/documents/list/${companyId}`);
}

export async function deleteDocument(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        throw new Error("Failed to delete document");
    }
}
