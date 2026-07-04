import 'dotenv/config'

export default {
  expo: {
    name: 'Paw-Path',
    slug: 'paw-path',
    scheme: 'pawpath', // Necesario para Deep Linking y Auth Session
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
      bundleIdentifier: 'com.pawpath.app',
      infoPlist: {
        CFBundleAllowMixedLocalizations: true,
        UIBackgroundModes: ['location', 'fetch'],
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'Paw-Path necesita acceder a tu ubicación siempre para que los tutores puedan ver el recorrido de su mascota en tiempo real, incluso con la app cerrada.',
        NSLocationAlwaysUsageDescription:
          'Paw-Path necesita acceder a tu ubicación siempre para que los tutores puedan ver el recorrido de su mascota en tiempo real, incluso con la app cerrada.',
        NSLocationWhenInUseUsageDescription:
          'Paw-Path necesita acceder a tu ubicación mientras usas la app para registrar el inicio y progreso de los paseos.',
      },
    },
    android: {
      package: 'com.pawpath.app',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/splash.png',
        backgroundColor: '#1B5E20',
      },
      navigationBar: {
        // Modo Expo prebuild: algunos campos se mapean desde androidNavigationBar en app.json
      },
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
      ],
    },
    userInterfaceStyle: 'dark', // Forzar modo oscuro para evitar fondos blancos del sistema
    androidNavigationBar: {
      backgroundColor: '#121918', // COLOR.BLOQUE
      translucent: false, // IMPORTANTE: Evita que el sistema ponga una capa oscura encima
      barStyle: 'light-content',
    },
    androidStatusBar: {
      barStyle: 'light-content', // Iconos claros sobre fondo oscuro
      backgroundColor: '#121918', // COLOR.BLOQUE - fondo oscuro consistente
      hidden: false,
      translucent: false, // Fondo sólido, no translúcido
    },
    plugins: [
      'expo-web-browser',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Permite que Paw-Path acceda a tu ubicación constante durante el seguimiento en tiempo real de los paseos.',
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
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
      '🐾 Paw-Path - Paseos seguros y felices para tu mascota. Confianza y tranquilidad para ti.',
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
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID,
      },
      google: {
        mapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
        androidCert: process.env.ANDROID_CERT_FINGERPRINT,
        androidPackage: 'com.pawpath.app',
      },
      eas: {
        projectId: 'f174e59c-ef40-4133-818f-6615e440fbb1',
      },
    },
  },
}
