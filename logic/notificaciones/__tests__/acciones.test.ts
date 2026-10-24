import { destinoDeAccion } from '../acciones'
import { CATALOGO_NOTIFICACIONES } from '@/functions/src/compartido/notificaciones'

describe('destinoDeAccion', () => {
  it('toda acción del catálogo tiene destino en la app', () => {
    for (const def of Object.values(CATALOGO_NOTIFICACIONES)) {
      expect(destinoDeAccion(def.accion)).not.toBeNull()
    }
  })

  it('una acción desconocida no navega', () => {
    expect(destinoDeAccion('inventada')).toBeNull()
    expect(destinoDeAccion(undefined)).toBeNull()
  })
})
