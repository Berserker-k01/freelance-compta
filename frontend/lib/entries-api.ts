import { fetchAPI } from "./api";

export interface EntryLineItem {
    account_id: number;
    debit: number;
    credit: number;
    label?: string;
}

export interface EntryCreate {
    date: string; // ISO
    reference: string;
    label: string;
    journal_id: number;
    lines: EntryLineItem[];
}

export async function createEntry(entry: EntryCreate) {
    return fetchAPI("/accounting/entries/", {
        method: "POST",
        body: JSON.stringify(entry),
    });
}
