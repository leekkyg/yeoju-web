import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.yeojumoa.app',
  appName: '여주모아',
  webDir: 'public',
  server: {
    url: 'https://yeoju-web.vercel.app',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};
export default config;