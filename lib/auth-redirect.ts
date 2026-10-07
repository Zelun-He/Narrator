export function safeReturnTo(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return "/library";
  try {
    const url = new URL(value, "https://narrator.invalid");
    if (
      url.origin !== "https://narrator.invalid" ||
      !["/library", "/upload", "/voices", "/processing", "/player"].includes(
        url.pathname,
      )
    )
      return "/library";
    return url.pathname + url.search;
  } catch {
    return "/library";
  }
}
