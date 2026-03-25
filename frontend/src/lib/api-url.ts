const LOCAL_API_BASE_URL = "http://localhost:8000";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const isLocalHostname = (hostname: string) => LOCAL_HOSTNAMES.has(hostname);

export function getApiBaseUrl(): string {
  const envBaseUrl = stripTrailingSlash(import.meta.env.VITE_API_BASE_URL?.trim() ?? "");

  if (typeof window === "undefined") {
    return envBaseUrl;
  }

  if (envBaseUrl) {
    try {
      const parsedEnvBaseUrl = new URL(envBaseUrl);

      // Guard local development from accidentally pointing back at a deployed
      // Static Web App, which cannot serve the backend API routes.
      if (
        isLocalHostname(window.location.hostname) &&
        parsedEnvBaseUrl.hostname.endsWith(".azurestaticapps.net")
      ) {
        return LOCAL_API_BASE_URL;
      }
    } catch {
      return envBaseUrl;
    }

    return envBaseUrl;
  }

  return isLocalHostname(window.location.hostname) ? LOCAL_API_BASE_URL : "";
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
