/** Server-only upstream configuration. Never expose this as NEXT_PUBLIC_*. */
export function backendOrigin() {
  const value = process.env.NARRATOR_BACKEND_URL;
  if (!value) return null;
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/")
    throw new Error("NARRATOR_BACKEND_URL must be an HTTPS origin without credentials or a path.");
  return url.origin;
}
