import type { NextConfig } from 'next';

const apiOrigin = process.env.API_ORIGIN || 'http://localhost:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@vahanplus/contracts', '@vahanplus/rc-advance-client'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
