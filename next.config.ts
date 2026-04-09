import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    // Tree-shake large icon/chart/animation libs at build time
    // This alone can cut JS bundle by 200-400KB
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      'date-fns',
    ],
  },
};

export default nextConfig;
