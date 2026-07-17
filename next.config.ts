import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow building into an alternate dir (e.g. to run `next build` while
  // `next dev` is using the default .next). Defaults to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
