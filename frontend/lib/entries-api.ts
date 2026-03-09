import { fetchAPI } from "./api";

export interface EntryLineItem {
    account_id: string;
    debit: number;
    credit: number;
    label?: string;
}

export interface EntryCreate {
    date: string; // ISO
    reference: string;
    label: string;
    journal_id: string;
    company_id?: string; // Optional, used by backend to validate context
    lines: EntryLineItem[];
}

export async function createEntry(entry: EntryCreate) {
    return fetchAPI("/accounting/entries/", {
        method: "POST",
        body: JSON.stringify(entry),
    });
}

export async function getEntries(companyId: string, documentId?: string | null) {
    const url = `/accounting/entries/?company_id=${companyId}&limit=100`;
    if (documentId) {
        // Backend currently ignores this unless updated, but let's pass it
        // url += `&document_id=${documentId}`; 
    }
    return fetchAPI(url);
}
