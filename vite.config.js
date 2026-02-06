// vite.config.js
import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import config from './config.json';

export default defineConfig({
  base: '/pay/', // 关键：如果是子路径部署，必须加上这个
  plugins: [
    ViteEjsPlugin({ DATA: config }),
  ],
  server: {
    host: '0.0.0.0', // <--- 加上这一行！强制监听所有 IP
    open: true,
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      canvas: 'vite-plugin-ejs/ignore', 
    }
  }
});