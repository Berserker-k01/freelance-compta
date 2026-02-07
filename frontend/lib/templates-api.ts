import { API_BASE_URL } from "./api";

export interface Template {
    id: number;
    name: string;
    year: string;
    mapping_config?: string; // JSON string
}

export async function generateLiasse(companyId: number, filename: string = "liasse_fiscale.xlsx"): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/templates/generate/${companyId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Erreur lors de la génération de la liasse");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

export async function generateSMT(companyId: number, filename: string = "liasse_smt.xlsx"): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/templates/generate-smt/${companyId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Erreur lors de la génération du SMT");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
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
