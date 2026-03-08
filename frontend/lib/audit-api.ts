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

export interface CoherenceCheckValue {
    [key: string]: number;
}

export interface CoherenceCheck {
    name: string;
    status: "OK" | "WARNING" | "KO";
    message: string;
    values: CoherenceCheckValue;
}

export interface CoherenceSummary {
    total: number;
    ok: number;
    warnings: number;
    errors: number;
}

export interface CoherenceResult {
    company_id: string;
    timestamp: string;
    summary: CoherenceSummary;
    checks: CoherenceCheck[];
    warning?: string;
}

export async function runAudit(companyId: string): Promise<AuditResult> {
    return fetchAPI(`/audit/analyze/${companyId}`);
}

export async function runCoherenceChecks(companyId: string): Promise<CoherenceResult> {
    return fetchAPI(`/audit/coherence/${companyId}`);
}
