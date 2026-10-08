import { rm } from "node:fs/promises";

// Remove only Next.js generated output; manuscripts and source files are untouched.
await rm(new URL("../.next/", import.meta.url), {
  recursive: true,
  force: true,
});
console.log(
  "Cleared Next.js build cache. Starting a fresh development server.",
);
