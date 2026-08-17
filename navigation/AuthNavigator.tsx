import React, { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { LoadingScreen } from '@/components/ui'
import { SeleccionarRolModal } from '@/components/comun/SeleccionarRolModal'
import { useNavigation } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import type { RolUsuario } from '@/models/Usuario'
import Bienvenida from '@/screens/auth/Bienvenida'
import Ingresar from '@/screens/auth/Ingresar'
import Registro from '@/screens/auth/Registro'
import VerificarEmail from '@/screens/auth/VerificarEmail'
import { AuthFlowParamList } from './types'

const Stack = createStackNavigator<AuthFlowParamList>()

const AuthNavigator: React.FC = () => {
  const {
    user,
    cargando,
    roles,
    perfilPublico,
    recargarPerfil,
    rolActivo,
    cambiarRolActivo,
    activandoRol,
  } = useAuth()
  const retriedRef = React.useRef(false)
  const navigatedRef = React.useRef<string | null>(null)
  const navigation = useNavigation<any>()
  const [minDelayPassed, setMinDelayPassed] = useState(false)
  const initialDelayRef = React.useRef(true)
  const [mostrarSeleccionarRol, setMostrarSeleccionarRol] = useState(false)

  // Forzar pantalla de carga mínima al inicio (3s)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinDelayPassed(true)
      initialDelayRef.current = false
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // ÚNICO EFECTO: Orquesta todo el flujo de navegación de autenticación
  useEffect(() => {
    const pendingTimeouts: number[] = []

    // Si no hay usuario, no hacer nada (mostrar login)
    if (!user) {
      navigatedRef.current = null
      return () => {
        pendingTimeouts.forEach(id => clearTimeout(id))
      }
    }

    // ✅ CRÍTICO: Si email no está verificado (según insignias_verificacion),
    // navegar INMEDIATAMENTE a VerificarEmail
    //
    // Fuente de verdad: insignias_verificacion array en PerfilPublico
    // Se cachea automáticamente por el trigger validarOTP → actualizarInsignias
    const emailVerificado =
      perfilPublico?.insignias_verificacion?.includes('EMAIL') ?? false

    if (!emailVerificado) {
      const targetScreen = 'VerificarEmail'
      if (navigatedRef.current !== targetScreen) {
        const timeoutId = setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [
              {
                name: targetScreen as never,
              },
            ],
          })
        }, 0)
        pendingTimeouts.push(timeoutId)
        navigatedRef.current = targetScreen
      }
      return () => {
        pendingTimeouts.forEach(id => clearTimeout(id))
      }
    }

    // Luego de verificar email, esperar a que termine carga y delay
    if (cargando || !minDelayPassed) {
      return () => {
        pendingTimeouts.forEach(id => clearTimeout(id))
      }
    }

    // PASO 2: Email está verificado, pero roles aún no están cargados
    if (!Array.isArray(roles)) {
      return () => {
        pendingTimeouts.forEach(id => clearTimeout(id))
      }
    }

    // PASO 3: Roles vacíos - intentar recargar una vez
    if (roles.length === 0) {
      if (!retriedRef.current) {
        retriedRef.current = true
        void recargarPerfil?.()
      }
      return () => {
        pendingTimeouts.forEach(id => clearTimeout(id))
      }
    }

    // PASO 4: Múltiples roles - mostrar modal de selección SOLO si rolActivo no está establecido
    if (roles.length > 1 && !rolActivo) {
      setMostrarSeleccionarRol(true)
      return () => {
        pendingTimeouts.forEach(id => clearTimeout(id))
      }
    }

    // PASO 5: Esperar a que rolActivo esté listo (para rol único o después de selección)
    if (rolActivo === null) {
      return () => {
        pendingTimeouts.forEach(id => clearTimeout(id))
      }
    }

    // PASO 6: rolActivo está listo - navegar a app
    const rolParaNavegar = rolActivo

    if (!rolParaNavegar) {
      // Sin rol, usar TutorApp por defecto
      const target = 'TutorApp'
      if (navigatedRef.current !== target) {
        const timeoutId = setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: target as never }] })
        }, 0)
        pendingTimeouts.push(timeoutId)
        navigatedRef.current = target
      }
      return () => {
        pendingTimeouts.forEach(id => clearTimeout(id))
      }
    }

    // Determinar destino según rol
    const target =
      rolParaNavegar === 'admin'
        ? 'AdminApp'
        : rolParaNavegar === 'cuidador'
          ? 'CuidadorApp'
          : rolParaNavegar === 'explorador'
            ? 'ExplorerApp'
            : 'TutorApp'

    // Navegar solo si el destino cambió
    if (navigatedRef.current !== target) {
      const timeoutId = setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: target as never }] })
      }, 0)
      pendingTimeouts.push(timeoutId)
      navigatedRef.current = target
    }

    return () => {
      pendingTimeouts.forEach(id => clearTimeout(id))
    }
  }, [
    user?.uid,
    perfilPublico?.insignias_verificacion,
    cargando,
    roles,
    rolActivo,
    navigation,
    recargarPerfil,
    minDelayPassed,
  ])

  const manejarSeleccionarRol = async (rolSeleccionado: RolUsuario) => {
    try {
      await cambiarRolActivo(rolSeleccionado)
      setMostrarSeleccionarRol(false)
      // El efecto de navegación detectará el cambio en rolActivo y navegará
    } catch (_error) {
      // Error al cambiar rol, mantener modal abierto
    }
  }

  // Stack de autenticación (Bienvenida, Ingresar, Registro, VerificarEmail)
  // ✅ SIEMPRE renderizado para que navegación funcione durante carga
  return (
    <View style={styles.container}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="Bienvenida"
      >
        <Stack.Screen name="Bienvenida" component={Bienvenida} />
        <Stack.Screen name="Ingresar" component={Ingresar} />
        <Stack.Screen name="Registro" component={Registro} />
        <Stack.Screen name="VerificarEmail" component={VerificarEmail} />
      </Stack.Navigator>

      {/* LoadingScreen como overlay absoluto */}
      {(cargando || (!minDelayPassed && initialDelayRef.current)) && (
        <View style={styles.overlay}>
          <LoadingScreen messageType="mascota" spinnerColor="#22A47C" />
        </View>
      )}

      {/* Modal de selección de rol (si múltiples roles) */}
      <SeleccionarRolModal
        visible={mostrarSeleccionarRol}
        roles={roles ?? []}
        onSelectRol={manejarSeleccionarRol}
        onClose={() => setMostrarSeleccionarRol(false)}
        processing={activandoRol}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
})

export default AuthNavigator
