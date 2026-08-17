import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { BottomSheet, Icon } from '@/components/ui'
import type { RolUsuario } from '@/models/Usuario'

interface Props {
  visible: boolean
  roles: RolUsuario[]
  onSelectRol: (_rol: RolUsuario) => void
  onClose: () => void
  processing?: boolean
}

const ROL_CONFIG = {
  tutor: {
    icon: 'home' as const,
    color: COLOR.PRIMARIO,
    tituloKey: 'comun:rol_tutor_titulo',
    descripcionKey: 'comun:rol_tutor_descripcion',
  },
  cuidador: {
    icon: 'walking' as const,
    color: COLOR.EXITO,
    tituloKey: 'comun:rol_cuidador_titulo',
    descripcionKey: 'comun:rol_cuidador_descripcion',
  },
  explorador: {
    icon: 'map-marked-alt' as const,
    color: COLOR.ENFASIS,
    tituloKey: 'comun:rol_explorador_titulo',
    descripcionKey: 'comun:rol_explorador_descripcion',
  },
  admin: {
    icon: 'ghost' as const,
    color: COLOR.INFO,
    tituloKey: 'comun:rol_admin_titulo',
    descripcionKey: 'comun:rol_admin_descripcion',
  },
}

export const SeleccionarRolModal: React.FC<Props> = ({
  visible,
  roles,
  onSelectRol,
  onClose,
  processing = false,
}) => {
  const { t } = useTranslation()

  return (
    <BottomSheet visible={visible} onClose={onClose} closeable={!processing}>
      <View style={styles.container}>
        <Text style={styles.titulo}>{t('comun:seleccionar_rol_titulo')}</Text>
        <Text style={styles.subtitulo}>
          {t('comun:seleccionar_rol_subtitulo')}
        </Text>

        <View style={styles.rolesContainer}>
          {roles.map(_rol => {
            const config = ROL_CONFIG[_rol]
            if (!config) return null

            return (
              <TouchableOpacity
                key={_rol}
                style={[styles.rolCard, processing && styles.rolCardDisabled]}
                onPress={() => !processing && onSelectRol(_rol)}
                activeOpacity={processing ? 1 : 0.7}
                disabled={processing}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${config.color}15` },
                  ]}
                >
                  <Icon name={config.icon} size={32} color={config.color} />
                </View>
                <View style={styles.rolInfo}>
                  <Text style={styles.rolTitulo}>{t(config.tituloKey)}</Text>
                  <Text style={styles.rolDescripcion}>
                    {t(config.descripcionKey)}
                  </Text>
                </View>
                {processing ? (
                  <ActivityIndicator size="small" color={COLOR.PRIMARIO} />
                ) : (
                  <Icon name="chevron-right" size={20} color={COLOR.SUBTEXTO} />
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR.TEXTO,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
    marginBottom: 24,
  },
  rolesContainer: {
    gap: 12,
  },
  rolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.BORDE,
  },
  rolCardDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rolInfo: {
    flex: 1,
  },
  rolTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  rolDescripcion: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
  },
})
