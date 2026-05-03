import type { NextConfig } from "next";

/** Dev: same-origin `/v1/*` → backend jab `NEXT_PUBLIC_API_URL` set na ho. Direct `:8000` ke liye frontend `.env` mein `NEXT_PUBLIC_API_URL=http://localhost:8000/v1`. */
const backend_proxy_target =
  process.env.BACKEND_PROXY_TARGET?.replace(/\/$/, "") || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  /** Hide Next.js dev “N” badge (still shows build/runtime errors). */
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
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/v1/:path*",
        destination: `${backend_proxy_target}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
