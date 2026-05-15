import { useState, useEffect } from 'react'
import { gridDisk } from 'h3-js'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { RADIO_COBERTURA_DEFAULT } from '@/services/geo'

/**
 * Gestiona las celdas H3 de cobertura seleccionadas por el cuidador.
 *
 * - Si el perfil tiene `celdas_cobertura`, las usa como selección inicial.
 * - Si no, usa el gridDisk(h3_home, RADIO_COBERTURA_DEFAULT) automático.
 * - `h3HomeOverride` se usa como fallback si `PerfilPublico.h3_home` no está seteado aún.
 */
export function useCoberturaCuidador(
  uid: string | null,
  h3HomeOverride?: string | null
) {
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  const [h3Home, setH3Home] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!uid) return
    setLoading(true)
    GestorPerfilPublico.obtenerPorId(uid).then(res => {
      if (res.success && res.data) {
        const { h3_home, celdas_cobertura } = res.data
        const efectivoH3 = h3_home ?? h3HomeOverride ?? null
        setH3Home(efectivoH3)
        if (celdas_cobertura?.length) {
          setSelectedCells(celdas_cobertura)
        } else if (efectivoH3) {
          setSelectedCells(gridDisk(efectivoH3, RADIO_COBERTURA_DEFAULT))
        }
      } else if (h3HomeOverride) {
        setH3Home(h3HomeOverride)
        setSelectedCells(gridDisk(h3HomeOverride, RADIO_COBERTURA_DEFAULT))
      }
      setLoading(false)
    })
  }, [uid, h3HomeOverride])

  const toggleCell = (cell: string) => {
    setSelectedCells(prev =>
      prev.includes(cell) ? prev.filter(c => c !== cell) : [...prev, cell]
    )
  }

  const save = async (): Promise<boolean> => {
    if (!uid) return false
    setSaving(true)
    const res = await GestorPerfilPublico.actualizarCeldasCobertura(
      uid,
      selectedCells
    )
    setSaving(false)
    return res.success
  }

  return { selectedCells, h3Home, loading, saving, toggleCell, save }
}
