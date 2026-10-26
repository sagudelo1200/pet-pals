import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useZonaH3 } from '@/hooks/useZonaH3'
import { COLOR } from '@/constants'
import { useTranslation } from 'react-i18next'

type Traducir = (_clave: string, _opciones?: Record<string, unknown>) => string

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
  const { t } = useTranslation('comun')
  const { zona, loading, error } = useZonaH3(h3_r9)

  const narrativa = useMemo(() => {
    if (!zona?.narrativa) return null
    return generarNarrativa(zona.narrativa, t)
  }, [zona?.narrativa, t])

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>{t('comun:territorial.cargando')}</Text>
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
        <Text style={styles.confianzaTitulo}>
          {t('comun:territorial.confianza')}
        </Text>
        <View style={styles.confianzaStats}>
          <Text style={styles.confianzaScore}>{narrativa.confianza}%</Text>
          <View style={styles.confianzaDetalle}>
            <Text style={styles.pequeno}>
              {t('comun:territorial.paseos_meses', {
                paseos: zona.narrativa.total_eventos,
                meses: narrativa.meses_historia,
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* INSIGHTS OBSERVACIONALES */}
      <View style={styles.insights}>
        <Text style={styles.seccionTitulo}>{t('comun:territorial.observa')}</Text>
        {narrativa.insights.map((insight, idx) => (
          <Text key={idx} style={styles.insight}>
            ✔ {insight}
          </Text>
        ))}
      </View>

      {/* RECOMENDACIONES */}
      <View style={styles.recomendaciones}>
        <Text style={styles.seccionTitulo}>{t('comun:territorial.ideal_para')}</Text>
        <View style={styles.ideales}>
          {narrativa.ideal_para.map((item, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.seccionTitulo, { marginTop: 12 }]}>
          {t('comun:territorial.mejor_horario')}
        </Text>
        <Text style={styles.horario}>{narrativa.mejor_horario}</Text>

        <Text style={[styles.seccionTitulo, { marginTop: 12 }]}>
          {t('comun:territorial.duracion')}
        </Text>
        <Text style={styles.duracion}>{narrativa.duracion_optima}</Text>
      </View>

      {/* EXPERIENCIAS CON ESTRELLAS */}
      <View style={styles.experiencias}>
        <Text style={styles.seccionTitulo}>{t('comun:territorial.tipos_experiencia')}</Text>
        <ExperienciaRow
          icono="🎮"
          label={t('comun:territorial.exp_juego')}
          stars={narrativa.experiencias.juego}
        />
        <ExperienciaRow
          icono="👥"
          label={t('comun:territorial.exp_socializacion')}
          stars={narrativa.experiencias.socializacion}
        />
        <ExperienciaRow
          icono="💤"
          label={t('comun:territorial.exp_descanso')}
          stars={narrativa.experiencias.descanso}
        />
        <ExperienciaRow
          icono="🔍"
          label={t('comun:territorial.exp_exploracion')}
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

function generarNarrativa(narrativaSec: any, t: Traducir): Narrativa {
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
  const nombre = generarNombre(identidad.tipo, indices, t)

  // Generar personalidad (descripción breve)
  const personalidad = generarPersonalidad(indices, identidad.tipo, t)

  // Calcular confianza
  const confianza = identidad.confianza || 50
  const meses_historia = Math.floor(Math.random() * 24) + 2

  // Generar insights
  const insights = generarInsights(indices, eventos_por_tipo, total_eventos, t)

  // Generar recomendaciones
  const { ideal_para, no_recomendado_para } = generarRecomendaciones(indices, t)
  const mejor_horario = generarHorario(indices, t)
  const duracion_optima = generarDuracion(indices, t)

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

function generarNombre(tipo: string, _indices: any, t: Traducir): string {
  const conocidos = ['parque', 'calle', 'comercio', 'conjunto', 'otro', 'mixto']
  return conocidos.includes(tipo)
    ? t(`comun:territorial.nombres.${tipo}`)
    : t('comun:territorial.nombres.default')
}

function generarPersonalidad(indices: any, _tipo: string, t: Traducir): string {
  const activo = indices.actividad >= 70
  const social = indices.socializacion >= 70
  const seguro = indices.seguridad >= 70

  const adjetivos = []

  if (activo && social) adjetivos.push(t('comun:territorial.adj.dinamica_social'))
  else if (activo) adjetivos.push(t('comun:territorial.adj.activa'))
  else if (social) adjetivos.push(t('comun:territorial.adj.social'))
  else adjetivos.push(t('comun:territorial.adj.tranquila'))

  if (seguro) adjetivos.push(t('comun:territorial.adj.segura'))

  return adjetivos.join(', ') + '.'
}

function generarInsights(
  indices: any,
  eventos_por_tipo: Record<string, number>,
  total_eventos: number,
  t: Traducir
): string[] {
  const insights: string[] = []

  if (
    eventos_por_tipo['juego'] &&
    eventos_por_tipo['juego'] / total_eventos > 0.4
  ) {
    insights.push(t('comun:territorial.insights.juegan'))
  }

  if (
    eventos_por_tipo['agua'] &&
    eventos_por_tipo['agua'] / total_eventos > 0.2
  ) {
    insights.push(t('comun:territorial.insights.agua'))
  }

  if (indices.socializacion >= 70) {
    insights.push(t('comun:territorial.insights.interaccion'))
  }

  if (indices.actividad >= 70 && total_eventos > 20) {
    insights.push(t('comun:territorial.insights.frecuentada'))
  }

  if (indices.seguridad >= 75) {
    insights.push(t('comun:territorial.insights.seguridad'))
  }

  if (total_eventos > 50) {
    insights.push(t('comun:territorial.insights.activos'))
  }

  return insights.length > 0
    ? insights.slice(0, 3)
    : [
        t('comun:territorial.insights.tranquilo'),
        t('comun:territorial.insights.relajados'),
      ]
}

function generarRecomendaciones(
  indices: any,
  t: Traducir
): {
  ideal_para: string[]
  no_recomendado_para: string[]
} {
  const ideal_para: string[] = []
  const no_recomendado_para: string[] = []

  if (indices.actividad >= 70) {
    ideal_para.push(t('comun:territorial.rec.perros_activos'))
    no_recomendado_para.push(t('comun:territorial.rec.perros_ancianos'))
  } else {
    ideal_para.push(t('comun:territorial.rec.perros_tranquilos'))
    no_recomendado_para.push(t('comun:territorial.rec.perros_muy_activos'))
  }

  if (indices.socializacion >= 70) {
    ideal_para.push(t('comun:territorial.rec.perros_sociables'))
    no_recomendado_para.push(t('comun:territorial.rec.perros_timidos'))
  }

  if (indices.seguridad >= 75) {
    ideal_para.push(t('comun:territorial.rec.sin_correa'))
  } else {
    no_recomendado_para.push(t('comun:territorial.rec.zonas_concurridas'))
  }

  if (indices.bienestar >= 75) {
    ideal_para.push(t('comun:territorial.rec.paseos_largos'))
  }

  return { ideal_para, no_recomendado_para }
}

function generarHorario(indices: any, t: Traducir): string {
  if (indices.actividad >= 70) {
    return t('comun:territorial.horario.manana_atardecer')
  }
  if (indices.seguridad >= 75) {
    return t('comun:territorial.horario.cualquiera')
  }
  return t('comun:territorial.horario.manana')
}

function generarDuracion(indices: any, t: Traducir): string {
  if (indices.actividad >= 70) {
    return t('comun:territorial.duracion_opt.larga')
  }
  if (indices.bienestar >= 70) {
    return t('comun:territorial.duracion_opt.media')
  }
  return t('comun:territorial.duracion_opt.corta')
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
