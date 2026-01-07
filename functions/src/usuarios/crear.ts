import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import {
  construirDatosPerfil,
  extraerDatosUsuarioDesdeEvento,
} from '../comun/camposPublicos'

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp()
}

/**
 * Trigger: crea un `perfil_publico` cuando se
 * crea un documento en `usuarios/{uid}`.
 */
export const crearPerfilPublico = onDocumentCreated(
  'usuarios/{uid}',
  async (event: unknown) => {
    try {
      const params = (event as { params?: { uid?: string } }).params
      const uid = params?.uid
      if (!uid) return

      const usuarioData = extraerDatosUsuarioDesdeEvento(event)

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
