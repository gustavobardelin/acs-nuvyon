// acs-frontend/next.config.ts

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '34.39.199.91',
    '34.39.199.91:3001',
    'http://34.39.199.91',
    'http://34.39.199.91:3001',
  ],

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:3000/:path*',
      },
    ];
  },
};

export default nextConfig;