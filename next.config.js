/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Playwright must not be Webpack-bundled (Next 14.0.x) or chromium.launch() can hang
  webpack: (config, { isServer }) => {
    if (isServer && config.externals) {
      if (Array.isArray(config.externals)) {
        config.externals.push("playwright", "playwright-core")
      } else {
        config.externals = [config.externals, "playwright", "playwright-core"]
      }
    }
    return config
  },
}

module.exports = nextConfig
