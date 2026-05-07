import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: process.env.NODE_ENV === 'production',
  compress: true,
  poweredByHeader: false,
  // Increase dev performance by disabling source maps for production-like speed
  // and optimizing package imports for heavy libraries.
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      'date-fns',
      'sonner',
      'zod',
      'clsx',
      'tailwind-merge',
      '@supabase/supabase-js'
    ],
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
