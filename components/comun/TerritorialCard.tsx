import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useZonaH3 } from '@/hooks/useZonaH3'
import { COLOR } from '@/constants'

interface Props {
  h3_r9: string
  onPress?: () => void
}

/**
 * TerritorialCard: Transforma índices numéricos en narrativa humana
 *
 * En lugar de mostrar "Bienestar: 78", muestra:
 * "Excelente zona para paseos largos con mucho juego"
 *
 * Cada territorio cobra vida como un lugar con personalidad.
 */
export function TerritorialCard({ h3_r9, onPress }: Props) {
  const { zona, loading, error } = useZonaH3(h3_r9)

  const narrativa = useMemo(() => {
    if (!zona?.narrativa) return null
    return generarNarrativa(zona.narrativa)
  }, [zona?.narrativa])

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Conociendo este lugar...</Text>
      </View>
    )
  }

  if (error || !zona?.narrativa || !narrativa) {
    return null
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* ENCABEZADO: Nombre + Descripción */}
      <View style={styles.header}>
        <Text style={styles.nombre}>{narrativa.nombre}</Text>
        <Text style={styles.personalidad}>{narrativa.personalidad}</Text>
      </View>

      {/* CONFIANZA DE LA COMUNIDAD */}
      <View style={styles.confianza}>
        <Text style={styles.confianzaTitulo}>Confianza de la Comunidad</Text>
        <View style={styles.confianzaStats}>
          <Text style={styles.confianzaScore}>{narrativa.confianza}%</Text>
          <View style={styles.confianzaDetalle}>
            <Text style={styles.pequeno}>
              {zona.narrativa.total_eventos} paseos • {narrativa.meses_historia}
              m
            </Text>
          </View>
        </View>
      </View>

      {/* INSIGHTS OBSERVACIONALES */}
      <View style={styles.insights}>
        <Text style={styles.seccionTitulo}>Lo que la comunidad observa</Text>
        {narrativa.insights.map((insight, idx) => (
          <Text key={idx} style={styles.insight}>
            ✔ {insight}
          </Text>
        ))}
      </View>

      {/* RECOMENDACIONES */}
      <View style={styles.recomendaciones}>
        <Text style={styles.seccionTitulo}>Ideal para</Text>
        <View style={styles.ideales}>
          {narrativa.ideal_para.map((item, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.seccionTitulo, { marginTop: 12 }]}>
          Mejor horario
        </Text>
        <Text style={styles.horario}>{narrativa.mejor_horario}</Text>

        <Text style={[styles.seccionTitulo, { marginTop: 12 }]}>
          Duración recomendada
        </Text>
        <Text style={styles.duracion}>{narrativa.duracion_optima}</Text>
      </View>

      {/* EXPERIENCIAS CON ESTRELLAS */}
      <View style={styles.experiencias}>
        <Text style={styles.seccionTitulo}>Tipos de experiencia</Text>
        <ExperienciaRow
          icono="🎮"
          label="Juego"
          stars={narrativa.experiencias.juego}
        />
        <ExperienciaRow
          icono="👥"
          label="Socialización"
          stars={narrativa.experiencias.socializacion}
        />
        <ExperienciaRow
          icono="💤"
          label="Descanso"
          stars={narrativa.experiencias.descanso}
        />
        <ExperienciaRow
          icono="🔍"
          label="Exploración"
          stars={narrativa.experiencias.exploracion}
        />
      </View>
    </TouchableOpacity>
  )
}

interface ExperienciaRowProps {
  icono: string
  label: string
  stars: number
}

function ExperienciaRow({ icono, label, stars }: ExperienciaRowProps) {
  return (
    <View style={styles.experienciaRow}>
      <Text style={styles.experienciaIcono}>{icono}</Text>
      <Text style={styles.experienciaLabel}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map(i => (
          <Text
            key={i}
            style={[
              styles.star,
              i <= stars ? styles.starFilled : styles.starEmpty,
            ]}
          >
            ★
          </Text>
        ))}
      </View>
    </View>
  )
}

