import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import DuenoTabNavigator from '@/navigation/DuenoTabNavigator'
import PaseadorTabNavigator from '@/navigation/PaseadorTabNavigator'
import AuthNavigator from './AuthNavigator'
import { AuthStackParamList } from './types'

// Stack principal con autenticación
const Stack = createStackNavigator<AuthStackParamList>()

// Navegador principal: Auth → App (Tabs)
export default function RootNavigator(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="DuenoApp" component={DuenoTabNavigator} />
      <Stack.Screen name="PaseadorApp" component={PaseadorTabNavigator} />
    </Stack.Navigator>
  )
}
