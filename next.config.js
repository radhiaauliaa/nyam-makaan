/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    domains: [
      'res.cloudinary.com',
      'firebasestorage.googleapis.com',
      'images.unsplash.com',
      'via.placeholder.com'
    ],
    formats: ['image/avif', 'image/webp'],
  },

  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || 'nyam-makan-default-key',
  },

  swcMinify: true,

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

};

module.exports = nextConfig;