import React, { useCallback, useState } from 'react'
import { Alert, Platform, Text, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Card, Icon } from '@/components/ui'
import Screen from '@/components/ui/Screen'
import { tErrorMaybe } from '@/services/i18n'
import { useAuth } from '@/context/AuthContext'
import { useRol } from '@/context/RolContext'
import { useCambiarRol } from '@/hooks/useCambiarRol'
import { useNavigation } from '@react-navigation/native'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'

const MiCuenta = () => {
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { cerrarSesion, cargando: cargandoAuth, user, profile } = useAuth()
  const { rolActivo, cambiarRolActivo, tieneMultiplesRoles, rolesDisponibles } = useRol()
  const { cambiarRol, cargando: cargandoRol, esTutor, esCuidador } = useCambiarRol()
  const { t } = useTranslation()
  const correo = user?.email ?? (profile as any)?.correo ?? '—'
  const nombre = user?.displayName ?? (profile as any)?.nombre ?? '—'

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
        '¡Éxito!',
        `Ahora eres ${rol}. ${rol === 'cuidador' ? 'Tu perfil público ha sido creado.' : ''}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Cambiar al nuevo rol activo
              void cambiarRolActivo(rol)
              // Reiniciar navegación
              navigation.reset({
                index: 0,
                routes: [{ name: rol === 'tutor' ? 'TutorApp' : 'CuidadorApp' }],
              })
            },
          },
        ]
      )
    } else {
      Alert.alert('Error', resultado.error || 'No se pudo cambiar el rol')
    }
  }

  const handleCambiarRolActivo = async (rol: 'tutor' | 'cuidador') => {
    await cambiarRolActivo(rol)
    // Reiniciar navegación
    navigation.reset({
      index: 0,
      routes: [{ name: rol === 'tutor' ? 'TutorApp' : 'CuidadorApp' }],
    })
  }

  return (
    <Screen style={[styles.container, { paddingBottom: TAB_BAR_HEIGHT }]}>
      <View style={styles.content}>
        <Text style={styles.text}>{t('perfil:titulo')}</Text>
        <Text style={styles.subText}>{t('perfil:descripcion')}</Text>
        <Text style={styles.nameText}>
          {t('perfil:nombre_label', { nombre })}
        </Text>
        <Text style={styles.emailText}>
          {t('perfil:sesion_label', { correo })}
        </Text>

        {/* Cambiar entre roles si tiene múltiples */}
        {tieneMultiplesRoles && (
          <View style={styles.rolesSection}>
            <Text style={styles.rolesSectionTitle}>Cambiar de Rol</Text>
            <Text style={styles.rolesSectionSubtitle}>
              Rol actual: {rolActivo === 'tutor' ? 'Tutor' : 'Cuidador'}
            </Text>

            <View style={styles.rolesButtons}>
              {rolesDisponibles.map((rol) => {
                if (rol === rolActivo || rol === 'admin') return null
                
                const configMap = {
                  tutor: {
                    icon: 'home' as const,
                    color: COLOR.PRIMARIO,
                    titulo: 'Tutor',
                  },
                  cuidador: {
                    icon: 'walking' as const,
                    color: COLOR.EXITO,
                    titulo: 'Cuidador',
                  },
                }
                
                const config = configMap[rol as 'tutor' | 'cuidador']
                if (!config) return null

                return (
                  <Button
                    key={rol}
                    title={`Cambiar a ${config.titulo}`}
                    variant={rol === 'tutor' ? 'primario' : 'exito'}
                    onPress={() => handleCambiarRolActivo(rol as 'tutor' | 'cuidador')}
                    style={{ marginBottom: 12 }}
                  />
                )
              })}
            </View>
          </View>
        )}

        {/* Activar nuevos roles */}
        {(!esTutor || !esCuidador) && (
          <View style={styles.rolesSection}>
            <Text style={styles.rolesSectionTitle}>Activar Nuevo Rol</Text>

            <View style={styles.rolesButtons}>
              {!esTutor && (
                <Card style={styles.roleCard}>
                  <Icon name="home" size={32} color={COLOR.PRIMARIO} />
                  <Text style={styles.roleCardTitle}>Tutor</Text>
                  <Text style={styles.roleCardDesc}>Solicita paseos para tus mascotas</Text>
                  <Button
                    title="Activar Tutor"
                    variant="primario"
                    onPress={() => handleActivarRol('tutor')}
                    disabled={cargandoRol}
                    loading={cargandoRol}
                    style={{ marginTop: 12 }}
                  />
                </Card>
              )}

              {!esCuidador && (
                <Card style={styles.roleCard}>
                  <Icon name="walking" size={32} color={COLOR.EXITO} />
                  <Text style={styles.roleCardTitle}>Cuidador</Text>
                  <Text style={styles.roleCardDesc}>Ofrece servicios de paseo</Text>
                  <Button
                    title="Activar Cuidador"
                    variant="exito"
                    onPress={() => handleActivarRol('cuidador')}
                    disabled={cargandoRol}
                    loading={cargandoRol}
                    style={{ marginTop: 12 }}
                  />
                </Card>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          style={styles.logoutButton as any}
          onPress={() => void handleLogout()}
          disabled={cargandoAuth}
          loading={cargandoAuth}
          variant="secundario"
          title={
            cargandoAuth ? t('perfil:cerrando_sesion') : t('perfil:cerrar_sesion')
          }
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLOR.BASE,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    width: '100%',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLOR.TEXTO,
  },
  subText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    color: COLOR.SUBTEXTO,
  },
  nameText: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
  },
  emailText: {
    marginTop: 16,
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  rolesSection: {
    marginTop: 32,
    width: '100%',
  },
  rolesSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 8,
  },
  rolesSectionSubtitle: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    marginBottom: 16,
  },
  rolesButtons: {
    gap: 16,
  },
  roleCard: {
    padding: 20,
    alignItems: 'center',
  },
  roleCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginTop: 12,
  },
  roleCardDesc: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    alignSelf: 'stretch',
    alignItems: 'center',
    padding: 20,
  },
  logoutButton: {
    alignSelf: 'center',
    minWidth: 220,
  },
})

export default MiCuenta
