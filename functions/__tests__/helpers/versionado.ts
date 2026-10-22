/**
 * Siembra una versión vigente con la misma forma que escribe el motor de
 * versionado (comun/versionado.ts), para tests que solo necesitan leerla.
 */
export function sembrarVersion(
  db: any,
  tipo: string,
  version: number,
  contenido: Record<string, unknown>
): void {
  const hash = `sha256:test-${tipo}-${version}`
  db.__seed(`versionados/${tipo}`, {
    tipo,
    version_vigente: version,
    hash_vigente: hash,
  })
  db.__seed(`versionados/${tipo}/versiones/v${version}`, {
    tipo,
    version,
    esquema: 1,
    estado: 'ACTIVA',
    motivo: 'Sembrado en test',
    hash,
    contenido,
    publicado_por: 'test',
  })
}
