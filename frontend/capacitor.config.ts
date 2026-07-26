import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ironrabbitapps.notes',
  appName: 'Iron Rabbit',
  webDir: 'build',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
    // Automatically require biometric auth on cold start when Security is enabled.
    // The actual gate is handled in-app via SecurityService.
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PrivacyScreen: {
      // Hide app content when the OS shows the task switcher (Recent Apps).
      // Toggleable at runtime via SecurityService.
      enable: true,
      imageName: 'Splash', // fallback splash if screenshot suppression needs an image
      preventScreenshots: false, // opt-in via Security Settings
    },
    App: {
      // Reserved for App state listeners (background/foreground)
    },
  },
};

export default config;
