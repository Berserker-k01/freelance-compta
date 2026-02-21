import { API_BASE_URL, fetchAPI } from "./api";

export interface Template {
    id: number;
    name: string;
    year: string;
    file_path?: string;
    mapping_config?: string; // JSON string
    created_at?: string;
}

export interface PrerequisiteCheck {
    name: string;
    status: "OK" | "WARNING" | "KO";
    detail: string;
}

export interface ValidationResult {
    ready: boolean;
    blockers: string[];
    warnings: string[];
    checks: PrerequisiteCheck[];
}

/** Validate all prerequisites before generating the liasse */
export async function validatePrerequisites(
    companyId: number,
    documentId?: number
): Promise<ValidationResult> {
    const url = `/templates/validate/${companyId}${documentId ? `?document_id=${documentId}` : ""}`;
    return fetchAPI(url);
}

/** Download the full OTR Liasse Fiscale as an Excel file */
export async function generateLiasse(companyId: number, filename: string = "liasse_fiscale.xlsx", documentId?: number): Promise<void> {
    const url = `${API_BASE_URL}/templates/generate/${companyId}${documentId ? `?document_id=${documentId}` : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Erreur lors de la génération de la liasse");
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

/** Download the SMT (Système Minimal de Trésorerie) report */
export async function generateSMT(companyId: number, filename: string = "liasse_smt.xlsx", documentId?: number): Promise<void> {
    const url = `${API_BASE_URL}/templates/generate-smt/${companyId}${documentId ? `?document_id=${documentId}` : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Erreur lors de la génération du SMT");
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

/** Fetch all report templates from backend */
export async function getTemplates(): Promise<Template[]> {
    return fetchAPI("/templates/list");
}

/** Fetch a single template by ID */
export async function getTemplate(id: number): Promise<Template | null> {
    try {
        return await fetchAPI(`/templates/${id}`);
    } catch {
        return null;
    }
}

/** Save / update a template's mapping config */
export async function updateTemplateMapping(id: number, mapping: string): Promise<void> {
    return fetchAPI(`/templates/${id}/mapping`, {
        method: "PUT",
        body: JSON.stringify({ mapping_config: mapping }),
    });
}
