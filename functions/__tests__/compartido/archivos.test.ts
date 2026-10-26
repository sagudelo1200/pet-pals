/**
 * Perfiles de archivo: coherencia con storage.rules.
 */
import {readFileSync} from 'fs';
import {resolve} from 'path';
import {
  NOMBRE_ARCHIVO,
  PERFILES_ARCHIVO,
} from '../../src/compartido/archivos';
import {CATALOGO_SERVICIOS, requisitosDe} from '../../src/compartido/servicios';

const reglas = readFileSync(resolve(__dirname, '../../../storage.rules'), 'utf8');

/**
 * Bloque `match` de storage.rules que sigue al comentario de un perfil.
 * @param {string} perfil Perfil (p. ej. 'evidencia').
 * @return {string} Texto del bloque.
 */
function bloqueDe(perfil: string): string {
  const inicio = reglas.indexOf(`Perfil \`${perfil}\``);
  expect(inicio).toBeGreaterThan(-1);
  const siguiente = reglas.indexOf('match /{allPaths=**}', inicio);
  return reglas.slice(inicio, siguiente);
}

describe('storage.rules repite los perfiles de archivo', () => {
  test('todo perfil tiene su bloque en las reglas', () => {
    for (const perfil of Object.keys(PERFILES_ARCHIVO)) bloqueDe(perfil);
  });

  test('tamaño máximo', () => {
    const {max_mb: maxMb} = PERFILES_ARCHIVO.evidencia;
    expect(bloqueDe('evidencia'))
      .toContain(`request.resource.size <= ${maxMb} * 1024 * 1024`);
  });

  test('tipos de contenido permitidos', () => {
    const [, lista] = /contentType\.matches\('([^']+)'\)/
      .exec(bloqueDe('evidencia')) ?? [];
    const permitidos = new RegExp(`^(${lista})$`);
    for (const tipo of PERFILES_ARCHIVO.evidencia.tipos) {
      expect(tipo).toMatch(permitidos);
    }
    expect('text/html').not.toMatch(permitidos);
    expect('application/x-msdownload').not.toMatch(permitidos);
  });

  test('nombre del archivo', () => {
    const [, patron] = /archivo\.matches\('([^']+)'\)/
      .exec(bloqueDe('evidencia')) ?? [];
    expect(`^${patron}$`).toBe(NOMBRE_ARCHIVO.source);
  });

  test('todo lo demás está denegado', () => {
    expect(reglas)
      .toMatch(/match \/\{allPaths=\*\*\} \{\s*allow read, write: if false;/);
  });
});

describe('el catálogo de servicios usa nombres válidos para Storage', () => {
  test('servicios, requisitos y archivos', () => {
    for (const servicio of Object.keys(CATALOGO_SERVICIOS)) {
      expect(servicio).toMatch(/^[a-z0-9_]+$/);
      for (const r of requisitosDe(servicio as keyof typeof CATALOGO_SERVICIOS)) {
        expect(r.id).toMatch(NOMBRE_ARCHIVO);
        for (const archivo of r.evidencia) expect(archivo).toMatch(NOMBRE_ARCHIVO);
      }
    }
  });
});
