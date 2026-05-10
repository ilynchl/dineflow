const config = {
  projectName: 'dineflow-weapp',
  date: '2026-05-09',
  designWidth: 375,
  deviceRatio: { 375: 1, 390: 1.04, 414: 1.1, 640: 1.7, 750: 2, 828: 2.2 },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: ['@tarojs/plugin-platform-weapp'],
  defineConstants: {},
  framework: 'react',
  compiler: 'webpack5',
  cache: { enable: false },
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} },
      url: { enable: true, config: { limit: 1024 } },
      cssModules: { enable: false },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: { autoprefixer: { enable: true } },
    devServer: { port: 5174, proxy: { '/api': { target: 'http://localhost:3000' } } },
  },
};

module.exports = function (merge) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev'));
  }
  return merge({}, config, require('./prod'));
};
