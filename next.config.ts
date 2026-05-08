import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@langchain/openai", "@langchain/core"],
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
