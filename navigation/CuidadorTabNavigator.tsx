import React from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Icon } from '@/components/ui'
import Dashboard from '@/screens/cuidador/Dashboard'
import SolicitudesPaseos from '@/screens/cuidador/SolicitudesPaseos'
import AgendaScreen from '@/screens/cuidador/AgendaScreen'
import MiCuenta from '@/screens/shared/MiCuenta'
import { CuidadorTabParamList } from './types'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'

const Tab = createBottomTabNavigator<CuidadorTabParamList>()

export default function CuidadorTabNavigator(): React.ReactElement {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()

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
          paddingTop: 8,
          height:
            Platform.OS === 'ios'
              ? Math.max(insets.bottom + 65, 85)
              : Math.max(insets.bottom + 60, 75),
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={Dashboard}
        options={{
          title: t('cuidador:tabs.dashboard'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Solicitudes"
        component={SolicitudesPaseos}
        options={{
          title: t('cuidador:tabs.solicitudes'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="bell" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
        options={{
          title: t('cuidador:tabs.agenda'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-alt" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MiCuenta"
        component={MiCuenta}
        options={{
          title: t('cuidador:tabs.mi_cuenta'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}
