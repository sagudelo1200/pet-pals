import { destinoDeAccion } from '../acciones'
import { CATALOGO_NOTIFICACIONES } from '@/functions/src/compartido/notificaciones'

describe('destinoDeAccion', () => {
  it('toda acción del catálogo tiene destino en la app', () => {
    for (const def of Object.values(CATALOGO_NOTIFICACIONES)) {
      // los avisos de un paseo necesitan su id para saber a qué paseo ir
      expect(destinoDeAccion(def.accion, { paseo_id: 'p1' })).not.toBeNull()
    }
  })

  it('una acción desconocida no navega', () => {
    expect(destinoDeAccion('inventada')).toBeNull()
    expect(destinoDeAccion(undefined)).toBeNull()
  })
})

describe('destinos que no dependen del rol activo', () => {
  it('los avisos de habilitación abren Mi habilitación, que existe en todos los roles', () => {
    expect(destinoDeAccion('abrir_habilitacion')).toEqual({
      pantalla: 'MiHabilitacion',
      params: { servicio: 'paseo' },
    })
  })

  it('los avisos por rol abren la pestaña de su app', () => {
    expect(destinoDeAccion('abrir_solicitudes_cuidador')).toEqual({
      pantalla: 'CuidadorApp',
      params: { screen: 'Solicitudes' },
    })
  })
})

describe('avisos de un paseo', () => {
  it('abren el paseo o su chat con el id que trae el aviso', () => {
    expect(destinoDeAccion('abrir_paseo', { paseo_id: 'p1' })).toEqual({
      pantalla: 'PaseoActivo',
      params: { paseoId: 'p1' },
    })
    expect(destinoDeAccion('abrir_chat', { paseo_id: 'p1' })).toEqual({
      pantalla: 'Chat',
      params: { paseoId: 'p1' },
    })
  })

  it('sin id de paseo no navegan: solo se marca como leído', () => {
    expect(destinoDeAccion('abrir_paseo')).toBeNull()
    expect(destinoDeAccion('abrir_paseo', { paseo_id: '' })).toBeNull()
    expect(destinoDeAccion('abrir_chat', { otro: 1 })).toBeNull()
  })
})
