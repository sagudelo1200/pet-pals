import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { construirActualizacion } from '../comun/camposPublicos'

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp()
}

export const actualizarPerfilPublico = onDocumentUpdated(
  'usuarios/{uid}',
  async (event: any) => {
    try {
      const uid = event.params?.uid
      if (!uid) return

      const nuevo = (event.data as any)?.data?.() || {}

      const actualizar = construirActualizacion(nuevo, uid)
      if (!actualizar) return

      const perfilRef = admin.firestore().doc(`perfiles_publicos/${uid}`)
      await perfilRef.set(actualizar, { merge: true })
    } catch (err) {
      console.error('Error en actualizarPerfilPublico:', err)
    }
    return
  }
)
