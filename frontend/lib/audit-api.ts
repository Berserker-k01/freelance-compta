import { fetchAPI } from "./api";

export interface Anomaly {
    entry_id: number;
    date: string;
    type: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    description: string;
}

export interface AuditCheck {
    name: string;
    status: "OK" | "WARNING" | "KO";
    message: string;
}

export interface AuditResult {
    status: "GREEN" | "ORANGE" | "RED";
    score: number;
    checks: AuditCheck[];
    anomalies: Anomaly[];
}

export async function runAudit(companyId: number): Promise<AuditResult> {
    return fetchAPI(`/audit/analyze/${companyId}`);
}
