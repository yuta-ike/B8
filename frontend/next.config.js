
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "development"
        ? undefined
        : {
          exclude: ["error"],
        },
  },
  experimental: {
    scrollRestoration: true,
    typedRoutes: true,
  },
}

module.exports = nextConfig