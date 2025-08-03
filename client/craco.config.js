module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve = {
        ...webpackConfig.resolve,
        fallback: {
          buffer: require.resolve('buffer'),
          process: require.resolve('process/browser'),
          stream: require.resolve('stream-browserify'),
          util: require.resolve('util/'),
        },
      };
      return webpackConfig;
    },
  },
};
