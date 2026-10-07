/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingExcludes: {
    "/*": [
      "./data/**/*",
      "./models/**/*",
      "./.venv/**/*",
      "./tools/piper/**/*",
    ],
  },
  serverExternalPackages: ["better-sqlite3"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
