/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    output: "standalone",

    poweredByHeader: false,
    compress: true,
    swcMinify: true,

    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: false },

    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    },

    images: {
        formats: ["image/avif", "image/webp"],
        minimumCacheTTL: 120,
    },

    experimental: {
        reactCompiler: true,
        serverActions: { allowedOrigins: ["*"] },
        turbo: { loaders: { "*.ts": ["ts"], "*.tsx": ["tsx"] } }
    },

    webpack: (config) => {
        config.infrastructureLogging = { level: "error" };
        return config;
    },
};

module.exports = nextConfig;