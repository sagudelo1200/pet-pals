/**
 * Un solo lugar para lo que depende del rol en la navegación: a qué app
 * entra cada rol y con qué ícono se muestra. Agregar un rol = una línea aquí.
 */
import type { IconProps } from '@/components/ui/Icon'
import type { RolUsuario } from '@/models/Usuario'
import type { AuthStackParamList } from './types'

export const APP_POR_ROL: Record<RolUsuario, keyof AuthStackParamList> = {
  tutor: 'TutorApp',
  cuidador: 'CuidadorApp',
  explorador: 'ExplorerApp',
  admin: 'AdminApp',
  contador: 'ContadorApp',
}

export const ICONO_POR_ROL: Record<RolUsuario, IconProps['name']> = {
  tutor: 'paw',
  cuidador: 'walking',
  explorador: 'map-marked-alt',
  admin: 'shield-alt',
  contador: 'calculator',
}
