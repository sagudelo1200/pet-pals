import React from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import AdminAjustes from '@/screens/admin/AdminAjustes'
import TerritorioVivo from '@/screens/admin/TerritorioVivo'
import AdminEconomia from '@/screens/admin/AdminEconomia'
import AdminHabilitaciones from '@/screens/admin/AdminHabilitaciones'
import { useHabilitaciones } from '@/hooks/admin/useHabilitaciones'
import MiCuenta from '@/screens/comun/MiCuenta'
import { Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import type { AdminTabParamList } from './types'
import { useTranslation } from 'react-i18next'

const Tab = createBottomTabNavigator<AdminTabParamList>()

const AdminTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation('admin')
  // Lo que espera revisión se ve como contador en la pestaña
  const { habilitaciones: porRevisar } = useHabilitaciones('EN_REVISION')

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
        name="AdminAjustes"
        component={AdminAjustes}
        options={{
          tabBarLabel: t('tabs.ajustes'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="cog" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminHabilitaciones"
        component={AdminHabilitaciones}
        options={{
          tabBarLabel: t('tabs.habilitaciones'),
          tabBarBadge: porRevisar.length > 0 ? porRevisar.length : undefined,
          tabBarIcon: ({ color, size }) => (
            <Icon name="clipboard-check" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminEconomia"
        component={AdminEconomia}
        options={{
          tabBarLabel: t('tabs.economia'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="dollar-sign" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="TerritorioVivo"
        component={TerritorioVivo}
        options={{
          tabBarLabel: t('tabs.territorio'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="map" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MiCuenta"
        component={MiCuenta}
        options={{
          tabBarLabel: t('tabs.mi_cuenta'),
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

export default AdminTabNavigator
