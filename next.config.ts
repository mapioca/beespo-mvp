import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // Enable compression for better performance
  compress: true,

  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'date-fns'],
  },

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    // Only apply optimizations in development
    if (dev && !isServer) {
      // Optimize caching strategy - simplified to avoid config resolution issues
      config.cache = {
        type: 'filesystem',
        compression: 'gzip',
      };

      // Improve code splitting
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework code (React, Next.js)
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // UI library code
            lib: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              name: 'lib',
              chunks: 'all',
              priority: 30,
            },
            // Common code used across pages
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;
