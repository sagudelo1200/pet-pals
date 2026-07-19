import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useZonaH3 } from '@/hooks/useZonaH3'
import { COLOR } from '@/constants'

interface Props {
  h3_r9: string
}

/**
 * Muestra índices de inteligencia territorial (bienestar, seguridad, actividad, socialización)
 * Útil para mostrar en mapas, paseos activos, o detalles de ubicación
 *
 * @param h3_r9 - Identificador de celda H3 R9
 */
export function TerritorialIndices({ h3_r9 }: Props) {
  const { zona, loading, error } = useZonaH3(h3_r9)

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Cargando inteligencia...</Text>
      </View>
    )
  }

  if (error || !zona?.narrativa) {
    return null
  }

  const narrativa = zona.narrativa
  const indices = narrativa.indices || {
    bienestar: 0,
    seguridad: 0,
    actividad: 0,
    socializacion: 0,
  }

  const identidad = narrativa.identidad

  return (
    <View style={styles.container}>
      {/* Identidad */}
      {identidad && (
        <View style={styles.identidad}>
          <Text style={styles.label}>
            📍 {identidad.tipo || 'Desconocido'} ({identidad.confianza}%)
          </Text>
        </View>
      )}

      {/* Índices */}
      <View style={styles.indicesGrid}>
        <IndiceCard label="Bienestar" value={indices.bienestar} icon="❤️" />
        <IndiceCard label="Seguridad" value={indices.seguridad} icon="🛡️" />
        <IndiceCard label="Actividad" value={indices.actividad} icon="⚡" />
        <IndiceCard
          label="Socialización"
          value={indices.socializacion}
          icon="👥"
        />
      </View>

      {/* Eventos agregados */}
      <View style={styles.eventos}>
        <Text style={styles.pequeno}>
          {narrativa.total_eventos} eventos • Actualizado hace poco
        </Text>
      </View>
    </View>
  )
}

interface IndiceCardProps {
  label: string
  value: number
  icon: string
}

function IndiceCard({ label, value, icon }: IndiceCardProps) {
  const color = getColorForValue(value)

  return (
    <View style={styles.indiceCard}>
      <Text style={styles.indiceIcon}>{icon}</Text>
      <Text style={[styles.indiceValue, { color }]}>{value}</Text>
      <Text style={styles.indiceLabel}>{label}</Text>
    </View>
  )
}

function getColorForValue(value: number): string {
  if (value >= 75) return COLOR.EXITO
  if (value >= 50) return COLOR.ALERTA
  return COLOR.ERROR
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: COLOR.BLOQUE,
    borderRadius: 8,
    marginVertical: 8,
  },
  identidad: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.BORDE,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.TEXTO,
  },
  indicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  indiceCard: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  indiceIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  indiceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  indiceLabel: {
    fontSize: 11,
    color: COLOR.SUBTEXTO,
    textAlign: 'center',
  },
  eventos: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLOR.BORDE,
  },
  pequeno: {
    fontSize: 12,
    color: COLOR.SUBTEXTO,
  },
})
