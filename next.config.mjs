/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Critical for Cloud Run

  // Proxy backend API through Next.js so the browser sees same-origin
  // requests (avoids CORS). Override the destination with BACKEND_API_URL.
  async rewrites() {
    const backend = (
      process.env.BACKEND_API_URL ||
      'https://kinloom-api-laravel-fz0wpjzb.on-forge.com/api'
    ).replace(/\/$/, '');
    return [
      {
        source: '/proxy/:path*',
        destination: `${backend}/:path*`,
      },
    ];
  },
};
export default nextConfig;
