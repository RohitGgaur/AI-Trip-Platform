import type { NextConfig } from "next";

const backend_proxy_target =
  process.env.BACKEND_PROXY_TARGET?.replace(/\/$/, "") ||
  "http://52.23.215.221:5000";

const nextConfig: NextConfig = {
  devIndicators: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: "http://52.23.215.221:5000/v1/:path*",
      },
    ];
  },
};

export default nextConfig;