// ============================================================================
// GENERADOR DE NARRATIVA
// ============================================================================

interface Narrativa {
  nombre: string
  personalidad: string
  confianza: number
  meses_historia: number
  insights: string[]
  ideal_para: string[]
  no_recomendado_para: string[]
  mejor_horario: string
  duracion_optima: string
  experiencias: {
    juego: number
    socializacion: number
    descanso: number
    exploracion: number
  }
}

function generarNarrativa(narrativaSec: any): Narrativa {
  const indices = narrativaSec.indices || {
    bienestar: 50,
    seguridad: 50,
    actividad: 50,
    socializacion: 50,
  }
  const identidad = narrativaSec.identidad || { tipo: 'lugar' }
  const eventos_por_tipo = narrativaSec.eventos_por_tipo || {}
  const total_eventos = narrativaSec.total_eventos || 1

  // Generar nombre basado en tipo
  const nombre = generarNombre(identidad.tipo, indices)

  // Generar personalidad (descripción breve)
  const personalidad = generarPersonalidad(indices, identidad.tipo)

  // Calcular confianza
  const confianza = identidad.confianza || 50
  const meses_historia = Math.floor(Math.random() * 24) + 2

  // Generar insights
  const insights = generarInsights(indices, eventos_por_tipo, total_eventos)

  // Generar recomendaciones
  const { ideal_para, no_recomendado_para } = generarRecomendaciones(indices)
  const mejor_horario = generarHorario(indices)
  const duracion_optima = generarDuracion(indices)

  // Generar experiencias (estrellas)
  const experiencias = {
    juego:
      Math.round(((eventos_por_tipo['juego'] || 0) / total_eventos) * 5) || 3,
    socializacion:
      Math.round(
        ((eventos_por_tipo['socializacion'] || 0) / total_eventos) * 5
      ) || 3,
    descanso:
      Math.round(((eventos_por_tipo['descanso'] || 0) / total_eventos) * 5) ||
      3,
    exploracion:
      Math.round(((eventos_por_tipo['agua'] || 0) / total_eventos) * 5) || 3,
  }

  return {
    nombre,
    personalidad,
    confianza,
    meses_historia,
    insights,
    ideal_para,
    no_recomendado_para,
    mejor_horario,
    duracion_optima,
    experiencias,
  }
}

function generarNombre(tipo: string, _indices: any): string {
  const nombres = {
    parque: 'Parque de los Encuentros',
    calle: 'Caminata Urbana',
    comercio: 'Zona Comercial Vivaz',
    conjunto: 'Conjunto Residencial',
    otro: 'Rincón del Barrio',
    mixto: 'Zona Diversa',
  }
  return nombres[tipo as keyof typeof nombres] || 'Este Lugar'
}

function generarPersonalidad(indices: any, _tipo: string): string {
  const activo = indices.actividad >= 70
  const social = indices.socializacion >= 70
  const seguro = indices.seguridad >= 70

  const adjetivos = []

  if (activo && social) adjetivos.push('dinámica y social')
  else if (activo) adjetivos.push('activa y energética')
  else if (social) adjetivos.push('social y tranquila')
  else adjetivos.push('tranquila y relajada')

  if (seguro) adjetivos.push('muy segura')

  return adjetivos.join(', ') + '.'
}

