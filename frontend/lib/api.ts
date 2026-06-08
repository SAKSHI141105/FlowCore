import { useAuthStore } from "./store";

const BASE_URL = "http://localhost:8000/api";

async function request(endpoint: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Network request failed");
  }

  return data;
}

export const api = {
  get: (endpoint: string) => request(endpoint, { method: "GET" }),
  post: (endpoint: string, body: any) => request(endpoint, { method: "POST", body: jsonStringify(body) }),
  delete: (endpoint: string) => request(endpoint, { method: "DELETE" }),
};

function jsonStringify(val: any): string {
  try {
    return JSON.stringify(val);
  } catch (err) {
    return "{}";
  }
}
