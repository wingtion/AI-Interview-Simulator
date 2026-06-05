// Central API base URL.
// Override per-environment with VITE_API_URL (see .env.example); falls back to local dev.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
