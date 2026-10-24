/**
 * Reglas de la bandeja usuarios/{uid}/notificaciones y sus datos asociados
 * (dispositivos y preferencias): el servidor crea los avisos, el dueño solo
 * lee y marca como leído.
 */
// Jest se ejecuta desde la raíz del proyecto
const { readFileSync } = require('fs')

describe('reglas de notificaciones', () => {
  const reglas: string = readFileSync('firestore.rules', 'utf8')
  /** Cuerpo del bloque `match <ruta> {` hasta su cierre. */
  const bloque = (ruta: string): string => {
    const inicio = reglas.indexOf(`match ${ruta} {`)
    expect(inicio).toBeGreaterThan(-1)
    return reglas.slice(inicio).split(/\n {6,8}\}/)[0]
  }

  it('solo el dueño lee su bandeja', () => {
    expect(bloque('/notificaciones/{id}')).toMatch(
      /allow read: if es_mismo_uid\(uid\)/
    )
  })

  it('el dueño solo puede cambiar leido y leido_en', () => {
    expect(bloque('/notificaciones/{id}')).toMatch(
      /affectedKeys\(\)\.hasOnly\(\['leido', 'leido_en'\]\)/
    )
  })

  it('los clientes no crean ni borran avisos', () => {
    expect(bloque('/notificaciones/{id}')).toMatch(
      /allow create, delete: if false/
    )
  })

  it('cada dispositivo es solo del dueño y limita los campos', () => {
    const dispositivos = bloque('/dispositivos/{id}')
    expect(dispositivos).toMatch(/allow read: if es_mismo_uid\(uid\)/)
    expect(dispositivos).toMatch(
      /keys\(\)\.hasOnly\(\['token', 'plataforma', 'activo', 'actualizado_en'\]\)/
    )
  })

  it('las preferencias son del dueño, solo push/email y booleanas', () => {
    const preferencias = bloque('/preferencias/{doc}')
    expect(preferencias).toMatch(/allow read: if es_mismo_uid\(uid\)/)
    expect(preferencias).toMatch(/keys\(\)\.hasOnly\(\['push', 'email'\]\)/)
    expect(preferencias).toMatch(/get\('push', true\) is bool/)
    expect(preferencias).toMatch(/get\('email', true\) is bool/)
  })
})
