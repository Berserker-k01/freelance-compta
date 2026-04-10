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

function getAuthHeaders(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("access_token") || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Validate all prerequisites before generating the liasse */
export async function validatePrerequisites(
    companyId: string,
    documentId?: string,
    documentIdN1?: string
): Promise<ValidationResult> {
    const params = new URLSearchParams();
    if (documentId) params.append("document_id", documentId);
    if (documentIdN1) params.append("document_id_n1", documentIdN1);
    const qs = params.toString();
    const url = `/templates/validate/${companyId}${qs ? `?${qs}` : ""}`;
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
export async function generateLiasse(
    companyId: string,
    filename: string = "liasse_fiscale.xlsx",
    documentId?: string,
    templateId?: string,
    documentIdN1?: string
): Promise<void> {
    const params = new URLSearchParams();
    if (documentId) params.append("document_id", documentId.toString());
    if (documentIdN1) params.append("document_id_n1", documentIdN1.toString());
    if (templateId) params.append("template_id", templateId.toString());
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const url = `${API_BASE_URL}/templates/generate/${companyId}${queryString}`;
    const response = await fetch(url, {
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        let errorMsg = "Erreur lors de la génération de la liasse";
        if (err.detail) {
            errorMsg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
        }
        throw new Error(errorMsg);
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const isExcelContent =
        contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") ||
        contentType.includes("application/vnd.ms-excel.sheet.macroenabled.12") ||
        contentType.includes("application/octet-stream");

    const blob = await response.blob();

    // Safety net: avoid downloading an HTML/JSON error payload as ".xlsx"
    if (!isExcelContent) {
        const textPayload = await blob.text().catch(() => "");
        let detail = textPayload || "Le serveur n'a pas renvoyé un fichier Excel valide.";
        try {
            const parsed = JSON.parse(textPayload);
            if (parsed?.detail) {
                detail = typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail);
            }
        } catch {
            // keep raw payload
        }
        throw new Error(detail);
    }

    // Check ZIP signature for xlsx/xlsm (PK)
    const signature = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
    const isZip = signature.length === 2 && signature[0] === 0x50 && signature[1] === 0x4b;
    if (!isZip) {
        throw new Error("Le fichier généré est invalide (format Excel corrompu).");
    }

    const disposition = response.headers.get("content-disposition") || "";
    const serverFilenameMatch = disposition.match(/filename="?([^"]+)"?/i);
    const effectiveFilename = serverFilenameMatch?.[1] || filename;

    const urlBlob = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlBlob;
    a.download = effectiveFilename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(urlBlob);
    document.body.removeChild(a);
}

/** Upload a dynamic template */
export async function uploadTemplate(
    file: File,
    name: string,
    year: number,
    comparatifNN1: boolean = false
): Promise<Template> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("year", year.toString());
    formData.append("comparatif_n_n1", comparatifNN1 ? "true" : "false");

    // Using fetch directly as this is multipart/form-data
    const response = await fetch(`${API_BASE_URL}/templates/upload`, {
        method: "POST",
        body: formData,
        headers: getAuthHeaders(),
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
