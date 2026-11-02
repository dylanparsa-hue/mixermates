import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  experimental: { proxyClientMaxBodySize: "12mb" },
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": [
      "./prisma/mysql/**/*",
      "./prisma/*.ts",
      "./node_modules/prisma/**/*",
      "./node_modules/@prisma/**/*",
      "./node_modules/.prisma/**/*",
      "./node_modules/@swc/helpers/**/*",
      "./node_modules/tsx/**/*",
    ],
  },
  devIndicators: false,
  serverExternalPackages: ["@prisma/client", "bcryptjs", "prisma", "tsx"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=()" },
        ],
      },
    ];
  },
};
export default config;
