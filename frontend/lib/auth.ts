import { fetchAPI, API_BASE_URL } from "./api";

export async function login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${API_BASE_URL}/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
    });

    if (!res.ok) {
        throw new Error("Login failed");
    }

    const data = await res.json();
    return data;
}

export function saveToken(token: string) {
    if (typeof window !== "undefined") {
        localStorage.setItem("token", token);
    }
}

export function getToken() {
    if (typeof window !== "undefined") {
        return localStorage.getItem("token");
    }
    return null;
}

export function logout() {
    if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
    }
}
