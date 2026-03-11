import { API_BASE_URL, fetchAPI } from "./api";

export interface Template {
    id: string;
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

export interface PreflightResult {
    total_debit: number;
    total_credit: number;
    difference: number;
    is_balanced: boolean;
    compte_13_present: boolean;
    resultat_net_13: number;
    nb_comptes: number;
}

/** Validate all prerequisites before generating the liasse */
export async function validatePrerequisites(
    companyId: string,
    documentId?: string
): Promise<ValidationResult> {
    const url = `/templates/validate/${companyId}${documentId ? `?document_id=${documentId}` : ""}`;
    return fetchAPI(url);
}

/** Pre-flight check before generating */
export async function getPreflightCheck(
    companyId: string,
    documentId?: string
): Promise<PreflightResult> {
    const url = `/templates/preflight/${companyId}${documentId ? `?document_id=${documentId}` : ""}`;
    return fetchAPI(url);
}

/** Download the full OTR Liasse Fiscale as an Excel file */
export async function generateLiasse(companyId: string, filename: string = "liasse_fiscale.xlsx", documentId?: string, templateId?: string): Promise<void> {
    const params = new URLSearchParams();
    if (documentId) params.append("document_id", documentId.toString());
    if (templateId) params.append("template_id", templateId.toString());
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const url = `${API_BASE_URL}/templates/generate/${companyId}${queryString}`;
    const response = await fetch(url);

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        let errorMsg = "Erreur lors de la génération de la liasse";
        if (err.detail) {
            errorMsg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
        }
        throw new Error(errorMsg);
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

/** Upload a dynamic template */
export async function uploadTemplate(file: File, name: string, year: number): Promise<Template> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("year", year.toString());

    // Using fetch directly as this is multipart/form-data
    const response = await fetch(`${API_BASE_URL}/templates/upload`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Erreur lors de l'upload du modèle");
    }

    const data = await response.json();
    return data.template;
}



/** Fetch all report templates from backend */
export async function getTemplates(): Promise<Template[]> {
    return fetchAPI("/templates/list");
}

/** Fetch a single template by ID */
export async function getTemplate(id: string): Promise<Template | null> {
    try {
        return await fetchAPI(`/templates/${id}`);
    } catch {
        return null;
    }
}

/** Save / update a template's mapping config */
export async function updateTemplateMapping(id: string, mapping: string): Promise<void> {
    return fetchAPI(`/templates/${id}/mapping`, {
        method: "PUT",
        body: JSON.stringify({ mapping_config: mapping }),
    });
}

/** Delete a report template */
export async function deleteTemplate(id: string): Promise<void> {
    return fetchAPI(`/templates/${id}`, {
        method: "DELETE",
    });
}
