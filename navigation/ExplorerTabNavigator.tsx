import React from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { ExplorerTabParamList } from './types'
import { Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'

// Pantallas del explorador
import InicioExplorador from '@/screens/explorador/InicioExplorador'
import MapaTerritorial from '@/screens/explorador/MapaTerritorial'
import HistorialExploraciones from '@/screens/explorador/HistorialExploraciones'
import CapturaTerritorial from '@/screens/explorador/CapturaTerritorial'
import MiCuenta from '@/screens/comun/MiCuenta'
import {
  CapturaTerritorialProvider,
  useCapturaTerritorial,
} from '@/context/CapturaTerritorialContext'

const Tab = createBottomTabNavigator<ExplorerTabParamList>()

const TabNavigatorContent = () => {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLOR.ENFASIS,
        tabBarInactiveTintColor: COLOR.SUBTEXTO,
        tabBarStyle: {
          backgroundColor: COLOR.BLOQUE,
          borderTopWidth: 1,
          borderTopColor: COLOR.BORDE,
          paddingBottom:
            Platform.OS === 'ios'
              ? Math.max(insets.bottom, 20)
              : Math.max(insets.bottom + 5, 15),
          paddingTop: 5,
          height:
            Platform.OS === 'ios'
              ? Math.max(insets.bottom + 65, 85)
              : Math.max(insets.bottom + 60, 75),
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="InicioExplorador"
        component={InicioExplorador}
        options={{
          tabBarLabel: t('explorador:inicio'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="map-marked-alt" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MapaTerritorial"
        component={MapaTerritorial}
        options={{
          tabBarLabel: t('explorador:mapa'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="globe" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="HistorialExploraciones"
        component={HistorialExploraciones}
        options={{
          tabBarLabel: t('explorador:historial'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="list" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MiCuenta"
        component={MiCuenta}
        options={{
          tabBarLabel: t('comun:tabs.mi_cuenta'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="user-circle" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

const TabNavigatorWithCaptura = () => {
  const { mostrarCaptura, cerrarCaptura } = useCapturaTerritorial()

  return (
    <>
      <TabNavigatorContent />
      <CapturaTerritorial
        visible={mostrarCaptura}
        onClose={cerrarCaptura}
        onSuccess={cerrarCaptura}
      />
    </>
  )
}

const ExplorerTabNavigator = () => {
  return (
    <CapturaTerritorialProvider>
      <TabNavigatorWithCaptura />
    </CapturaTerritorialProvider>
  )
}

export default ExplorerTabNavigator
