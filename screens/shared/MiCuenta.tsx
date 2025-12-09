import React, { useCallback } from 'react'
import {
  Alert,
  Platform,
  Text,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native'
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
  const { cambiarRol, cargando: cargandoRol, esCuidador } = useCambiarRol()
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
        tErrorMaybe(result.error, t('comun:intentaNuevamente'))
      )
    }
  }, [cerrarSesion, navigation, t])

  const handleActivarRol = async (rol: 'tutor' | 'cuidador') => {
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
              navigation.navigate(
                rol === 'tutor' ? 'TutorApp' : 'CuidadorApp',
                {
                  screen: 'MiCuenta',
                }
              )
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

  const handleCambiarRolActivo = async (rol: 'tutor' | 'cuidador') => {
    await cambiarRolActivo(rol)
    // Navegar manteniendo la vista en MiCuenta
    navigation.navigate(rol === 'tutor' ? 'TutorApp' : 'CuidadorApp', {
      screen: 'MiCuenta',
    })
  }

  return (
    <Screen
      style={[styles.container, { paddingBottom: TAB_BAR_HEIGHT }]}
      includeTopInset={false}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Premium con Gradiente */}
        <LinearGradient
          colors={[COLOR.PRIMARIO, COLOR.ENFASIS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
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
                name={rolActivo === 'cuidador' ? 'user-md' : 'user'}
                size={14}
                color="#FFF"
                containerStyle={{ marginRight: 6 }}
              />
              <Text style={styles.roleText}>
                {rolActivo === 'cuidador'
                  ? t('perfil:cuidador')
                  : t('perfil:tutor')}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Sección de Acciones Principales */}
          <View style={styles.actionsContainer}>
            {rolActivo === 'cuidador' && (
              <Card
                style={styles.actionCard}
                onPress={() => navigation.navigate('PerfilCuidador')}
              >
                <View style={styles.actionRow}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: COLOR.INACTIVO },
                    ]}
                  >
                    <Icon name="id-card" size={20} color={COLOR.PRIMARIO} />
                  </View>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>
                      {t('perfil:perfil_publico')}
                    </Text>
                    <Text style={styles.actionDesc}>
                      {t('perfil:gestiona_info_visible')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={COLOR.SUBTEXTO} />
                </View>
              </Card>
            )}

            {/* TODO: Agregar más opciones como "Mis Mascotas" para tutor, etc. */}
          </View>

          {/* Sección de Roles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('perfil:gestionar_roles')}
            </Text>

            {tieneMultiplesRoles ? (
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
                        name={rol === 'cuidador' ? 'walking' : 'paw'}
                        size={24}
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
            ) : (
              <Card style={styles.promoCard}>
                <View style={styles.promoContent}>
                  <Icon
                    name={esCuidador ? 'paw' : 'walking'}
                    size={32}
                    color={COLOR.PRIMARIO}
                  />
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.promoTitle}>
                      {esCuidador
                        ? t('perfil:tienes_mascota')
                        : t('perfil:quieres_ser_cuidador')}
                    </Text>
                    <Text style={styles.promoDesc}>
                      {esCuidador
                        ? t('perfil:activa_tutor_desc')
                        : t('perfil:gana_dinero_desc')}
                    </Text>
                  </View>
                </View>
                <Button
                  title={
                    esCuidador
                      ? t('perfil:activar_modo_tutor')
                      : t('perfil:convertirme_cuidador')
                  }
                  variant="contorno"
                  size="sm"
                  style={{ marginTop: 16 }}
                  onPress={() =>
                    handleActivarRol(esCuidador ? 'tutor' : 'cuidador')
                  }
                  loading={cargandoRol}
                />
              </Card>
            )}
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

          <Text style={styles.versionText}>
            {t('perfil:version', { version: '1.0.0' })}
          </Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    marginTop: -20, // Overlap con el header
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: COLOR.BLOQUE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 16,
    marginLeft: 4,
  },
  rolesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
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
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
  },
  activeRoleText: {
    color: COLOR.PRIMARIO,
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLOR.PRIMARIO,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: COLOR.BLOQUE,
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  promoDesc: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    lineHeight: 20,
  },
  logoutButton: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLOR.ERROR,
    flexDirection: 'row',
  },
  versionText: {
    textAlign: 'center',
    color: COLOR.SUBTEXTO,
    fontSize: 12,
    opacity: 0.6,
  },
})

export default MiCuenta
