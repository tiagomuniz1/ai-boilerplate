const path = require('path')

// Clinic branding is served by the backend (private S3 bucket). Allow next/image to load it from
// the configured API host, in addition to localhost for local development.
function apiRemotePattern() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return []
  try {
    const url = new URL(apiUrl)
    return [{ protocol: url.protocol.replace(':', ''), hostname: url.hostname }]
  } catch {
    return []
  }
}

/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      ...apiRemotePattern(),
    ],
  },
  webpack: (config) => {
    config.resolve.alias['@app/shared'] = path.resolve(__dirname, '../../packages/shared/src')
    return config
  },
}
