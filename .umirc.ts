import { defineConfig } from 'umi';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  routes: [{ path: '/', component: '@/pages/index' }],
  dynamicImport: {},
  mock: false,
  dva: {
    immer: true,
    hmr: false,
  },
  devServer: {
    proxy: {
      '/api/test/order': {
        pathRewrite: {
          '/api/test': '',
        },
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
});
