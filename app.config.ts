import 'dotenv/config'

export default {
  expo: {
    name: 'Pet Pals',
    slug: 'pet-pals',
    scheme: 'petpals', // Necesario para Deep Linking y Auth Session
    privacy: 'public',
    platforms: ['ios', 'android'],
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    entryPoint: './index.tsx',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'cover',
      backgroundColor: '#0A1411',
    },
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.petpals.app',
      infoPlist: {
        CFBundleAllowMixedLocalizations: true,
      },
    },
    android: {
      package: 'com.petpals.app',
      adaptiveIcon: {
        foregroundImage: './assets/splash.png',
        backgroundColor: '#1B5E20',
      },
      navigationBar: {
        // Modo Expo prebuild: algunos campos se mapean desde androidNavigationBar en app.json
      },
    },
    userInterfaceStyle: 'dark', // Forzar modo oscuro para evitar fondos blancos del sistema
    androidNavigationBar: {
      barStyle: 'light-content',
      backgroundColor: '#0F2521', // COLOR.BLOQUE
      translucent: false, // IMPORTANTE: Evita que el sistema ponga una capa oscura encima
    },
    androidStatusBar: {
      barStyle: 'light-content',
      backgroundColor: 'transparent',
      hidden: false,
      translucent: true,
    },
    plugins: [
      'expo-web-browser',
      [
        'expo-build-properties',
        {
          ios: {
            newArchEnabled: false,
          },
          android: {
            newArchEnabled: false,
          },
        },
      ],
    ],
    description:
      '🐾 Pet Pals - Paseos seguros y felices para tu mascota. Confianza y tranquilidad para ti.',
    extra: {
      brand: {
        primaryColor: '#1B5E20',
        secondaryColor: '#FF9800',
        accentColor: '#FFC107',
        fontFamily: 'Poppins, sans-serif',
        tagline: 'Seguridad y bienestar para tu mascota',
      },
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID,
      },
      eas: {
        projectId: 'f174e59c-ef40-4133-818f-6615e440fbb1',
      },
    },
  },
}
