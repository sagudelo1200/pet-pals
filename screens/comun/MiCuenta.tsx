import React, { useCallback } from 'react'
import { Alert, Text, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Card, Icon, Avatar } from '@/components/ui'
import Screen from '@/components/ui/Screen'
import { tErrorMaybe } from '@/services/i18n'
import { useAuth } from '@/context/AuthContext'
import { useCambiarRol } from '@/hooks/useCambiarRol'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import { PanelPrivacidadConsentimientos } from '@/components/consentimientos/PanelPrivacidadConsentimientos'
import { ICONO_POR_ROL } from '@/navigation/roles'
import type { RolUsuario } from '@/models/Usuario'

const MiCuenta = () => {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const {
    cerrarSesion,
    cargando: cargandoAuth,
    user,
    profile,
    rolActivo,
    cambiarRolActivo,
    activandoRol,
    tieneMultiplesRoles,
    rolesDisponibles,
  } = useAuth()
  const { cambiarRol, cargando: cargandoRol } = useCambiarRol()
  const { t } = useTranslation()
  const correo = user?.email ?? (profile as any)?.correo ?? '—'
  const nombre = user?.displayName ?? (profile as any)?.nombre ?? '—'
  const foto = user?.photoURL ?? (profile as any)?.foto

  // Al cerrar sesión el RootNavigator vuelve solo al flujo de Auth
  const handleLogout = useCallback(async () => {
    const result = await cerrarSesion()
    if (!result.success) {
      Alert.alert(
        t('perfil:error_cerrar_sesion_titulo'),
        tErrorMaybe(result.error, t('comun:intenta_nuevamente'))
      )
    }
  }, [cerrarSesion, t])

  // Único punto de cambio de App: cambiarRolActivo. Si se confirma, el
  // RootNavigator reemplaza la App visible (esta pantalla se desmonta).
  const handleCambiarRolActivo = async (rol: RolUsuario) => {
    if (activandoRol || rol === rolActivo) return
    const confirmado = await cambiarRolActivo(rol)
    if (!confirmado) {
      Alert.alert(t('perfil:error'), t('perfil:error_cambiar_rol'))
    }
  }

  // Ser cuidador no se activa con un botón: pasa por la habilitación (perfil y
  // documentos revisados). Al empezar se abre de una vez la edición del perfil
  const abrirHabilitacion = (abrirPerfil: boolean) =>
    navigation.navigate('MiHabilitacion', { servicio: 'paseo', abrirPerfil })

  const handleActivarRol = async (rol: RolUsuario) => {
    const resultado = await cambiarRol(rol)

    if (resultado.success) {
      Alert.alert(
        t('perfil:exito'),
        t('perfil:rol_activado', { rol }),
        [
          {
            text: 'OK',
            onPress: () => {
              void handleCambiarRolActivo(rol)
            },
          },
        ]
      )
    } else {
      Alert.alert(
        t('perfil:error'),
        resultado.error || t('perfil:error_cambiar_rol')
      )
    }
  }

  return (
    <Screen
      scroll={true}
      scrollProps={{ showsVerticalScrollIndicator: false }}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {/* Header Grande con Gradiente */}
      <LinearGradient
        colors={[COLOR.PRIMARIO, COLOR.ENFASIS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.profileHeader}>
          <Avatar
            uri={foto}
            name={nombre}
            size={80}
            backgroundColor="rgba(255,255,255,0.2)"
            color="#FFF"
            containerStyle={styles.avatar}
          />
          <Text style={styles.nameText}>{nombre}</Text>
          <Text style={styles.emailText}>{correo}</Text>
          <View style={styles.roleBadge}>
            <Icon
              name={ICONO_POR_ROL[rolActivo ?? 'tutor']}
              size={14}
              color="#FFF"
              containerStyle={{ marginRight: 6 }}
            />
            <Text style={styles.roleText}>
              {rolActivo === 'cuidador'
                ? t('perfil:cuidador')
                : rolActivo === 'explorador'
                  ? 'Explorador'
                  : rolActivo === 'admin'
                    ? 'Admin'
                    : rolActivo === 'contador'
                      ? t('comun:rol_contador_titulo')
                      : t('perfil:tutor')}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Acciones rápidas para cuidador */}
        {rolActivo === 'cuidador' && (
          <>
            <Button
              title={t('perfil:perfil_publico')}
              icon="id-card"
              variant="secundario"
              size="sm"
              style={styles.quickAction}
              onPress={() => navigation.navigate('PerfilCuidador')}
            />
            <Button
              title={t('cuidador:habilitacion.titulo')}
              icon="clipboard-check"
              variant="secundario"
              size="sm"
              style={styles.quickAction}
              onPress={() => abrirHabilitacion(false)}
            />
          </>
        )}

        {/* Sección de Roles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('perfil:gestionar_roles')}</Text>

          {/* Selector de roles existentes (si tienes múltiples) */}
          {tieneMultiplesRoles && (
            <View style={styles.rolesContainer}>
              {rolesDisponibles.map(rol => (
                <Card
                  key={rol}
                  style={[
                    styles.roleCard,
                    rolActivo === rol && styles.activeRoleCard,
                  ]}
                  onPress={() => void handleCambiarRolActivo(rol)}
                >
                  <View style={styles.roleCardContent}>
                    <Icon
                      name={ICONO_POR_ROL[rol]}
                      size={20}
                      color={
                        rolActivo === rol ? COLOR.PRIMARIO : COLOR.SUBTEXTO
                      }
                    />
                    <Text
                      style={[
                        styles.roleCardTitle,
                        rolActivo === rol && styles.activeRoleText,
                      ]}
                    >
                      {rol === 'cuidador'
                        ? t('perfil:modo_cuidador')
                        : rol === 'explorador'
                          ? t('perfil:modo_explorador')
                          : rol === 'admin'
                            ? 'Modo Admin'
                            : rol === 'contador'
                              ? t('comun:rol_contador_titulo')
                              : t('perfil:modo_tutor')}
                    </Text>
                    {rolActivo === rol && (
                      <View style={styles.activeIndicator}>
                        <Icon name="check" size={12} color="#FFF" />
                      </View>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* Opciones para activar roles nuevos */}
          <View style={styles.rolesPromoContainer}>
            {!rolesDisponibles.includes('tutor') && (
              <Button
                title={t('perfil:activar_modo_tutor')}
                icon="paw"
                variant="contorno"
                size="sm"
                onPress={() => handleActivarRol('tutor')}
                loading={cargandoRol}
              />
            )}

            {!rolesDisponibles.includes('cuidador') && (
              <Button
                title={t('perfil:convertirme_cuidador')}
                icon="walking"
                variant="contorno"
                size="sm"
                onPress={() => abrirHabilitacion(true)}
              />
            )}

            {!rolesDisponibles.includes('explorador') && (
              <Button
                title={t('perfil:activar_modo_explorador')}
                icon="map-marked-alt"
                variant="contorno"
                size="sm"
                onPress={() => handleActivarRol('explorador')}
                loading={cargandoRol}
              />
            )}
          </View>
        </View>

        {/* Sección Privacidad y Autorizaciones */}
        <View style={[styles.section, styles.consentimientosSection]}>
          <Text style={styles.sectionTitle}>{t('comun:privacidad.titulo')}</Text>
          <Text style={styles.sectionDescription}>
            {t('comun:privacidad.descripcion')}
          </Text>
          <PanelPrivacidadConsentimientos />
        </View>

        <View
          style={[
            styles.logoutButtonContainer,
            { marginBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <Button
            title={t('perfil:cerrar_sesion')}
            variant="ghost"
            textStyle={{ color: COLOR.ERROR }}
            style={styles.logoutButton}
            onPress={handleLogout}
            loading={cargandoAuth}
            icon="sign-out-alt"
          />
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.BASE,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingBottom: 40,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatar: {
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  quickAction: {
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    marginBottom: 12,
    lineHeight: 18,
  },
  rolesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  rolesPromoContainer: {
    gap: 8,
  },
  logoutButtonContainer: {
    marginTop: 20,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: COLOR.ERROR,
  },
  roleCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLOR.BLOQUE,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeRoleCard: {
    borderColor: COLOR.PRIMARIO,
    backgroundColor: COLOR.SECUNDARIO,
  },
  roleCardContent: {
    alignItems: 'center',
    position: 'relative',
  },
  roleCardTitle: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
  },
  activeRoleText: {
    color: COLOR.PRIMARIO,
  },
  activeIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLOR.PRIMARIO,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consentimientosSection: {
    paddingHorizontal: 0,
  },
})

export default MiCuenta
