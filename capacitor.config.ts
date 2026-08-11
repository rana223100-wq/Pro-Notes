import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pro.notes',
  appName: 'Pro Notes',
  webDir: 'dist',

  plugins: {
    FirebaseAuthentication: {
      providers: ['google.com']
    }
  }
};

export default config;