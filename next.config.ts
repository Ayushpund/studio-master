import type {NextConfig} from 'next';
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public', // Destination directory for the PWA files
  register: true, // Register the PWA
  skipWaiting: true, // Ensure the new Service Worker takes over immediately
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development
  // runtimeCaching: [...] // You can add custom caching strategies here if needed
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.icons8.com', // For placeholder icons if used
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default withPWA(nextConfig);
