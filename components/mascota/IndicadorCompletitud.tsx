import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { COLOR } from '@/constants'
import {
  obtenerClaveNivel,
  type CompletitudMascota,
} from '@/logic/mascotas/calcularCompletitud'

interface IndicadorCompletitudProps {
  /** Objeto de completitud calculado */
  completitud: CompletitudMascota
  /** Tamaño: 'sm' (compacto en cards), 'md' (normal), 'lg' (destacado) */
  size?: 'sm' | 'md' | 'lg'
  /** Mostrar solo el porcentaje sin detalles */
  compact?: boolean
}

/**
 * Indicador visual premium y discreto de completitud del perfil de mascota.
 * Barra minimalista horizontal con porcentaje y nivel.
 */
export const IndicadorCompletitud: React.FC<IndicadorCompletitudProps> = ({
  completitud,
  size = 'md',
  compact = false,
}) => {
  const { t } = useTranslation()

  // Determinar color según estado de readiness
  const colorConfig = useMemo(() => {
    switch (completitud.readiness) {
      case 'incompleto':
        return { barColor: COLOR.ALERTA }
      case 'basico':
        return { barColor: COLOR.ALERTA }
      case 'completo':
        return { barColor: COLOR.EXITO }
      default:
        return { barColor: COLOR.INFO }
    }
  }, [completitud.readiness])

  // Tamaños minimales (discreto)
  const config = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          barHeight: 2,
          spacing: 6,
          percentageSize: 11,
          levelSize: 10,
        }
      case 'lg':
        return {
          barHeight: 4,
          spacing: 10,
          percentageSize: 14,
          levelSize: 12,
        }
      default: // md
        return {
          barHeight: 3,
          spacing: 8,
          percentageSize: 12,
          levelSize: 11,
        }
    }
  }, [size])

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text
          style={[
            styles.percentageCompact,
            { fontSize: config.percentageSize, color: colorConfig.barColor },
          ]}
        >
          {completitud.porcentaje}%
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header: Nivel + Porcentaje */}
      <View style={[styles.header, { marginBottom: config.spacing }]}>
        <Text
          style={[
            styles.levelLabel,
            { fontSize: config.levelSize, color: COLOR.SUBTEXTO },
          ]}
        >
          {t(obtenerClaveNivel(completitud.nivel))}
        </Text>
        <Text
          style={[
            styles.percentageLabel,
            { fontSize: config.percentageSize, color: colorConfig.barColor },
          ]}
        >
          {completitud.porcentaje}%
        </Text>
      </View>

      {/* Barra de progreso premium */}
      <View style={[styles.barContainer, { height: config.barHeight }]}>
        {/* Fondo muy sutil */}
        <View
          style={[
            styles.barBackground,
            {
              backgroundColor: COLOR.BORDE,
            },
          ]}
        />
        {/* Progreso */}
        <View
          style={[
            styles.barProgress,
            {
              width: `${completitud.porcentaje}%`,
              backgroundColor: colorConfig.barColor,
            },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelLabel: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  percentageLabel: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  barContainer: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 3,
    position: 'relative',
    backgroundColor: COLOR.BORDE,
  },
  barBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  barProgress: {
    height: '100%',
    borderRadius: 2,
  },
  compactContainer: {
    marginBottom: 8,
    alignItems: 'center',
  },
  percentageCompact: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})
