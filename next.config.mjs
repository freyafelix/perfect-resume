/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 解决服务端库的兼容性问题
      config.externals.push({
        'canvas': 'canvas',
      })
    }
    
    // 忽略某些模块的警告
    config.ignoreWarnings = [
      { module: /node_modules\/pdf-parse/ },
      { module: /node_modules\/tesseract\.js/ },
    ]
    
    return config
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'tesseract.js']
  }
}

export default nextConfig
