import React from 'react'
import { TouchableOpacity, ActivityIndicator } from 'react-native'
import { Avatar } from '@/components/ui'
import { ModalPerfilCuidador } from '@/components/cuidador/ModalPerfilCuidador'
import { useCuidadorPerfilModal } from '@/hooks/useCuidadorPerfilModal'
import { COLOR } from '@/constants'

interface CuidadorAvatarButtonProps {
  /**
   * ID del cuidador en Firestore
   */
  cuidadorId: string
  /**
   * URL de la foto del cuidador (para mostrar antes de cargar)
   */
  foto?: string | null
  /**
   * Nombre del cuidador (fallback si no hay foto)
   */
  nombre: string
  /**
   * Tamaño del avatar (default: 56)
   */
  size?: number
  /**
   * Callback opcional cuando se abre el perfil
   */
  onPerfilAbierto?: () => void
  /**
   * Callback opcional cuando se cierra el perfil
   */
  onPerfilCerrado?: () => void
}

/**
 * Componente reutilizable que muestra un avatar de cuidador clickeable
 * Al tocar, carga el perfil completo y lo muestra en un modal
 *
 * Uso:
 * ```tsx
 * <CuidadorAvatarButton
 *   cuidadorId="uid123"
 *   foto={fotoUrl}
 *   nombre="Juan"
 * />
 * ```
 */
export function CuidadorAvatarButton({
  cuidadorId,
  foto,
  nombre,
  size = 56,
  onPerfilAbierto,
  onPerfilCerrado,
}: CuidadorAvatarButtonProps) {
  const { perfil, loading, visible, cargarPerfil, cerrar } =
    useCuidadorPerfilModal()

  const handlePress = async () => {
    await cargarPerfil(cuidadorId)
    onPerfilAbierto?.()
  }

  const handleCerrar = () => {
    cerrar()
    onPerfilCerrado?.()
  }

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        disabled={loading}
        activeOpacity={0.7}
        accessibilityLabel={`${nombre} - ${!loading ? 'Ver perfil del cuidador' : 'Cargando perfil'}`}
      >
        <Avatar uri={foto} name={nombre} size={size} />
        {loading && (
          <ActivityIndicator
            size={size / 2}
            color={COLOR.PRIMARIO}
            style={{
              position: 'absolute',
              top: size / 4,
              left: size / 4,
              right: size / 4,
              bottom: size / 4,
            }}
          />
        )}
      </TouchableOpacity>

      <ModalPerfilCuidador
        visible={visible}
        perfil={perfil}
        loading={loading}
        onCerrar={handleCerrar}
      />
    </>
  )
}
