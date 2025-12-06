import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer, DarkTheme, Theme } from '@react-navigation/native'
import { GalioProvider } from 'galio-framework'
import { AuthProvider } from './services/context/AuthContext'
import { RootNavigator } from './navigation'
import { COLOR } from './constants'
import { StatusBar } from 'react-native'
import './services/i18n'

import { MascotasProvider } from './context/MascotasContext'

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
        <MascotasProvider>
          <GalioProvider>
            <StatusBar barStyle="light-content" backgroundColor={COLOR.BLOQUE} translucent={false} />
            <NavigationContainer theme={navTheme}>
              <RootNavigator />
            </NavigationContainer>
          </GalioProvider>
        </MascotasProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
