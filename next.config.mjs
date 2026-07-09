/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Habilita instrumentation.ts (agendador interno de outreach no boot do servidor).
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