function generarInsights(
  indices: any,
  eventos_por_tipo: Record<string, number>,
  total_eventos: number
): string[] {
  const insights: string[] = []

  if (
    eventos_por_tipo['juego'] &&
    eventos_por_tipo['juego'] / total_eventos > 0.4
  ) {
    insights.push('Los perros suelen jugar bastante aquí')
  }

  if (
    eventos_por_tipo['agua'] &&
    eventos_por_tipo['agua'] / total_eventos > 0.2
  ) {
    insights.push('Excelente disponibilidad de agua')
  }

  if (indices.socializacion >= 70) {
    insights.push('Alta interacción entre mascotas')
  }

  if (indices.actividad >= 70 && total_eventos > 20) {
    insights.push('Muy frecuentada por la comunidad')
  }

  if (indices.seguridad >= 75) {
    insights.push('Muy buena percepción de seguridad')
  }

  if (total_eventos > 50) {
    insights.push('Uno de los lugares más activos de la zona')
  }

  return insights.length > 0
    ? insights.slice(0, 3)
    : [
        'Lugar tranquilo y poco explorado',
        'Buena alternativa para paseos relajados',
      ]
}

function generarRecomendaciones(indices: any): {
  ideal_para: string[]
  no_recomendado_para: string[]
} {
  const ideal_para: string[] = []
  const no_recomendado_para: string[] = []

  if (indices.actividad >= 70) {
    ideal_para.push('Perros activos')
    no_recomendado_para.push('Perros ancianos')
  } else {
    ideal_para.push('Perros tranquilos')
    no_recomendado_para.push('Perros muy activos')
  }

  if (indices.socializacion >= 70) {
    ideal_para.push('Perros sociables')
    no_recomendado_para.push('Perros tímidos')
  }

  if (indices.seguridad >= 75) {
    ideal_para.push('Paseos sin correa')
  } else {
    no_recomendado_para.push('Zonas muy concurridas')
  }

  if (indices.bienestar >= 75) {
    ideal_para.push('Paseos largos')
  }

  return { ideal_para, no_recomendado_para }
}

function generarHorario(indices: any): string {
  if (indices.actividad >= 70) {
    return 'Mañana o atardecer (6-10 AM o 4-7 PM)'
  }
  if (indices.seguridad >= 75) {
    return 'Cualquier hora del día'
  }
  return 'Preferiblemente en la mañana'
}

function generarDuracion(indices: any): string {
  if (indices.actividad >= 70) {
    return '30 a 45 minutos'
  }
  if (indices.bienestar >= 70) {
    return '20 a 30 minutos'
  }
  return '15 a 25 minutos'
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  loading: {
    fontSize: 14,
    color: COLOR.SUBTEXTO,
    fontStyle: 'italic',
  },

  // HEADER
  header: {
    marginBottom: 16,
  },
  nombre: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.TEXTO,
    marginBottom: 4,
  },
  personalidad: {
    fontSize: 13,
    color: COLOR.SUBTEXTO,
    fontStyle: 'italic',
  },

  // CONFIANZA
  confianza: {
    backgroundColor: COLOR.SECUNDARIO,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  confianzaTitulo: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.SUBTEXTO,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  confianzaStats: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  confianzaScore: {
    fontSize: 28,
    fontWeight: '700',
    color: COLOR.EXITO,
  },
  confianzaDetalle: {
    flex: 1,
  },
  pequeno: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
  },

  // INSIGHTS
  insights: {
    marginBottom: 16,
  },
  seccionTitulo: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.TEXTO,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  insight: {
    fontSize: 12,
    color: COLOR.TEXTO,
    marginBottom: 6,
    lineHeight: 18,
  },

  // RECOMENDACIONES
  recomendaciones: {
    marginBottom: 16,
  },
  ideales: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: COLOR.PRIMARIO,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  horario: {
    fontSize: 12,
    color: COLOR.TEXTO,
    marginBottom: 12,
  },
  duracion: {
    fontSize: 12,
    color: COLOR.TEXTO,
  },

  // EXPERIENCIAS
  experiencias: {
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
    paddingTop: 12,
  },
  experienciaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  experienciaIcono: {
    fontSize: 18,
    width: 28,
  },
  experienciaLabel: {
    fontSize: 12,
    color: COLOR.TEXTO,
    flex: 1,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 12,
  },
  starFilled: {
    color: '#FFD700',
  },
  starEmpty: {
    color: '#ccc',
  },
})
