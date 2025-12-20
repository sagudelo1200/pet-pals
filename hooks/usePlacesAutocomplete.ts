import { useState, useCallback, useRef } from 'react'
import { SugerenciaAutocomplete } from '@/services/maps/types'
import { mapasService } from '@/services/maps'

// Inyectamos el servicio configurado (Mock o Google según env)
const provider = mapasService

export const usePlacesAutocomplete = (delay = 500) => {
  const [query, setQuery] = useState('')
  const [sugerencias, setSugerencias] = useState<SugerenciaAutocomplete[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timeoutRef = useRef<any>(null)

  const buscar = useCallback(
    (texto: string) => {
      setQuery(texto)
      setError(null)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      if (!texto || texto.length < 2) {
        setSugerencias([])
        return
      }

      timeoutRef.current = setTimeout(async () => {
        setCargando(true)
        try {
          const resultados = await provider.buscarSitios(texto)
          setSugerencias(resultados)
        } catch (err) {
          console.error(err)
          setError('Error al buscar sitios')
          setSugerencias([])
        } finally {
          setCargando(false)
        }
      }, delay)
    },
    [delay]
  )

  const limpiar = useCallback(() => {
    setQuery('')
    setSugerencias([])
    setError(null)
  }, [])

  return {
    query,
    sugerencias,
    cargando,
    error,
    buscar,
    limpiar,
  }
}
