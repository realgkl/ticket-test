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
      '/api/test': {
        target: 'https://ucloud.uisee.cn:30123',
        secure: true,
        changeOrigin: true,
      },
    },
  },
});
