/**
 * Checkbox reutilizable para consentimientos.
 * Usado en Registro, Login, Settings, etc.
 *
 * Propósito: Permitir al usuario aceptar/rechazar consentimientos
 * y acceder al documento completo.
 */

import React from 'react'
import { Pressable, View, StyleSheet } from 'react-native'
import { Text } from 'galio-framework'
import { COLOR } from '@/constants/Theme'

interface CheckboxConsentimientoProps {
  /**
   * Texto a mostrar junto al checkbox
   */
  label: string

  /** Valor actual del checkbox */
  value: boolean

  /** Callback cuando cambia el estado */
  onValueChange: (_newValue: boolean) => void

  /** Callback para abrir el modal de lectura del documento */
  onLeerDocumento?: () => void

  /** Deshabilitar el checkbox */
  disabled?: boolean

  /** Color personalizado (usa COLOR.PRIMARIO por defecto) */
  color?: string
}

/**
 * Checkbox accesible para consentimientos con enlace al documento.
 * Implementado con Pressable para compatibilidad con React Native.
 * El botón de lectura es un icono pequeño inline.
 */
export const CheckboxConsentimiento: React.FC<CheckboxConsentimientoProps> = ({
  label,
  value,
  onValueChange,
  onLeerDocumento,
  disabled = false,
  color = COLOR.PRIMARIO,
}) => {
  return (
    <Pressable
      style={[styles.container, disabled && styles.disabled]}
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
    >
      {/* Checkbox */}
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: value ? color : 'transparent',
            borderColor: disabled ? COLOR.BORDE : value ? color : COLOR.BORDE,
          },
        ]}
      >
        {value && <Text style={styles.checkmark}>✓</Text>}
      </View>

      {/* Label + botón de lectura en línea */}
      <View style={styles.labelContainer}>
        <Text
          style={[
            styles.label,
            { color: disabled ? COLOR.SUBTEXTO : COLOR.TEXTO },
          ]}
        >
          {label}
        </Text>

        {/* Icono pequeño de lectura (inline, sutil) */}
        {onLeerDocumento && (
          <Pressable
            style={styles.iconoLectura}
            onPress={onLeerDocumento}
            disabled={disabled}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.iconoLecturaText}>📖</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  labelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  disabled: {
    opacity: 0.6,
  },
  iconoLectura: {
    padding: 4,
    marginLeft: 8,
  },
  iconoLecturaText: {
    fontSize: 14,
    opacity: 0.7,
  },
})
