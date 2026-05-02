const path = require('path')
const nodeExternals = require('webpack-node-externals')

module.exports = (options) => {
  return {
    ...options,
    // Externalize all node_modules — they must be present at runtime.
    // Only @app/shared is bundled so the monorepo package resolves correctly.
    externals: [
      nodeExternals({
        allowlist: [/@app\/shared/],
      }),
      {
        bcrypt: 'commonjs bcrypt',
        fsevents: 'commonjs fsevents',
        '@next/swc-darwin-arm64': 'commonjs @next/swc-darwin-arm64',
      },
    ],
    resolve: {
      ...options.resolve,
      alias: {
        ...(options.resolve?.alias || {}),
        '@app/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
  }
}
