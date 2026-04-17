const path = require('path')

/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  webpack: (config) => {
    config.resolve.alias['@app/shared'] = path.resolve(__dirname, '../../packages/shared/src')
    return config
  },
}
