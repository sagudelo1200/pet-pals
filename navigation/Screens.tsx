import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import TutorTabNavigator from '@/navigation/TutorTabNavigator'
import CuidadorTabNavigator from '@/navigation/CuidadorTabNavigator'
import AdminTabNavigator from '@/navigation/AdminTabNavigator'
import AuthNavigator from './AuthNavigator'
import DetalleMascota from '@/screens/tutor/DetalleMascota'
import { DetallePaseo } from '@/screens/tutor/DetallePaseo'
import { DetalleSolicitud } from '@/screens/cuidador/DetalleSolicitud'
import { DetallePaseoActivo } from '@/screens/cuidador/DetallePaseoActivo'
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
      <Stack.Screen name="DetallePaseo" component={DetallePaseo} />
      <Stack.Screen name="DetalleSolicitud" component={DetalleSolicitud} />
      <Stack.Screen name="DetallePaseoActivo" component={DetallePaseoActivo} />
      <Stack.Screen name="PerfilCuidador" component={PerfilCuidador} />
    </Stack.Navigator>
  )
}
