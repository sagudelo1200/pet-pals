import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import AdminDashboard from '@/screens/admin/AdminDashboard'
import TerritorioVivo from '@/screens/admin/TerritorioVivo'
import MiCuenta from '@/screens/comun/MiCuenta'
import { Icon } from '@/components/ui'
import { COLOR } from '@/constants'
import type { AdminTabParamList } from './types'

const Tab = createBottomTabNavigator<AdminTabParamList>()

const AdminTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLOR.PRIMARIO,
        tabBarInactiveTintColor: COLOR.SUBTEXTO,
        tabBarStyle: { backgroundColor: COLOR.BLOQUE },
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
