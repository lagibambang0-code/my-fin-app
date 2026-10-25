/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Menandai bahwa pembaruan versi Next.js ini dikerjakan oleh agen untuk
    // menutup kerentanan yang diumumkan (lihat `next upgrade --agent=security`).
    agentUpgrade: 'security',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
