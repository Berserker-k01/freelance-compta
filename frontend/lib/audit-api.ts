import { fetchAPI } from "./api";

export interface Anomaly {
    entry_id: number;
    date: string;
    type: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    description: string;
}

export async function runAudit(companyId: number): Promise<Anomaly[]> {
    return fetchAPI(`/audit/analyze/${companyId}`);
}
