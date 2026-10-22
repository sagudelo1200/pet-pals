import React, { useEffect, useState } from 'react'
import { Text, type TextStyle } from 'react-native'
import { ServicioPerfilPublico } from '@/services/firebase/firestore/colecciones/perfiles_publicos'

// Los mismos usuarios se repiten en listas e historiales: se lee cada uno una vez
const nombres = new Map<string, Promise<string>>()

function nombreDe(uid: string): Promise<string> {
  if (uid === 'sistema-seed') return Promise.resolve('Sistema')
  if (!nombres.has(uid)) {
    nombres.set(
      uid,
      ServicioPerfilPublico.obtenerPorId(uid).then(r =>
        r.success && r.data?.nombre ? r.data.nombre : uid
      )
    )
  }
  return nombres.get(uid)!
}

/** Nombre legible de un usuario (el uid si no tiene perfil). */
export const NombreUsuario: React.FC<{ uid: string; style?: TextStyle }> = ({
  uid,
  style,
}) => {
  const [nombre, setNombre] = useState(uid)
  useEffect(() => {
    let activo = true
    nombreDe(uid).then(n => activo && setNombre(n))
    return () => {
      activo = false
    }
  }, [uid])
  return <Text style={style}>{nombre}</Text>
}
