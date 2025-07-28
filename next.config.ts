/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your other Next.js configurations might be here, e.g.,
  // reactStrictMode: true,
  // images: {
  //   domains: ['example.com'],
  // },
   typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;