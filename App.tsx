import React from 'react'
import { Text, TextInput, StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer, DarkTheme, Theme } from '@react-navigation/native'
import { GalioProvider } from 'galio-framework'
import { AuthProvider } from './context/AuthContext'
import { RolProvider } from './context/RolContext'
import { RootNavigator } from './navigation'
import { COLOR } from './constants'
import './services/i18n'
import { TerritorialAggregator } from '@/services/firebase/firestore/agregadores/territorial.aggregator'

import { MascotasProvider } from './context/MascotasContext'
// Registro de tareas de segundo plano para ubicación
import '@/logic/paseos/backgroundTask'

// Componente principal - Solo configuración global
export default function App(): React.ReactElement {
  // Desactivar el escalado de fuente por accesibilidad en toda la app
  // para evitar que cambios globales del dispositivo rompan el layout.
  if ((Text as any).defaultProps == null) (Text as any).defaultProps = {}
  ;(Text as any).defaultProps.allowFontScaling = false
  if ((TextInput as any).defaultProps == null)
    (TextInput as any).defaultProps = {}
  ;(TextInput as any).defaultProps.allowFontScaling = false

  React.useEffect(() => {
    TerritorialAggregator.initialize()
  }, [])
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
        <RolProvider>
          <MascotasProvider>
            <GalioProvider>
              <StatusBar
                barStyle="light-content"
                backgroundColor={COLOR.BLOQUE}
                translucent={false}
              />
              <NavigationContainer theme={navTheme}>
                <RootNavigator />
              </NavigationContainer>
            </GalioProvider>
          </MascotasProvider>
        </RolProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
