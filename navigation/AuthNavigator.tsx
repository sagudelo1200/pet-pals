import React, { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { LoadingScreen } from '@/components/ui'
import { SeleccionarRolModal } from '@/components/comun/SeleccionarRolModal'
import { createStackNavigator } from '@react-navigation/stack'
import type { RolUsuario } from '@/models/Usuario'
import Bienvenida from '@/screens/auth/Bienvenida'
import Ingresar from '@/screens/auth/Ingresar'
import Registro from '@/screens/auth/Registro'
import VerificarEmail from '@/screens/auth/VerificarEmail'
import { AuthFlowParamList } from './types'

const Stack = createStackNavigator<AuthFlowParamList>()

interface Props {
  /** true cuando terminó la pantalla de carga mínima del arranque */
  cargaInicialLista: boolean
}

/**
 * Flujo de autenticación. No navega hacia las Apps de rol: el RootNavigator
 * las muestra cuando hay sesión, email verificado y `rolActivo`. Aquí solo se
 * decide qué pantallas de acceso aplican y se pide elegir rol si hay varios.
 */
const AuthNavigator: React.FC<Props> = ({ cargaInicialLista }) => {
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
  const [modalRolDescartado, setModalRolDescartado] = useState(false)

  // Fuente de verdad: insignias_verificacion del PerfilPublico (la cachea el
  // trigger validarOTP → actualizarInsignias)
  const emailVerificado =
    perfilPublico?.insignias_verificacion?.includes('EMAIL') ?? false
  const verificandoEmail = !!user && !emailVerificado

  const sesionLista =
    !!user && emailVerificado && !cargando && cargaInicialLista
  const listaRoles = Array.isArray(roles) ? roles : []
  const necesitaElegirRol = sesionLista && listaRoles.length > 1 && !rolActivo

  // Roles vacíos (doc de usuario recién creado): intentar recargar una vez
  useEffect(() => {
    if (!user) {
      retriedRef.current = false
      return
    }
    if (sesionLista && listaRoles.length === 0 && !retriedRef.current) {
      retriedRef.current = true
      void recargarPerfil?.()
    }
  }, [user, sesionLista, listaRoles.length, recargarPerfil])

  // Si deja de requerirse la selección, el modal vuelve a estar disponible
  useEffect(() => {
    if (!necesitaElegirRol) setModalRolDescartado(false)
  }, [necesitaElegirRol])

  const manejarSeleccionarRol = async (rolSeleccionado: RolUsuario) => {
    // Al confirmarse, el RootNavigator muestra la App del rol; si falla,
    // el modal sigue abierto para reintentar
    await cambiarRolActivo?.(rolSeleccionado)
  }

  // Stack de autenticación. Con sesión sin email verificado solo aplican
  // VerificarEmail (primera, para que sea la ruta inicial) y Registro (cambiar
  // correo); `navigationKey` descarta el historial al cambiar de fase.
  return (
    <View style={styles.container}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="Bienvenida"
      >
        {verificandoEmail ? (
          <Stack.Group navigationKey="verificacion">
            <Stack.Screen name="VerificarEmail" component={VerificarEmail} />
            <Stack.Screen name="Registro" component={Registro} />
          </Stack.Group>
        ) : (
          <Stack.Group navigationKey="acceso">
            <Stack.Screen name="Bienvenida" component={Bienvenida} />
            <Stack.Screen name="Ingresar" component={Ingresar} />
            <Stack.Screen name="Registro" component={Registro} />
          </Stack.Group>
        )}
      </Stack.Navigator>

      {/* LoadingScreen como overlay absoluto */}
      {(cargando || !cargaInicialLista) && (
        <View style={styles.overlay}>
          <LoadingScreen messageType="mascota" spinnerColor="#22A47C" />
        </View>
      )}

      {/* Modal de selección de rol (si múltiples roles) */}
      <SeleccionarRolModal
        visible={necesitaElegirRol && !modalRolDescartado}
        roles={listaRoles}
        onSelectRol={manejarSeleccionarRol}
        onClose={() => setModalRolDescartado(true)}
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
