import type { NextConfig } from "next";

/**
 * AgroOps — Next.js config
 *
 * `output: 'standalone'` genera `.next/standalone/` con un mini-servidor
 * Node + dependencies tree-shaken (~30MB) que el Dockerfile copia
 * directamente. Mucho más rápido y pequeño que llevar todo `node_modules`.
 *
 * En dev (sin Docker) no afecta — sólo cambia el output del `next build`.
 */
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
