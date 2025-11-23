// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // 🔥 SILENCIAR el error de Turbopack (configuración vacía = OK)
  turbopack: {},
  
  // Configuración para producción
  output: 'standalone',
};

export default nextConfig;