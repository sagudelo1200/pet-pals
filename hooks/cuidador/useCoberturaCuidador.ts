import { useState, useEffect } from 'react'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'
import { celdasDeCobertura } from '@/services/geo'
import {
  RADIO_COBERTURA,
  radioDeCobertura,
} from '@/functions/src/compartido/geografia'

/**
 * Gestiona la cobertura del cuidador: su radio y, en el modo manual, las
 * celdas H3 que eligió.
 *
 * - Si el perfil tiene `celdas_cobertura`, las usa como selección inicial.
 * - Si no, usa el vecindario de su celda de origen según su radio.
 * - `h3_r8Override` se usa como fallback si `PerfilPublico.h3_r8` no está seteado aún.
 */
export function useCoberturaCuidador(
  uid: string | null,
  h3_r8Override?: string | null
) {
  const [selectedCells, setSelectedCells] = useState<string[]>([])
  const [h3Home, setH3Home] = useState<string | null>(null)
  const [radio, setRadio] = useState<number>(RADIO_COBERTURA)
  const [hayManual, setHayManual] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!uid) return
    setLoading(true)
    GestorPerfilPublico.obtenerPorId(uid).then(res => {
      if (res.success && res.data) {
        const { h3_r8, celdas_cobertura, radio_cobertura } = res.data
        const efectivoH3 = h3_r8 ?? h3_r8Override ?? null
        const r = radioDeCobertura(radio_cobertura)
        setH3Home(efectivoH3)
        setRadio(r)
        setHayManual(!!celdas_cobertura?.length)
        if (celdas_cobertura?.length) {
          setSelectedCells(celdas_cobertura)
        } else if (efectivoH3) {
          setSelectedCells(celdasDeCobertura(efectivoH3, r))
        }
      } else if (h3_r8Override) {
        setH3Home(h3_r8Override)
        setSelectedCells(celdasDeCobertura(h3_r8Override))
      }
      setLoading(false)
    })
  }, [uid, h3_r8Override])

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
      selectedCells,
      h3Home
    )
    setSaving(false)
    return res.success
  }

  return {
    selectedCells,
    h3Home,
    radio,
    hayManual,
    loading,
    saving,
    toggleCell,
    save,
  }
}
