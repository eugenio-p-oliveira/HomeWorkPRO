const CURRENT_PUBLIC_API_URL =
  "https://home-work-pro--aesirsoftwareho.replit.app";

function normalizeApiUrl(value: string | undefined): string {
  const normalized = value?.trim().replace(/\/+$/, "") ?? "";

  if (
    normalized === "" ||
    normalized === "undefined" ||
    normalized === "null"
  ) {
    return "";
  }

  return normalized.replace(/\/api$/, "");
}

const normalizedConfiguredApiUrl = normalizeApiUrl(
  import.meta.env.VITE_API_URL,
);

/**
 * The Vercel bundle must never call the retired Replit deployment.
 * Keep local development relative, but use the verified public API in
 * production when Vercel still has the old environment variable cached.
 */
export const API_URL =
  import.meta.env.PROD
    ? CURRENT_PUBLIC_API_URL
    : normalizedConfiguredApiUrl;