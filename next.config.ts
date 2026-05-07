import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@langchain/openai", "@langchain/core"],
};

export default nextConfig;
