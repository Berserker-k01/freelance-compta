import { API_BASE_URL } from "./api";

export interface Template {
    id: number;
    name: string;
    year: string;
    mapping_config?: string; // JSON string
}

export async function generateLiasse(companyId: number, filename: string = "liasse_fiscale.xlsx", documentId?: number): Promise<void> {
    const url = `${API_BASE_URL}/templates/generate/${companyId}${documentId ? `?document_id=${documentId}` : ""}`;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Erreur lors de la génération de la liasse");
    }

    const blob = await response.blob();
    const urlBlob = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlBlob;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(urlBlob);
    document.body.removeChild(a);
}

export async function generateSMT(companyId: number, filename: string = "liasse_smt.xlsx", documentId?: number): Promise<void> {
    const url = `${API_BASE_URL}/templates/generate-smt/${companyId}${documentId ? `?document_id=${documentId}` : ""}`;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Erreur lors de la génération du SMT");
    }

    const blob = await response.blob();
    const urlBlob = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlBlob;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(urlBlob);
    document.body.removeChild(a);
}

export async function getTemplate(id: number): Promise<Template | null> {
    if (id === 1) {
        return {
            id: 1,
            name: "Liasse Fiscale SYSCOHADA (Officiel)",
            year: "2025",
            mapping_config: "{}"
        };
    }
    return null;
}

export async function updateTemplateMapping(id: number, mapping: string): Promise<void> {
    return Promise.resolve();
}
