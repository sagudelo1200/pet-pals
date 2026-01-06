import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'

admin.initializeApp()

// Crear perfil público básico cuando se crea un documento en /usuarios/{uid}
export const alCrearUsuario = onDocumentCreated(
  'usuarios/{uid}',
  async (event: any) => {
    try {
      const uid = event.params?.uid
      const usuarioData = (event.data as any)?.data?.() || {}
      if (!uid) return

      const perfilRef = admin.firestore().doc(`perfil_publico/${uid}`)
      const perfilSnap = await perfilRef.get()

      if (perfilSnap.exists) return

      const datosPerfil = {
        id: uid,
        nombre: usuarioData.nombre || null,
        foto: usuarioData.foto || null,
        verificacion: usuarioData.verificado ? 'verificado' : 'pendiente',
        rating_promedio: 0,
        cantidad_paseos_realizados: 0,
        creado_en: admin.firestore.FieldValue.serverTimestamp(),
        actualizado_en: admin.firestore.FieldValue.serverTimestamp(),
        creado_por: uid,
        actualizado_por: uid,
      }

      await perfilRef.set(datosPerfil, { merge: true })
    } catch (err) {
      console.error('Error en alCrearUsuario:', err)
    }
    return
  }
)

// Actualizar perfil público cuando se edita el documento /usuarios/{uid}
export const alActualizarUsuario = onDocumentUpdated(
  'usuarios/{uid}',
  async (event: any) => {
    try {
      const uid = event.params?.uid
      if (!uid) return

      const nuevo = (event.data as any)?.data?.() || {}

      const actualizar: Record<string, any> = {}
      if ('nombre' in nuevo) actualizar.nombre = nuevo.nombre || null
      if ('foto' in nuevo) actualizar.foto = nuevo.foto || null
      if ('verificado' in nuevo)
        actualizar.verificacion = nuevo.verificado ? 'verificado' : 'pendiente'

      if (Object.keys(actualizar).length === 0) return

      actualizar.actualizado_en = admin.firestore.FieldValue.serverTimestamp()
      actualizar.actualizado_por = uid

      const perfilRef = admin.firestore().doc(`perfil_publico/${uid}`)
      await perfilRef.set(actualizar, { merge: true })
    } catch (err) {
      console.error('Error en alActualizarUsuario:', err)
    }
    return
  }
)
