/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Necessário para Docker
  eslint: {
    // Ignorar erros do ESLint durante o build (podem ser corrigidos depois)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Não permitir erros de TypeScript durante o build
    ignoreBuildErrors: false,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000',
  },
}

module.exports = nextConfig

