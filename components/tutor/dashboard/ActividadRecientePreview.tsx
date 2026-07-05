import React from 'react'
import { View } from 'react-native'
import { Paseo } from '@/models/Paseo'
import { ItemHistorialPaseo } from '@/components/paseos/ItemHistorialPaseo'
import Spacer from '@/components/ui/Spacer'

interface ActividadRecientePreviewProps {
  paseos: Paseo[]
  onPresionar?: (_paseoId: string) => void
}

/**
 * Componente que muestra el historial de actividad reciente.
 * Reutiliza ItemHistorialPaseo para consistencia con la pantalla de Paseos.
 * Muestra últimos paseos completados/cancelados.
 * Memoizado para evitar re-renders cuando los paseos no cambian.
 */
const ActividadRecientePreviewComponent: React.FC<
  ActividadRecientePreviewProps
> = ({ paseos, onPresionar }) => {
  if (paseos.length === 0) {
    return null // EmptyState manejado en nivel superior
  }

  return (
    <View>
      {paseos.map((paseo, idx) => (
        <React.Fragment key={paseo.id}>
          <ItemHistorialPaseo
            paseo={paseo}
            onPress={() => onPresionar?.(paseo.id)}
          />
          {idx < paseos.length - 1 && <Spacer size={8} />}
        </React.Fragment>
      ))}
    </View>
  )
}

export const ActividadRecientePreview = React.memo(
  ActividadRecientePreviewComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.paseos.length === nextProps.paseos.length &&
      prevProps.paseos.every((p, idx) => p.id === nextProps.paseos[idx]?.id) &&
      prevProps.onPresionar === nextProps.onPresionar
    )
  }
)

// No styles needed for this component
// const styles = StyleSheet.create({})
