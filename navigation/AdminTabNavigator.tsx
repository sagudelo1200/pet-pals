import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Placeholder from '@/screens/Placeholder'
import MiCuenta from '@/screens/shared/MiCuenta'

const Tab = createBottomTabNavigator()

const AdminTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="AdminHome" component={Placeholder} />
      <Tab.Screen name="MiCuenta" component={MiCuenta} />
    </Tab.Navigator>
  )
}

export default AdminTabNavigator
