import { fetchAPI } from "./api";

export interface Template {
    id: number;
    name: string;
    description: string;
    country: string;
    year: number;
    created_at: string;
}

export async function getTemplates() {
    return fetchAPI("/templates/"); // Assuming the backend endpoint is /templates/
}

export async function uploadTemplate(formData: FormData) {
    // We cannot use fetchAPI wrapper because it adds Content-Type: application/json
    // and UploadFile requires multipart/form-data (let browser handle boundary)

    // We recreate manual logic slightly, or improve fetchAPI. 
    // For simplicity, raw fetch here.
    const res = await fetch("http://localhost:8000/templates/", {
        method: "POST",
        body: formData, // No Content-Type header manually!
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Upload failed");
    }
    return res.json();
}

export async function deleteTemplate(id: number) {
    return fetchAPI(`/templates/${id}`, {
        method: "DELETE"
    });
}

export async function generateReportFromTemplate(templateId: number, companyId: number) {
    // This returns a blob (File download)
    const res = await fetch(`http://localhost:8000/reports/generate/${templateId}/${companyId}`, {
        method: "POST"
    });

    if (!res.ok) {
        throw new Error("Generation failed");
    }
    return res.blob();
}

export async function getTemplate(id: number) {
    const templates = await getTemplates(); // In real app, fetching single would be better
    return templates.find((t: Template) => t.id === id);
}

export async function updateTemplateMapping(id: number, mappingConfig: string) {
    const formData = new FormData();
    formData.append("mapping_config", mappingConfig);

    const res = await fetch(`http://localhost:8000/templates/${id}`, {
        method: "PATCH",
        body: formData,
    });

    if (!res.ok) {
        throw new Error("Update failed");
    }
    return res.json();
}
