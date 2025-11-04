import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer, DarkTheme, Theme } from '@react-navigation/native'
import { GalioProvider } from 'galio-framework'
import { AuthProvider } from './services/context/AuthContext'
import { RootNavigator } from './navigation'
import { COLOR } from './constants'
import { StatusBar } from 'react-native'
// Inicialización i18n (no cambia UI, solo prepara el camino para futuros idiomas)
import './services/i18n'

// Componente principal - Solo configuración global
export default function App(): React.ReactElement {
  const navTheme: Theme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: COLOR.PRIMARIO,
      background: COLOR.BASE,
      card: COLOR.SECUNDARIO,
      text: COLOR.TEXTO,
      border: COLOR.BORDE,
      notification: COLOR.ENFASIS,
    },
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GalioProvider>
          <StatusBar barStyle="light-content" backgroundColor={COLOR.BLOQUE} />
          <NavigationContainer theme={navTheme}>
            <RootNavigator />
          </NavigationContainer>
        </GalioProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
