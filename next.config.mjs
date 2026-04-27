/** @type {import('next').NextConfig} */
const API_TARGET =
  process.env.API_PROXY_TARGET || 'https://aiforms-api-production.up.railway.app'

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${API_TARGET}/:path*`,
      },
    ]
  },
}

export default nextConfig
