import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import Card from '@/components/ui/Card'
import { SectionHeaderWithAssistant } from '@/components/mascota/SectionHeaderWithAssistant'
import { CardAtributo } from '@/components/mascota/CardAtributo'
import type { Mascota } from '@/models/Mascota'
import { atributosComportamiento } from '@/logic/mascotas/comportamientoAsistente'

interface SeccionComportamientoProps {
  mascota: Mascota
  onOpenAsistente: () => void
}

type NivelComportamiento = 'bajo' | 'medio' | 'alto' | undefined

/**
 * Sección de comportamiento del perfil de mascota.
 * Muestra cards en grid de 2 columnas y botón para abrir asistente guiado.
 */
export const SeccionComportamiento: React.FC<SeccionComportamientoProps> = ({
  mascota,
  onOpenAsistente,
}) => {
  const { t } = useTranslation()

  const getFieldValue = (key: string): NivelComportamiento => {
    const val = mascota[key as keyof Mascota]
    if (val === 'bajo' || val === 'medio' || val === 'alto') {
      return val as NivelComportamiento
    }
    return undefined
  }

  const getOpcionInfo = (atributo: any, valor: NivelComportamiento) => {
    if (!atributo) return null
    return atributo.opciones.find((o: any) => o.valor === valor)
  }

  return (
    <Card style={styles.container} elevated>
      <SectionHeaderWithAssistant
        title={t('mascotas:detalle.comportamiento')}
        onOpenAssistant={onOpenAsistente}
      />

      {/* Grid de 2 columnas con cards - siempre visible */}
      <View style={styles.viewContainer}>
        {atributosComportamiento.map(atributo => {
          const valor = getFieldValue(atributo.key)
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
