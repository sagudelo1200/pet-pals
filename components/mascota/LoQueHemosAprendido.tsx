/**
 * LoQueHemosAprendido
 * Sección de la ficha del tutor: lo que los cuidadores y los paseos han ido
 * enseñando sobre su mascota. El tutor confirma lo sensible ("Es así") y puede
 * corregir cualquier aprendizaje ("No es así"); lo rechazado deja de verse en
 * el resumen de los cuidadores. A nadie se le avisa de lo que decida.
 */
import React, { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import {
  ResumenDeMascota,
  type DecisionDelTutor,
} from '@/components/mascota/ResumenDeMascota'
import { useExpedientes } from '@/hooks/mascotas/useExpedientes'
import { llegadasRecientes } from '@/logic/mascotas/aprendizajes'
import { confirmarAprendizaje } from '@/services/firebase/expediente'
import { mensajeErrorCallable } from '@/services/firebase/callable'

interface Props {
  mascotaId: string
  nombre: string
}

export const LoQueHemosAprendido: React.FC<Props> = ({ mascotaId, nombre }) => {
  const { t } = useTranslation(['paseos'])
  const { expedientes } = useExpedientes([mascotaId])
  const expediente = expedientes[mascotaId]
  const [ocupada, setOcupada] = useState(false)

  // Una mascota sin paseos aún no tiene expediente: no hay nada que mostrar
  if (!expediente) return null

  const decidir = async (clave: string, decision: DecisionDelTutor) => {
    setOcupada(true)
    try {
      await confirmarAprendizaje({ mascotaId, clave, decision })
    } catch (e) {
      Alert.alert(t('paseos:resumen.error'), mensajeErrorCallable(e))
    } finally {
      setOcupada(false)
    }
  }

  // Rechazar es definitivo para los cuidadores: se pide confirmación
  const alDecidir = (clave: string, decision: DecisionDelTutor) => {
    if (decision === 'confirmado') {
      void decidir(clave, decision)
      return
    }
    Alert.alert(
      t('paseos:resumen.rechazar_titulo'),
      t('paseos:resumen.rechazar_mensaje'),
      [
        { text: t('paseos:resumen.cancelar'), style: 'cancel' },
        {
          text: t('paseos:resumen.no_es_asi'),
          style: 'destructive',
          onPress: () => {
            void decidir(clave, decision)
          },
        },
      ]
    )
  }

  const llegadas = llegadasRecientes(expediente)

  return (
    <View style={styles.seccion}>
      <Text style={styles.titulo}>
        {t('paseos:resumen.aprendido_titulo', { nombre })}
      </Text>

      {llegadas.length > 0 && (
        <View style={styles.llegadas}>
          <Text style={styles.llegadasTitulo}>
            {t('paseos:resumen.llegadas_titulo')}
          </Text>
          <Text style={styles.llegadasEmojis}>
            {llegadas.map(l => l.emoji).join('  ')}
          </Text>
        </View>
      )}

      <ResumenDeMascota
        nombre={nombre}
        expediente={expediente}
        mostrarFicha={false}
        mostrarNombre={false}
        onDecidir={alDecidir}
        ocupada={ocupada}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  seccion: { marginTop: 20 },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 10,
  },
  llegadas: { marginBottom: 10 },
  llegadasTitulo: { fontSize: 12, color: COLOR.SUBTEXTO },
  llegadasEmojis: { fontSize: 22, marginTop: 2 },
})
