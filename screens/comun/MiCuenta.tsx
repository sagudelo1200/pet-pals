import React, { useCallback } from 'react'
import { Alert, Platform, Text, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Card, Icon, Avatar } from '@/components/ui'
import Screen from '@/components/ui/Screen'
import { tErrorMaybe } from '@/services/i18n'
import { useAuth } from '@/context/AuthContext'
import { useRol } from '@/context/RolContext'
import { useCambiarRol } from '@/hooks/useCambiarRol'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'

const MiCuenta = () => {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { cerrarSesion, cargando: cargandoAuth, user, profile } = useAuth()
  const { rolActivo, cambiarRolActivo, tieneMultiplesRoles, rolesDisponibles } =
    useRol()
  const { cambiarRol, cargando: cargandoRol } = useCambiarRol()
  const { t } = useTranslation()
  const correo = user?.email ?? (profile as any)?.correo ?? '—'
  const nombre = user?.displayName ?? (profile as any)?.nombre ?? '—'
  const foto = user?.photoURL ?? (profile as any)?.foto

  const TAB_BAR_HEIGHT =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom + 65, 85)
      : Math.max(insets.bottom + 60, 75)

  const handleLogout = useCallback(async () => {
    const result = await cerrarSesion()
    if (result.success) {
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })
    } else {
      Alert.alert(
        t('perfil:error_cerrar_sesion_titulo'),
        tErrorMaybe(result.error, t('comun:intenta_nuevamente'))
      )
    }
  }, [cerrarSesion, navigation, t])

  const handleActivarRol = async (
    rol: 'tutor' | 'cuidador' | 'explorador' | 'admin'
  ) => {
    const resultado = await cambiarRol(rol)

    if (resultado.success) {
      Alert.alert(
        t('perfil:exito'),
        t('perfil:rol_activado', {
          rol,
          extra: rol === 'cuidador' ? t('perfil:perfil_publico_creado') : '',
        }),
        [
          {
            text: 'OK',
            onPress: () => {
              // Cambiar al nuevo rol activo
              void cambiarRolActivo(rol)
              // Navegar manteniendo la vista en MiCuenta
              const targetApp =
                rol === 'tutor'
                  ? 'TutorApp'
                  : rol === 'cuidador'
                    ? 'CuidadorApp'
                    : rol === 'explorador'
                      ? 'ExplorerApp'
                      : rol === 'admin'
                        ? 'AdminApp'
                        : 'TutorApp'
              navigation.navigate(targetApp as any, {
                screen: 'MiCuenta',
              })

              // Si es cuidador nuevo, sugerir editar perfil
              if (rol === 'cuidador') {
                setTimeout(() => {
                  navigation.navigate('PerfilCuidador')
                }, 500)
              }
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

  const handleCambiarRolActivo = async (
    rol: 'tutor' | 'cuidador' | 'explorador' | 'admin'
  ) => {
    await cambiarRolActivo(rol)
    // Navegar manteniendo la vista en MiCuenta
    const targetApp =
      rol === 'tutor'
        ? 'TutorApp'
        : rol === 'cuidador'
          ? 'CuidadorApp'
          : rol === 'explorador'
            ? 'ExplorerApp'
            : rol === 'admin'
              ? 'AdminApp'
              : 'TutorApp'
    navigation.navigate(targetApp as any, {
      screen: 'MiCuenta',
    })
  }

  return (
    <Screen style={[styles.container, { paddingBottom: TAB_BAR_HEIGHT }]}>
      <View style={styles.scrollContent}>
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
                name={
                  rolActivo === 'cuidador'
                    ? 'walking'
                    : rolActivo === 'explorador'
                      ? 'map-marked-alt'
                      : rolActivo === 'admin'
                        ? 'shield-alt'
                        : 'paw'
                }
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
                      : t('perfil:tutor')}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Acción rápida para cuidador */}
          {rolActivo === 'cuidador' && (
            <Button
              title={t('perfil:perfil_publico')}
              icon="id-card"
              variant="secundario"
              size="sm"
              style={styles.quickAction}
              onPress={() => navigation.navigate('PerfilCuidador')}
            />
          )}

          {/* Sección de Roles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('perfil:gestionar_roles')}
            </Text>

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
                    onPress={() =>
                      rol !== rolActivo && handleCambiarRolActivo(rol as any)
                    }
                  >
                    <View style={styles.roleCardContent}>
                      <Icon
                        name={
                          rol === 'cuidador'
                            ? 'walking'
                            : rol === 'explorador'
                              ? 'map-marked-alt'
                              : rol === 'admin'
                                ? 'shield-alt'
                                : 'paw'
                        }
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
                  onPress={() => handleActivarRol('cuidador')}
                  loading={cargandoRol}
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

          {/* Botón Cerrar Sesión */}
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
    flex: 1,
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
    flex: 1,
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
  rolesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  rolesPromoContainer: {
    gap: 8,
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
  logoutButton: {
    marginTop: 'auto',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLOR.ERROR,
  },
})

export default MiCuenta
