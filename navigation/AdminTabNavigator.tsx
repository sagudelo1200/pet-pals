import React from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import AdminDashboard from '@/screens/admin/AdminDashboard'
import TerritorioVivo from '@/screens/admin/TerritorioVivo'
import AdminEconomia from '@/screens/admin/AdminEconomia'
import MiCuenta from '@/screens/comun/MiCuenta'
import { Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import type { AdminTabParamList } from './types'

const Tab = createBottomTabNavigator<AdminTabParamList>()

const AdminTabNavigator: React.FC = () => {
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
        name="AdminHome"
        component={AdminDashboard}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Icon name="cog" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminEconomia"
        component={AdminEconomia}
        options={{
          tabBarLabel: 'Economía',
          tabBarIcon: ({ color, size }) => (
            <Icon name="dollar-sign" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="TerritorioVivo"
        component={TerritorioVivo}
        options={{
          tabBarLabel: 'Territorio',
          tabBarIcon: ({ color, size }) => (
            <Icon name="map" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MiCuenta"
        component={MiCuenta}
        options={{
          tabBarLabel: 'Mi Cuenta',
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

export default AdminTabNavigator
