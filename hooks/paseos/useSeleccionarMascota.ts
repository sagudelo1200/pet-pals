import { useState, useCallback, useEffect, useRef } from 'react'
import { Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useMascotas } from '@/hooks/useMascotas'
import { MAX_MASCOTAS_POR_PASEO } from '@/constants/limits'
import { useMascotasConPaseoEnCurso } from '@/hooks/paseos/useMascotasConPaseoEnCurso'

export const useSeleccionarMascota = (mascotasInicialesIds: string[] = []) => {
  const { t } = useTranslation()
  const { mascotas, loading } = useMascotas()
  const { mascotasConPaseo, loading: cargandoPaseos } =
    useMascotasConPaseoEnCurso()

  const [mascotasSeleccionadas, setMascotasSeleccionadas] =
    useState<string[]>(mascotasInicialesIds)
  const autoSelectedRef = useRef(false)

  // Auto-seleccionar si solo hay 1 mascota y no se ha seleccionado nada aún
  useEffect(() => {
    if (
      !loading &&
      mascotas.length === 1 &&
      mascotasSeleccionadas.length === 0 &&
      !autoSelectedRef.current
    ) {
      setMascotasSeleccionadas([mascotas[0].id])
      autoSelectedRef.current = true
    }
  }, [loading, mascotas, mascotasSeleccionadas.length])

  const toggleMascota = useCallback(
    (id: string) => {
      // Si la mascota tiene un paseo en curso, no permitir seleccionar
      if (mascotasConPaseo.has(id)) {
        Alert.alert(
          t('paseos:errores.mascota_no_disponible'),
          t('paseos:errores.MASCOTA_YA_TIENE_PASEO'),
          [{ text: 'OK' }]
        )
        return
      }

      setMascotasSeleccionadas(prev => {
        if (prev.includes(id)) {
          return prev.filter(p => p !== id)
        }
        if (prev.length >= MAX_MASCOTAS_POR_PASEO) {
          Alert.alert(t('paseos:errores.LIMITE_DE_MASCOTAS_SUPERADO'), '', [
            { text: 'OK' },
          ])
          return prev
        }
        return [...prev, id]
      })
    },
    [t, mascotasConPaseo]
  )

  return {
    mascotas,
    loading,
    mascotasSeleccionadas,
    toggleMascota,
    mascotasConPaseoEnCurso: mascotasConPaseo,
    cargandoPaseos,
  }
}
