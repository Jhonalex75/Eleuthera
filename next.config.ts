import type { NextConfig } from "next";

/**
 * Two deployment targets share this config.
 *
 * Firebase Hosting (static, free Spark plan) — `npm run deploy`
 *   sets STATIC_EXPORT=1, which emits a plain `out/` folder. The dashboard is a
 *   client component that reads Firestore from the browser, so it needs no
 *   server at all and loses nothing by being exported.
 *
 * Firebase App Hosting (SSR, requires the Blaze plan) — pushes to `main`
 *   leaves STATIC_EXPORT unset and builds normally.
 */
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export", images: { unoptimized: true } } : {}),
};

export default nextConfig;
