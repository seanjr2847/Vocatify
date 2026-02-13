/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Flat config (eslint.config.mjs)와 Next.js 내장 ESLint 통합 간 호환성 문제 방지
    // lint는 `npm run lint`로 별도 실행
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'http',
        hostname: 'nicovideo.cdn.nimg.jp',
        pathname: '/thumbnails/**',
      },
      {
        protocol: 'https',
        hostname: 'nicovideo.cdn.nimg.jp',
        pathname: '/thumbnails/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'static.vocadb.net',
      },
      {
        protocol: 'https',
        hostname: 'i1.sndcdn.com',
        pathname: '/artworks-**',
      },
    ],
  },
}

module.exports = nextConfig
