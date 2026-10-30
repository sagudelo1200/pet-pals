import React, { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { createStackNavigator } from '@react-navigation/stack'
import TutorTabNavigator from '@/navigation/TutorTabNavigator'
import CuidadorTabNavigator from '@/navigation/CuidadorTabNavigator'
import AdminTabNavigator from '@/navigation/AdminTabNavigator'
import AdminZonas from '@/screens/admin/AdminZonas'
import EditorZona from '@/screens/admin/EditorZona'
import DetalleHabilitacion from '@/screens/admin/DetalleHabilitacion'
import ExplorerTabNavigator from '@/navigation/ExplorerTabNavigator'
import ContadorTabNavigator from '@/navigation/ContadorTabNavigator'
import AuthNavigator from './AuthNavigator'
import DetalleMascota from '@/screens/tutor/DetalleMascota'
import { EdicionMascota } from '@/screens/tutor/EdicionMascota'
import PaseoActivo from '@/screens/tutor/PaseoActivo'
import PaseoFinalizado from '@/screens/tutor/PaseoFinalizado'
import ControlPaseo from '@/screens/cuidador/ControlPaseo'
import PerfilCuidador from '@/screens/cuidador/PerfilCuidador'
import MiHabilitacion from '@/screens/comun/MiHabilitacion'
import ExcepcionSemanal from '@/screens/cuidador/ExcepcionSemanal'
import CoberturaCuidador from '@/screens/cuidador/CoberturaCuidador'
import CoberturaManualCuidador from '@/screens/cuidador/CoberturaManualCuidador'
import { ChatScreen } from '@/screens/paseos/ChatScreen'
import CierrePaseo from '@/screens/cuidador/CierrePaseo'
import Notificaciones from '@/screens/comun/Notificaciones'
import PreferenciasNotificaciones from '@/screens/comun/PreferenciasNotificaciones'
import { NotificacionesPush } from '@/components/notificaciones/NotificacionesPush'
import { GlobalPaseoManager } from '@/components/tutor/GlobalPaseoManager'
import { LoadingScreen } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { AuthStackParamList } from './types'

// Stack principal con autenticación
const Stack = createStackNavigator<AuthStackParamList>()

// Duración mínima de la pantalla de carga al abrir la app
const CARGA_INICIAL_MS = 3000

/**
 * Navegador principal: la App visible se DERIVA de la sesión y de `rolActivo`.
 *
 * Solo se registran las pantallas del rol activo, así que no existe historial
 * hacia la App de otro rol (ni por "Atrás" ni por `navigate`). El ÚNICO punto
 * para cambiar de App es `cambiarRolActivo` en AuthContext: al cambiar el rol,
 * el grupo de pantallas se reemplaza y su historial se descarta.
 */
export default function RootNavigator(): React.ReactElement {
  const { t } = useTranslation('paseos')
  const { user, perfilPublico, rolActivo, activandoRol } = useAuth()
  const [cargaInicialLista, setCargaInicialLista] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setCargaInicialLista(true), CARGA_INICIAL_MS)
    return () => clearTimeout(timer)
  }, [])

  // Fuente de verdad del email verificado: insignias_verificacion del PerfilPublico
  const emailVerificado =
    perfilPublico?.insignias_verificacion?.includes('EMAIL') ?? false

  // Rol cuya App se muestra; null = flujo de autenticación / selección de rol
  const rolEnApp =
    user && emailVerificado && cargaInicialLista ? (rolActivo ?? null) : null

  // Mi habilitación se abre desde Mi Cuenta en cualquier App con cuenta de
  // persona (tutor, explorador, cuidador): quien aún no es cuidador la usa
  // para llegar a serlo, y quien lo es, para renovar
  const pantallaHabilitacion = (
    <Stack.Screen
      name="MiHabilitacion"
      component={MiHabilitacion}
      options={{ headerShown: false }}
    />
  )
  // El perfil de cuidador es el primer paso de la habilitación: quien aún no
  // tiene el rol también lo necesita
  const pantallasPerfilCuidador = (
    <>
      <Stack.Screen name="PerfilCuidador" component={PerfilCuidador} />
      <Stack.Screen
        name="ExcepcionSemanal"
        component={ExcepcionSemanal}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoberturaCuidador"
        component={CoberturaCuidador}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CoberturaManualCuidador"
        component={CoberturaManualCuidador}
        options={{ headerShown: false }}
      />
    </>
  )

  const renderGrupoRol = () => {
    switch (rolEnApp) {
      case 'admin':
        return (
          <Stack.Group navigationKey="admin">
            <Stack.Screen name="AdminApp" component={AdminTabNavigator} />
            <Stack.Screen
              name="AdminZonas"
              component={AdminZonas}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditorZona"
              component={EditorZona}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="DetalleHabilitacion"
              component={DetalleHabilitacion}
              options={{ headerShown: false }}
            />
          </Stack.Group>
        )
      case 'contador':
        return (
          <Stack.Group navigationKey="contador">
            <Stack.Screen name="ContadorApp" component={ContadorTabNavigator} />
          </Stack.Group>
        )
      case 'explorador':
        return (
          <Stack.Group navigationKey="explorador">
            <Stack.Screen name="ExplorerApp" component={ExplorerTabNavigator} />
            {pantallaHabilitacion}
            {pantallasPerfilCuidador}
          </Stack.Group>
        )
      case 'cuidador':
        return (
          <Stack.Group navigationKey="cuidador">
            <Stack.Screen name="CuidadorApp" component={CuidadorTabNavigator} />
            {pantallasPerfilCuidador}
            {pantallaHabilitacion}
            <Stack.Screen
              name="ControlPaseo"
              component={ControlPaseo}
              options={{
                headerShown: true,
                headerTitle: t('titulo_control'),
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="CierrePaseo"
              component={CierrePaseo}
              options={{
                headerShown: false,
                presentation: 'card',
                gestureEnabled: false,
              }}
            />
          </Stack.Group>
        )
      default:
        // tutor
        return (
          <Stack.Group navigationKey="tutor">
            <Stack.Screen name="TutorApp" component={TutorTabNavigator} />
            {pantallaHabilitacion}
            {pantallasPerfilCuidador}
            <Stack.Screen
              name="DetalleMascota"
              component={DetalleMascota}
              options={{
                presentation: 'transparentModal',
                headerShown: false,
                cardStyle: { backgroundColor: 'transparent' },
              }}
            />
            <Stack.Screen
              name="EdicionMascota"
              component={EdicionMascota}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="PaseoActivo"
              component={PaseoActivo}
              options={{
                headerShown: true,
                headerTitle: t('titulo_en_vivo'),
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
              name="Chat"
              component={ChatScreen}
              options={{
                headerShown: false,
                presentation: 'card',
              }}
            />
          </Stack.Group>
        )
    }
  }

  return (
    <>
      {/* Overlay global del tutor al finalizar un paseo (vive en la raíz para
          aparecer sobre CUALQUIER pantalla: PaseoActivo, Chat, tabs).
          Solo se monta con la App del tutor, que es la que registra PaseoFinalizado */}
      {rolEnApp === 'tutor' && <GlobalPaseoManager />}
      {rolEnApp !== null && <NotificacionesPush />}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {rolEnApp === null ? (
          <Stack.Screen name="Auth">
            {() => <AuthNavigator cargaInicialLista={cargaInicialLista} />}
          </Stack.Screen>
        ) : (
          <>
            {renderGrupoRol()}
            <Stack.Screen name="Notificaciones" component={Notificaciones} />
            <Stack.Screen
              name="PreferenciasNotificaciones"
              component={PreferenciasNotificaciones}
            />
          </>
        )}
      </Stack.Navigator>

      {/* Bloquea la interacción mientras se confirma un cambio de rol */}
      {rolEnApp !== null && activandoRol && (
        <View style={styles.overlay}>
          <LoadingScreen messageType="mascota" spinnerColor="#22A47C" />
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
})
