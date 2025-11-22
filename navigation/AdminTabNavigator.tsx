import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Placeholder from '@/screens/Placeholder'
import MiCuenta from '@/screens/shared/MiCuenta'
import { COLOR } from '@/constants'

const Tab = createBottomTabNavigator()

const AdminTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: COLOR.BLOQUE,
        },
        headerTintColor: COLOR.TEXTO,
      }}
    >
      <Tab.Screen name="AdminHome" component={Placeholder} />
      <Tab.Screen name="MiCuenta" component={MiCuenta} />
    </Tab.Navigator>
  )
}

export default AdminTabNavigator
