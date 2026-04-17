const path = require('path')

module.exports = (options) => {
  return {
    ...options,
    // webpack-merge concatenates arrays, so override externals directly
    // bundling everything into main.js for Docker deployments
    externals: [],
    resolve: {
      ...options.resolve,
      alias: {
        ...(options.resolve?.alias || {}),
        '@app/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
  }
}
