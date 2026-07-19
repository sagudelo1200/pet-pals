import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer, DarkTheme, Theme } from '@react-navigation/native'
import { GalioProvider } from 'galio-framework'
import { AuthProvider } from './context/AuthContext'
import { RolProvider } from './context/RolContext'
import { RootNavigator } from './navigation'
import { COLOR } from './constants'
import { StatusBar } from 'react-native'
import './services/i18n'
import { TerritorialAggregator } from '@/services/firebase/firestore/agregadores/territorial.aggregator'

import { MascotasProvider } from './context/MascotasContext'
// Registro de tareas de segundo plano para ubicación
import '@/logic/paseos/backgroundTask'

// Componente principal - Solo configuración global
export default function App(): React.ReactElement {
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
