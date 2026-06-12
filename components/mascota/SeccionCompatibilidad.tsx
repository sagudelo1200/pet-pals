import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import Card from '@/components/ui/Card'
import { SectionHeaderWithAssistant } from '@/components/mascota/SectionHeaderWithAssistant'
import { CardAtributo } from '@/components/mascota/CardAtributo'
import type { Mascota } from '@/models/Mascota'
import { atributosCompatibilidad } from '@/logic/mascotas/compatibilidadAsistente'

interface SeccionCompatibilidadProps {
  mascota: Mascota
  onOpenAssistant?: () => void
}

type CompatibilidadValue = any | undefined

/**
 * Sección de compatibilidad de paseo del perfil de mascota.
 * Muestra cards en grid de 2 columnas y botón para abrir asistente guiado.
 */
export const SeccionCompatibilidad: React.FC<SeccionCompatibilidadProps> = ({
  mascota,
  onOpenAssistant,
}) => {
  const { t } = useTranslation()

  const getFieldValue = (
    key: 'ritmo' | 'compania' | 'tolerancia' | 'tamano_compatible'
  ): CompatibilidadValue => {
    const tutor = mascota.compatibilidad_paseo?.tutor
    if (!tutor) return undefined
    return tutor[key] as CompatibilidadValue
  }

  const getOpcionInfo = (atributo: any, valor: CompatibilidadValue) => {
    if (!atributo) return null
    return atributo.opciones.find((o: any) => o.valor === valor)
  }

  return (
    <Card style={styles.container} elevated>
      <SectionHeaderWithAssistant
        title={t('mascotas:detalle.compatibilidad')}
        onOpenAssistant={onOpenAssistant}
      />

      {/* Grid de 2 columnas con cards - siempre visible */}
      <View style={styles.viewContainer}>
        {atributosCompatibilidad.map(atributo => {
          const valor = getFieldValue(
            atributo.key as
              | 'ritmo'
              | 'compania'
              | 'tolerancia'
              | 'tamano_compatible'
          )
          const opcion = getOpcionInfo(atributo, valor)

          return (
            <View key={atributo.key} style={styles.fieldItem}>
              <CardAtributo
                opcion={opcion}
                atributo={atributo}
                vacio={!valor}
              />
            </View>
          )
        })}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  viewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldItem: {
    width: '48%',
  },
})
