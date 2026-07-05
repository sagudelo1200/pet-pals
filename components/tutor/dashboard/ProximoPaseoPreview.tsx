import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Paseo } from '@/models/Paseo'
import TarjetaPaseo from '@/components/ui/TarjetaPaseo'
import Button from '@/components/ui/Button'
import Spacer from '@/components/ui/Spacer'
import { useTranslation } from 'react-i18next'

interface ProximoPaseoPreviewProps {
  paseo: Paseo
  onVerDetalles: () => void
  onContactar: () => void
}

/**
 * Componente que muestra el próximo paseo del tutor.
 * Reutiliza TarjetaPaseo para consistencia visual.
 * Incluye botones de acción (Ver detalles, Contactar).
 * Memoizado para evitar re-renders innecesarios.
 */
const ProximoPaseoPreviewComponent: React.FC<ProximoPaseoPreviewProps> = ({
  paseo,
  onVerDetalles,
  onContactar,
}) => {
  const { t } = useTranslation()

  return (
    <View>
      <TarjetaPaseo paseo={paseo} onPress={onVerDetalles} />

      <Spacer size={12} />

      <View style={styles.acciones}>
        <Button
          title={t('paseos:acciones.ver_detalles')}
          onPress={onVerDetalles}
          style={{ flex: 1 }}
        />

        <Spacer horizontal size={8} />

        <Button
          title={t('paseos:acciones.contactar')}
          variant="secundario"
          onPress={onContactar}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  )
}

export const ProximoPaseoPreview = React.memo(
  ProximoPaseoPreviewComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.paseo?.id === nextProps.paseo?.id &&
      prevProps.onVerDetalles === nextProps.onVerDetalles &&
      prevProps.onContactar === nextProps.onContactar
    )
  }
)

const styles = StyleSheet.create({
  acciones: {
    flexDirection: 'row',
    gap: 8,
  },
})
