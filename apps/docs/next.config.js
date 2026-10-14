/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['undici', '@scalar/json-magic', '@fumadocs/json-schema'],
  },
}

module.exports = nextConfig
