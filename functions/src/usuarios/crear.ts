import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import { construirDatosPerfil } from '../comun/camposPublicos'

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp()
}

export const crearPerfilPublico = onDocumentCreated(
  'usuarios/{uid}',
  async (event: any) => {
    try {
      const uid = event.params?.uid
      const usuarioData = (event.data as any)?.data?.() || {}
      if (!uid) return

      const perfilRef = admin.firestore().doc(`perfiles_publicos/${uid}`)
      const perfilSnap = await perfilRef.get()

      if (perfilSnap.exists) return

      const datosPerfil = construirDatosPerfil(uid, usuarioData)

      await perfilRef.set(datosPerfil, { merge: true })
    } catch (err) {
      console.error('Error en crearPerfilPublico:', err)
    }
    return
  }
)
