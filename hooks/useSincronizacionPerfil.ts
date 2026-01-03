import { useEffect } from 'react'
import { Usuario } from '@/models/Usuario'
import { PerfilPublico } from '@/models/PerfilPublico'
import { GestorPerfilPublico } from '@/logic/usuarios/perfilPublico'

/**
 * Hook para sincronizar el perfil público con el perfil de usuario.
 * Si el usuario no tiene perfil público, lo crea automáticamente.
 * Esto es una medida temporal hasta que se implementen Cloud Functions.
 */
export const useSincronizacionPerfil = (
  usuario: Usuario | null | undefined
) => {
  useEffect(() => {
    if (!usuario) return

    const verificarYCrearPerfilPublico = async () => {
      try {
        // 1. Verificar si existe perfil público
        const res = await GestorPerfilPublico.obtenerPorId(usuario.id)

        // Si ya existe, no hacemos nada (la sincronización de actualizaciones se maneja al editar)
        if (res.success && res.data) return

        const datosPerfil: Partial<PerfilPublico> = {
          nombre: usuario.nombre,
          foto: usuario.foto || null, // Firestore no acepta undefined
          verificacion: usuario.verificado ? 'verificado' : 'pendiente',
          creado_por: usuario.id,
          // Inicializar otros campos opcionales si es necesario
        }

        await GestorPerfilPublico.inicializarPerfil(usuario.id, datosPerfil)
      } catch (error) {
        console.error('Error en sincronización de perfil público:', error)
      }
    }

    verificarYCrearPerfilPublico()
  }, [usuario]) // Se ejecuta cuando cambia el usuario (login o carga inicial)
}
