import React from 'react'
import { Text, TextInput } from 'react-native'
import { COLOR } from '@/constants'
import { MAX_MOTIVO } from '@/functions/src/compartido/versionables'
import { estilosAdmin } from './estilosAdmin'

interface Props {
  value: string
  onChange: (_motivo: string) => void
}

/** Motivo obligatorio de una publicación (queda en el historial). */
export const CampoMotivo: React.FC<Props> = ({ value, onChange }) => (
  <>
    <Text style={estilosAdmin.label}>Motivo del cambio</Text>
    <TextInput
      style={estilosAdmin.input}
      value={value}
      onChangeText={onChange}
      placeholder="Ej: ajuste de precios de temporada"
      placeholderTextColor={COLOR.SUBTEXTO}
      maxLength={MAX_MOTIVO}
    />
    <Text style={estilosAdmin.ayudaCampo}>
      Queda registrado en el historial de versiones
    </Text>
  </>
)
