import type { NextConfig } from 'next';


const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,

  devIndicators: {
    position: 'bottom-right'
  },

  experimental: {
    cssChunking: 'strict',
    viewTransition: true,
    turbopackFileSystemCacheForDev: true
  },

  poweredByHeader: false,
  reactMaxHeadersLength: 1000,

  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true
    },
    incomingRequests: {
      ignore: [/favicon\.ico/]
    }
  },

  typescript: {
    ignoreBuildErrors: true
  },

  images: {
    // AIDEV-NOTE: v16 changed defaults - minimumCacheTTL is now 14400s (4 hours)
    // qualities default changed from [1..100] to [75]
    // Uncomment and customize if needed:
    // minimumCacheTTL: 14400,
    // qualities: [75],
    // dangerouslyAllowLocalIP: false, // New security restriction in v16
  }
};


export default nextConfig;
