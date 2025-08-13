/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ytb-quiz/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
  },
}

module.exports = nextConfig