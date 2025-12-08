import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import { BottomSheet, Icon } from '@/components/ui'
import type { RolUsuario } from '@/models/Usuario'

interface Props {
  visible: boolean
  roles: RolUsuario[]
  onSelectRol: (rol: RolUsuario) => void
  onClose: () => void
}

const ROL_CONFIG = {
  tutor: {
    icon: 'home' as const,
    color: COLOR.PRIMARIO,
    titulo: 'Tutor',
    descripcion: 'Solicita paseos para tus mascotas',
  },
  cuidador: {
    icon: 'walking' as const,
    color: COLOR.EXITO,
    titulo: 'Cuidador',
    descripcion: 'Ofrece servicios de paseo',
  },
  admin: {
    icon: 'shield' as const,
    color: COLOR.INFO,
    titulo: 'Administrador',
    descripcion: 'Gestiona la plataforma',
  },
}

export const SeleccionarRolModal: React.FC<Props> = ({
  visible,
  roles,
  onSelectRol,
  onClose,
}) => {
  const { t } = useTranslation()

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.titulo}>
          {t('comun:seleccionar_rol_titulo', 'Selecciona tu rol')}
        </Text>
        <Text style={styles.subtitulo}>
          {t('comun:seleccionar_rol_subtitulo', 'Tienes acceso a múltiples roles')}
        </Text>

        <View style={styles.rolesContainer}>
          {roles.map((rol) => {
            const config = ROL_CONFIG[rol]
            if (!config) return null

            return (
              <TouchableOpacity
                key={rol}
                style={styles.rolCard}
                onPress={() => onSelectRol(rol)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
                  <Icon name={config.icon} size={32} color={config.color} />
                </View>
                <View style={styles.rolInfo}>
                  <Text style={styles.rolTitulo}>{config.titulo}</Text>
                  <Text style={styles.rolDescripcion}>{config.descripcion}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={COLOR.SUBTEXTO} />
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
