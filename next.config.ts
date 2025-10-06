import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  /** 增量渲染，需要配合页面或者路由中加上export const experimental_ppr = true */
  experimental: {
    // ppr: 'incremental'
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
