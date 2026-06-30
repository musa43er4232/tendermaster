/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Allow larger uploads to server actions (tender PDFs can be tens of MB)
    serverActions: {
      bodySizeLimit: '40mb',
    },
  },
};

export default nextConfig;
