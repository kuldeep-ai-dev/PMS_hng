import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: process.env.NODE_ENV === 'production',
  compress: true,
  poweredByHeader: false,
  // experiments and logging disabled for troubleshooting
};

export default nextConfig;
