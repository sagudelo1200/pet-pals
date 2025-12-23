import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import TutorTabNavigator from '@/navigation/TutorTabNavigator'
import CuidadorTabNavigator from '@/navigation/CuidadorTabNavigator'
import AdminTabNavigator from '@/navigation/AdminTabNavigator'
import AuthNavigator from './AuthNavigator'
import DetalleMascota from '@/screens/tutor/DetalleMascota'
import PaseoActivo from '@/screens/tutor/PaseoActivo'
import PaseoFinalizado from '@/screens/tutor/PaseoFinalizado'
import ControlPaseo from '@/screens/cuidador/ControlPaseo'
import PerfilCuidador from '@/screens/cuidador/PerfilCuidador'
import { AuthStackParamList } from './types'

// Stack principal con autenticación
const Stack = createStackNavigator<AuthStackParamList>()

// Navegador principal: Auth → App (Tabs)
export default function RootNavigator(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="TutorApp" component={TutorTabNavigator} />
      <Stack.Screen name="CuidadorApp" component={CuidadorTabNavigator} />
      <Stack.Screen name="AdminApp" component={AdminTabNavigator} />
      <Stack.Screen
        name="DetalleMascota"
        component={DetalleMascota}
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="PerfilCuidador" component={PerfilCuidador} />
      <Stack.Screen
        name="PaseoActivo"
        component={PaseoActivo}
        options={{
          headerShown: true,
          headerTitle: 'Paseo en Vivo 🐾',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name="PaseoFinalizado"
        component={PaseoFinalizado}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ControlPaseo"
        component={ControlPaseo}
        options={{
          headerShown: true,
          headerTitle: 'Control de Paseo 🐾',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  )
}
