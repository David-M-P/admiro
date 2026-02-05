// src/lib/get-site-url.ts
export function getSiteURL(): string {
  // Vite exposes only VITE_* to the browser bundle
  const envUrl = import.meta.env.VITE_SITE_URL as string | undefined;

  // If not provided, infer at runtime from the browser
  let url =
    envUrl ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:8080");

  // Ensure scheme
  url = url.includes("http") ? url : `https://${url}`;

  // Ensure trailing slash
  url = url.endsWith("/") ? url : `${url}/`;

  return url;
}
