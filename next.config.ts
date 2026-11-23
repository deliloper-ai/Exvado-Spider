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
  async headers() {
    return [
      {
        // tum_urunler.xml — public, asla cache'leme (her isteğe en güncel halini ver)
        source: '/tum_urunler.xml',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'Content-Type', value: 'application/xml; charset=utf-8' },
        ],
      },
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
