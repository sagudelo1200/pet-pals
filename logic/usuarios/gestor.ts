import { ServicioUsuario } from '@/services/firebase'
import { Usuario, RolUsuario } from '@/models/Usuario'
import { PerfilPublico } from '@/models/PerfilPublico'
import {
  agregarUbicacionRef,
  fijarPrincipalRef,
  eliminarUbicacionRef,
} from '@/logic/ubicaciones/referencias'
import { CrudResult } from '@/services/firebase/comun'
import { GestorPerfilPublico } from './perfilPublico'

// Códigos de error usados internamente por este gestor.
// Devuelven códigos (no mensajes) para que la capa que llama pueda mapear a i18n.
export const CODIGOS_ERROR_USUARIO = {
  NO_ENCONTRADO: 'USUARIO_NO_ENCONTRADO',
  ADMIN_EXCLUSIVO: 'ADMIN_EXCLUSIVO',
  /** Ser cuidador pasa por la habilitación: no se asigna desde la app. */
  REQUIERE_HABILITACION: 'REQUIERE_HABILITACION',
} as const

export const GestorUsuarios = {
  obtenerClaveI18nErrorUsuario(error?: string | null) {
    if (!error) return null
    switch (error) {
      case CODIGOS_ERROR_USUARIO.NO_ENCONTRADO:
        return 'usuarios:errores.usuario_no_encontrado'
      default:
        return null
    }
  },

  async agregarRol(
    uid: string,
    nuevoRol: RolUsuario
  ): Promise<CrudResult<void>> {
    try {
      // El rol de cuidador lo otorga el servidor al aprobar la habilitación
      if (nuevoRol === 'cuidador') {
        return {
          success: false,
          error: CODIGOS_ERROR_USUARIO.REQUIERE_HABILITACION,
        }
      }

      const userRes = await ServicioUsuario.obtenerPorId(uid)
      if (!userRes.success || !userRes.data)
        return { success: false, error: CODIGOS_ERROR_USUARIO.NO_ENCONTRADO }

      const usuario = userRes.data
      const rolesActuales = usuario.roles || []

      // Si ya tiene el rol, no hacer nada
      if (rolesActuales.includes(nuevoRol)) {
        return { success: true }
      }

      // Exclusividad: un admin no ofrece servicios (cuidador), pero SÍ puede
      // ser tutor y explorador
      if (nuevoRol === 'admin' && rolesActuales.includes('cuidador')) {
        return { success: false, error: 'ADMIN_EXCLUSIVO' }
      }

      // Agregar el nuevo rol
      const nuevosRoles = [...rolesActuales, nuevoRol]

      // Actualizar usuario
      const resUsuario = await ServicioUsuario.actualizar(uid, {
        roles: nuevosRoles,
      })

      if (!resUsuario.success)
        return { success: false, error: resUsuario.error }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: String(e) }
    }
  },

  async actualizarPerfilCompleto(
    uid: string,
    datosUsuario: Partial<Usuario>
  ): Promise<CrudResult<void>> {
    try {
      // Preparar datos para usuario
      const datosUsuarioDb: Partial<Usuario> = { ...datosUsuario }

      // Preparar perfil publicable si aplica
      const datosPerfilPublico: Partial<PerfilPublico> = {}
      if (datosUsuario.nombre) datosPerfilPublico.nombre = datosUsuario.nombre
      if (datosUsuario.foto) datosPerfilPublico.foto = datosUsuario.foto

      // Delegar al servicio para commit atómico de DB (servicio solo escribe)
      return await ServicioUsuario.commitPerfilBatch(
        uid,
        datosUsuarioDb,
        datosPerfilPublico
      )
    } catch (e: any) {
      return { success: false, error: String(e) }
    }
  },

  async agregarUbicacion(
    userId: string,
    ubicacionId: string,
    alias?: string,
    coordenadas?: { latitude: number; longitude: number },
    direccion_formateada?: string,
    h3_r8?: string
  ): Promise<CrudResult<Usuario>> {
    try {
      const userRes = await ServicioUsuario.obtenerPorId(userId)
      if (!userRes.success || !userRes.data)
        return { success: false, error: CODIGOS_ERROR_USUARIO.NO_ENCONTRADO }

      const usuario = userRes.data
      const { lista, idPrincipal } = agregarUbicacionRef(
        usuario.ubicaciones || [],
        ubicacionId,
        alias,
        coordenadas,
        direccion_formateada,
        h3_r8
      )

      const resUsuario = await ServicioUsuario.actualizar(userId, {
        ubicaciones: lista,
        id_ubicacion_principal: idPrincipal,
      })

      if (!resUsuario.success) return resUsuario

      // Si es la primera ubicación o es principal y tiene h3_r8, sincronizar al PerfilPublico
      if (h3_r8 && idPrincipal === ubicacionId) {
        await GestorPerfilPublico.actualizar(userId, { h3_r8 })
      }

      return resUsuario
    } catch (e: any) {
      return { success: false, error: String(e) }
    }
  },

  async fijarUbicacionPrincipal(
    userId: string,
    ubicacionId: string
  ): Promise<CrudResult<Usuario>> {
    try {
      const userRes = await ServicioUsuario.obtenerPorId(userId)
      if (!userRes.success || !userRes.data)
        return { success: false, error: CODIGOS_ERROR_USUARIO.NO_ENCONTRADO }

      const usuario = userRes.data
      const { lista, idPrincipal } = fijarPrincipalRef(
        usuario.ubicaciones || [],
        ubicacionId
      )

      const resUsuario = await ServicioUsuario.actualizar(userId, {
        ubicaciones: lista,
        id_ubicacion_principal: idPrincipal,
      })

      if (!resUsuario.success) return resUsuario

      // Sincronizar h3_r8 de la nueva ubicación principal al PerfilPublico
      const ubicacionPrincipal = lista.find(u => u.ubicacion_id === idPrincipal)
      if (ubicacionPrincipal?.h3_r8) {
        await GestorPerfilPublico.actualizar(userId, {
          h3_r8: ubicacionPrincipal.h3_r8,
        })
      }

      return resUsuario
    } catch (e: any) {
      return { success: false, error: String(e) }
    }
  },

  async eliminarUbicacion(
    userId: string,
    ubicacionId: string
  ): Promise<CrudResult<Usuario>> {
    try {
      const userRes = await ServicioUsuario.obtenerPorId(userId)
      if (!userRes.success || !userRes.data)
        return { success: false, error: CODIGOS_ERROR_USUARIO.NO_ENCONTRADO }

      const usuario = userRes.data
      const { lista, idPrincipal } = eliminarUbicacionRef(
        usuario.ubicaciones || [],
        ubicacionId
      )

      return ServicioUsuario.actualizar(userId, {
        ubicaciones: lista,
        id_ubicacion_principal: idPrincipal ?? undefined,
      })
    } catch (e: any) {
      return { success: false, error: String(e) }
    }
  },
}
