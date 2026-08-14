import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ironrabbit.app',
  appName: 'Iron Rabbit',
  webDir: 'build',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    // Do NOT set a `url` here — that would make the native app load from the network
    // instead of the bundled build, which breaks offline-first.
  },
  ios: {
    contentInset: 'always',
    // Automatically require biometric auth on cold start when Security is enabled.
    // The actual gate is handled in-app via SecurityService.
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    // Improves scroll perf on Android WebView
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      // 2s brand splash — long enough to hide the JS boot flash on cold start,
      // short enough to not annoy repeat users. Fades out automatically.
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#020617',           // slate-950, matches manifest.background_color
      androidSplashResourceName: 'splash',   // /android/app/src/main/res/drawable/splash.xml
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      // iOS uses the LaunchScreen.storyboard directly — no image name needed here.
    },
    PrivacyScreen: {
      // Hide app content when the OS shows the task switcher (Recent Apps).
      // Toggleable at runtime via SecurityService.
      enable: true,
      imageName: 'Splash',              // fallback splash if screenshot suppression needs an image
      preventScreenshots: false,        // opt-in via Security Settings
    },
    App: {
      // Reserved for App state listeners (background/foreground)
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_ironrabbit',
      iconColor: '#4F46E5',
      sound: 'beep.wav',
    },
  },
};

export default config;
