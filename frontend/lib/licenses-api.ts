import { API_BASE_URL, fetchAPI } from "./api";

export interface LicenseActivation {
    id: number;
    machine_id: string;
    machine_name?: string;
    ip_address?: string;
    activated_at: string;
}

export interface License {
    id: number;
    key: string;
    client_name: string;
    max_workstations: number;
    expiration_date: string;
    is_active: boolean;
    created_at: string;
    activations: LicenseActivation[];
}

export async function checkLicense(key: string, machineId: string): Promise<{ status: string; days_remaining: number }> {
    return fetchAPI(`/licenses/check/${key}?machine_id=${machineId}`);
}

export async function getLicenseInfo(key: string): Promise<License> {
    return fetchAPI(`/licenses/info/${key}`);
}

export async function activateLicense(key: string, machineId: string, machineName?: string): Promise<LicenseActivation> {
    const res = await fetch(`${API_BASE_URL}/licenses/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, machine_id: machineId, machine_name: machineName }),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Activation failed");
    }
    return res.json();
}

export async function revokeActivation(activationId: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/licenses/revoke/${activationId}`, {
        method: "DELETE",
    });

    if (!res.ok) {
        throw new Error("Failed to revoke activation");
    }
}
