import type { NextConfig } from "next";
// import type { Configuration } from "webpack";

const nextConfig: NextConfig = {
  turbopack: {},

  serverExternalPackages: ["prisma"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  // ❗️Note: This block is ignored by Turbopack (used only with Webpack)
  // webpack: (config: Configuration) => {
  //   config.resolve = config.resolve || {};
  //   config.resolve.fallback = {
  //     ...config.resolve.fallback,
  //     fs: false,
  //     net: false,
  //     tls: false,
  //   };
  //   return config;
  // },

  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "",
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      { source: "/events/:slug", destination: "/events/:slug" },
      { source: "/e/:slug", destination: "/events/:slug" },
    ];
  },

  async redirects() {
    return [
      { source: "/login", destination: "/auth/login", permanent: false },
      { source: "/signup", destination: "/auth/register", permanent: false },
      { source: "/register", destination: "/auth/register", permanent: false },
    ];
  },
};

export default nextConfig;
