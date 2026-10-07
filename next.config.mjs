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
  async headers() {
    return [
      {
        source: "/video/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
