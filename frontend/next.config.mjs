/** @type {import('next').NextConfig} */

const nextConfig = {
  // Hide the Next.js development indicator
  devIndicators: false,

  // Ignore TypeScript build errors
  typescript: {
    ignoreBuildErrors: true,
  },

  // Allow images without Next.js optimization
  images: {
    unoptimized: true,
  },
}

export default nextConfig