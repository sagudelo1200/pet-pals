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
 * Bloque de storage.rules de un perfil: desde su comentario `Perfil \`x\`` hasta
 * el siguiente perfil o el "todo lo demás denegado".
 * @param {string} perfil Perfil (p. ej. 'evidencia').
 * @return {string} Texto del bloque.
 */
function bloqueDe(perfil: string): string {
  const inicio = reglas.indexOf(`Perfil \`${perfil}\``);
  expect(inicio).toBeGreaterThan(-1);
  const siguientes = [
    reglas.indexOf('Perfil `', inicio + 1),
    reglas.indexOf('match /{allPaths=**}', inicio),
  ].filter((i) => i > -1);
  return reglas.slice(inicio, Math.min(...siguientes));
}

const PERFILES = Object.keys(PERFILES_ARCHIVO) as Array<keyof typeof PERFILES_ARCHIVO>;

describe.each(PERFILES)('storage.rules repite el perfil de archivo "%s"', (perfil) => {
  const limites = PERFILES_ARCHIVO[perfil];

  test('tiene su bloque en las reglas', () => {
    bloqueDe(perfil);
  });

  test('tamaño máximo', () => {
    expect(bloqueDe(perfil))
      .toContain(`request.resource.size <= ${limites.max_mb} * 1024 * 1024`);
  });

  test('tipos de contenido permitidos', () => {
    const [, lista] = /contentType\.matches\('([^']+)'\)/
      .exec(bloqueDe(perfil)) ?? [];
    const permitidos = new RegExp(`^(${lista})$`);
    for (const tipo of limites.tipos) expect(tipo).toMatch(permitidos);
    // y nada más: lo que las reglas aceptan está en el perfil
    for (const tipo of ['text/html', 'application/x-msdownload', 'image/gif']) {
      expect(permitidos.test(tipo)).toBe(limites.tipos.includes(tipo));
    }
  });

  test('nombre del archivo', () => {
    const [, patron] = /archivo\.matches\('([^']+)'\)/
      .exec(bloqueDe(perfil)) ?? [];
    expect(`^${patron}$`).toBe(NOMBRE_ARCHIVO.source);
  });

  test('ni el perfil ni las reglas se pasan de 10 MB', () => {
    expect(limites.max_mb).toBeLessThanOrEqual(10);
  });
});

describe('storage.rules en conjunto', () => {
  test('todo lo demás está denegado', () => {
    expect(reglas)
      .toMatch(/match \/\{allPaths=\*\*\} \{\s*allow read, write: if false;/);
  });

  test('cada bloque de reglas tiene su perfil (no hay reglas sueltas)', () => {
    const enReglas = [...reglas.matchAll(/Perfil `([a-z_]+)`/g)].map((m) => m[1]);
    expect(enReglas.sort()).toEqual([...PERFILES].sort());
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
