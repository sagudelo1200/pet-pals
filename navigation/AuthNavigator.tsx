import React, { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRol } from '@/context/RolContext'
import { LoadingScreen } from '@/components/ui'
import { SeleccionarRolModal } from '@/components/comun/SeleccionarRolModal'
import { useNavigation, CommonActions } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import Bienvenida from '@/screens/auth/Bienvenida'
import Ingresar from '@/screens/auth/Ingresar'
import Registro from '@/screens/auth/Registro'
import { AuthFlowParamList } from './types'
import type { RolUsuario } from '@/models/Usuario'

const Stack = createStackNavigator<AuthFlowParamList>()

const AuthNavigator: React.FC = () => {
  const { user, cargando, roles, recargarPerfil } = useAuth()
  const {
    rolActivo,
    cambiarRolActivo,
    tieneMultiplesRoles,
    cargando: cargandoRol,
  } = useRol()
  const [mostrarSelectorRol, setMostrarSelectorRol] = useState(false)
  const retriedRef = React.useRef(false)
  const navigatedTargetRef = React.useRef<string | null>(null)
  const navigation = useNavigation<any>()

  const getRootNavigation = () => {
    return navigation && typeof navigation.getParent === 'function'
      ? (navigation.getParent() ?? navigation)
      : navigation
  }

  // Efecto para navegar automáticamente cuando hay usuario
  useEffect(() => {
    if (user && !cargando && !cargandoRol) {
      // Esperar a que roles esté cargado
      if (!Array.isArray(roles)) return

      // Si roles es vacío, intentar recargar una vez
      if (Array.isArray(roles) && roles.length === 0) {
        if (!retriedRef.current) {
          retriedRef.current = true
          void recargarPerfil?.()
          return
        }
      }

      // Si tiene múltiples roles y no hay rol activo, mostrar selector
      if (tieneMultiplesRoles && !rolActivo) {
        setMostrarSelectorRol(true)
        return // NO navegar, esperar selección del usuario
      }

      // Solo navegar si NO está mostrando el selector
      if (!mostrarSelectorRol) {
        // Navegar según el rol activo o el primer rol disponible
        const rolParaNavegar = rolActivo || roles[0]

        if (!rolParaNavegar) {
          // Sin roles, ir a TutorApp por defecto
          navegarA('TutorApp')
          return
        }

        // Decidir destino por rol activo
        const target =
          rolParaNavegar === 'admin'
            ? 'AdminApp'
            : rolParaNavegar === 'cuidador'
              ? 'CuidadorApp'
              : 'TutorApp'
        // Evitar reinicios redundantes: sólo resetear si el target cambió
        if (navigatedTargetRef.current !== target) {
          navegarA(target)
          navigatedTargetRef.current = target
        }
      }
    }
  }, [
    user,
    cargando,
    cargandoRol,
    roles,
    rolActivo,
    tieneMultiplesRoles,
    mostrarSelectorRol,
  ])

  const navegarA = (target: string) => {
    const rootNav = getRootNavigation()
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

  const handleSeleccionarRol = async (rol: RolUsuario) => {
    await cambiarRolActivo(rol)
    setMostrarSelectorRol(false)
    // La navegación se hará automáticamente por el useEffect
  }

  if (cargando || cargandoRol || user) {
    return (
      <>
        <LoadingScreen messageType="mascota" spinnerColor="#22A47C" />
        <SeleccionarRolModal
          visible={mostrarSelectorRol}
          roles={roles || []}
          onSelectRol={handleSeleccionarRol}
          onClose={() => {
            // No permitir cerrar sin seleccionar
            // El usuario debe elegir un rol
          }}
        />
      </>
    )
  }

  // Si no hay usuario, mostramos el stack de autenticación
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
