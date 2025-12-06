import React, { useEffect } from 'react'
import { useAuth } from '@/services/context/AuthContext'
import { LoadingScreen } from '@/components/ui'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import Bienvenida from '@/screens/auth/Bienvenida'
import Ingresar from '@/screens/auth/Ingresar'
import Registro from '@/screens/auth/Registro'
import { AuthFlowParamList } from './types'

const Stack = createStackNavigator<AuthFlowParamList>()

const AuthNavigator: React.FC = () => {
  const { user, cargando, roles, recargarPerfil } = useAuth()
  const retriedRef = React.useRef(false)
  const navigation = useNavigation<any>() // TODO: tipar con RootStack
  // Helper: prefer reset on parent (root) navigator if available
  const getRootNavigation = () => {
    // Prefer parent navigator (root) when available, otherwise current navigation
    return navigation && typeof navigation.getParent === 'function'
      ? (navigation.getParent() ?? navigation)
      : navigation
  }

  // Efecto para navegar automáticamente cuando hay usuario
  useEffect(() => {
    if (user && !cargando) {
      // Esperar a que `roles` esté cargado (no undefined). Evita navegar por defecto
      // a `TutorApp` antes de que el perfil/roles se hayan recuperado.
      if (!Array.isArray(roles)) return

      // Si roles es un array vacío, intentar recargar perfil una vez (posible eventual
      // retraso en la escritura/lectura de Firestore). Si ya reintentamos, seguimos
      // con la navegación por defecto.
      if (Array.isArray(roles) && roles.length === 0) {
        if (!retriedRef.current) {
          retriedRef.current = true
          void recargarPerfil?.()
          return
        }
      }

      // Decidir destino por rol. Priorizar admin si existe.
      const isAdmin = roles.includes('admin')
      const isTutor = roles.includes('tutor')
      const isCuidador = roles.includes('cuidador')
      const target = isAdmin
        ? 'AdminApp'
        : isTutor
          ? 'TutorApp'
          : isCuidador
            ? 'CuidadorApp'
            : 'TutorApp'

      const rootNav = getRootNavigation()
      // Prefer using reset if available on the nav object, otherwise dispatch CommonActions.reset
      try {
        if (rootNav && typeof rootNav.reset === 'function') {
          rootNav.reset({ index: 0, routes: [{ name: target as never }] })
        } else if (rootNav && typeof rootNav.dispatch === 'function') {
          rootNav.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: target as never }],
            })
          )
        } else {
          // As a last resort, try current navigation
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: target as never }],
            })
          )
        }
      } catch (e) {
        console.error('AuthNavigator: error resetting navigation', e)
      }
    }
  }, [user, cargando, roles, navigation])

  if (cargando || user) {
    return <LoadingScreen messageType="mascota" spinnerColor="#22A47C" />
  }

  // Si no hay usuario, mostramos el stack de autenticación (Bienvenida / Ingresar / Registro)
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Bienvenida"
    >
      <Stack.Screen name="Bienvenida" component={Bienvenida} />
      <Stack.Screen name="Ingresar" component={Ingresar} />
      <Stack.Screen name="Registro" component={Registro} />
    </Stack.Navigator>
  )
}

export default AuthNavigator
