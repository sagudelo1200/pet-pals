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
        apiKey: process.env.API_KEY,
        authDomain: process.env.AUTH_DOMAIN,
        projectId: process.env.PROJECT_ID,
        storageBucket: process.env.STORAGE_BUCKET,
        messagingSenderId: process.env.MESSAGING_SENDER_ID,
        appId: process.env.APP_ID,
        measurementId: process.env.MEASUREMENT_ID,
        primaryColor: '#1B5E20',
        secondaryColor: '#FF9800',
        accentColor: '#FFC107',
        fontFamily: 'Poppins, sans-serif',
        tagline: 'Seguridad y bienestar para tu mascota',
      },
    },
  },
}
