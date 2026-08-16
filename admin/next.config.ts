import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "imagedelivery.net" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "afrrhkemaiwkdyfgfwif.supabase.co" },
      { protocol: "https", hostname: "videodelivery.net" },
      { protocol: "https", hostname: "*.cloudflarestream.com" },
    ],
  },
};

export default nextConfig;
