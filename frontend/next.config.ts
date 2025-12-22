import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React 19 Compiler
  reactCompiler: true,
  
  // Standalone output for Docker/Render deployment
  output: "standalone",
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // Optimize images for faster loading
    formats: ["image/avif", "image/webp"],
    // Minimize image sizes
    minimumCacheTTL: 60,
  },
  
  // Production optimizations
  poweredByHeader: false,
  
  // Compress responses
  compress: true,
  
  // Generate source maps for debugging (disable in production if needed)
  productionBrowserSourceMaps: false,
  
  // Environment variables validation
  env: {
    NEXT_PUBLIC_APP_VERSION: "2.0.0",
  },
};

export default nextConfig;
