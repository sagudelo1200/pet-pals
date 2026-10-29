import React from 'react'
import { Text, TextInput } from 'react-native'
import { COLOR } from '@/constants'
import { MAX_MOTIVO } from '@/functions/src/compartido/versionables'
import { estilosAdmin } from './estilosAdmin'
import { useTranslation } from 'react-i18next'

interface Props {
  value: string
  onChange: (_motivo: string) => void
}

/** Motivo obligatorio de una publicación (queda en el historial). */
export const CampoMotivo: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation('admin')
  return (
    <>
      <Text style={estilosAdmin.label}>{t('motivo.titulo')}</Text>
      <TextInput
        style={estilosAdmin.input}
        value={value}
        onChangeText={onChange}
        placeholder={t('motivo.placeholder')}
        placeholderTextColor={COLOR.SUBTEXTO}
        maxLength={MAX_MOTIVO}
      />
      <Text style={estilosAdmin.ayudaCampo}>{t('motivo.ayuda')}</Text>
    </>
  )
}
