import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { COLOR } from '@/constants'
import { useDoc } from '@/hooks/useDoc'
import { Spacer } from '@/components/ui'

interface ResumenEvaluacion {
  objetivo: { tipo: string; id: string }
  evaluaciones_cuidador: { promedio: number; cantidad: number }
  evaluaciones_tutor: { promedio: number; cantidad: number }
  evaluaciones_mascota: { promedio: number; cantidad: number }
  evaluaciones_sistema: { promedio: number; cantidad: number }
  actualizado_en: any
}

/**
 * Componente: Dashboard de Reputación
 *
 * Muestra ResumenEvaluacion separado por tipo:
 * - evaluaciones_cuidador: ¿Qué dicen los tutores de ti?
 * - evaluaciones_tutor: ¿Qué dicen los cuidadores de ti?
 * - evaluaciones_mascota: Observaciones de comportamiento
 * - evaluaciones_sistema: Evaluación automática (puntualidad, etc)
 */
export default function DashboardReputacion({ userId }: { userId: string }) {
  const { data: resumen, cargando } = useDoc<any>(
    'resumenes_evaluacion',
    userId
  )

  const renderStars = (promedio: number, cantidad: number) => {
    if (cantidad === 0) return '—'
    return `${promedio.toFixed(1)}⭐ (${cantidad} ${cantidad === 1 ? 'evaluación' : 'evaluaciones'})`
  }

  const renderTipoCard = (
    titulo: string,
    tipo: keyof ResumenEvaluacion,
    descripcion: string
  ) => {
    const datos = resumen?.[tipo] as { promedio: number; cantidad: number }

    return (
      <>
        <View
          style={[
            styles.card,
            { backgroundColor: COLOR.SECUNDARIO, borderColor: COLOR.BORDE },
          ]}
        >
          <Text style={[styles.cardTitulo, { color: COLOR.TEXTO }]}>
            {titulo}
          </Text>
          <Text style={[styles.cardDescripcion, { color: COLOR.TEXTO }]}>
            {descripcion}
          </Text>
          <Spacer size={12} />
          <Text
            style={[
              styles.cardCalificacion,
              { color: datos?.cantidad ? COLOR.PRIMARIO : COLOR.TEXTO },
            ]}
          >
            {renderStars(datos?.promedio || 0, datos?.cantidad || 0)}
          </Text>
        </View>
        <Spacer size={12} />
      </>
    )
  }

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLOR.PRIMARIO} />
      </View>
    )
  }

  if (!resumen) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLOR.TEXTO }}>No hay evaluaciones aún</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: COLOR.BASE }]}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <Spacer size={16} />
      <Text style={[styles.titulo, { color: COLOR.TEXTO }]}>
        Tu Reputación en Pet Pals
      </Text>
      <Spacer size={20} />

      {/* Evaluación Cuidador (Tutores dicen de ti) */}
      {renderTipoCard(
        'Como Cuidador',
        'evaluaciones_cuidador',
        'Lo que los tutores piensan de tu desempeño como cuidador'
      )}

      {/* Evaluación Tutor (Cuidadores dicen de ti) */}
      {renderTipoCard(
        'Como Tutor',
        'evaluaciones_tutor',
        'Lo que los cuidadores piensan de ti como tutor'
      )}

      {/* Evaluación Mascota (Observaciones) */}
      {renderTipoCard(
        'Mascotas (Observaciones)',
        'evaluaciones_mascota',
        'Observaciones sobre el comportamiento de tus mascotas'
      )}

      {/* Evaluación Sistema (Automática) */}
      {renderTipoCard(
        'Evaluación del Sistema',
        'evaluaciones_sistema',
        'Métricas automáticas (puntualidad, cancelaciones, etc)'
      )}

      <Spacer size={20} />
      <Text style={[styles.footer, { color: COLOR.TEXTO }]}>
        Última actualización:{' '}
        {resumen.actualizado_en?.toDate?.()?.toLocaleDateString('es-ES') ||
          'N/A'}
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  cardTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardDescripcion: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  cardCalificacion: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})
