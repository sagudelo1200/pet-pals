import 'dotenv/config'

export default {
  expo: {
    name: 'Pet Pals',
    slug: 'pet-pals',
    privacy: 'public',
    platforms: ['ios', 'android', 'web'],
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'cover',
      backgroundColor: '#1B5E20',
    },
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.petpals.app',
    },
    android: {
      package: 'com.petpals.app',
      adaptiveIcon: {
        foregroundImage: './assets/splash.png',
        backgroundColor: '#1B5E20',
      },
    },
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
    },
  },
}
