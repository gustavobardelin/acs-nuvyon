// acs-frontend/next.config.ts

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '20.206.200.230',
    '20.206.200.230:3001',
    'http://20.206.200.230',
    'http://20.206.200.230:3001',
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