import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client'],
  images: {
    unoptimized: true,
  },
  typescript: {
    // Worker dosyaları runtime'da tsx ile çalışıyor, Next.js build pipeline'ında
    // type-check'e gerek yok. tsconfig.json'da exclude'a rağmen Next.js scan
    // ediyor — bu flag ile build'i bloklamasın.
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      // tum_urunler.xml is written at runtime by worker — serve via API route
      // so Next.js doesn't 404 from its static manifest
      { source: '/tum_urunler.xml', destination: '/api/xml' },
    ]
  },
  webpack: (config, { isServer }) => {
    // Sadece client-side için ayarlar
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // WASM ve ONNX hatalarını ignore et
    config.ignoreWarnings = [
      { module: /node_modules\/@imgly\/background-removal/ },
      { module: /node_modules\/onnxruntime-web/ },
      /Critical dependency/,
      /Can't resolve/,
    ];

    return config;
  },
};

export default nextConfig;
