import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["discord.js", "better-sqlite3", "argon2"],
};

export default nextConfig;
