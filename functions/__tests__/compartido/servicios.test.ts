/**
 * Catálogo de servicios y requisitos: coherencia y reglas de Storage.
 */
import {CATALOGO_CONFIGURACION} from '../../src/compartido/configuracion';
import {
  CATALOGO_SERVICIOS,
  erroresDelCatalogo,
  TIPO_PASEO,
  TIPOS_SERVICIO,
  esOperacionDe,
  esPaseo,
  esTipoServicio,
  requisitoDe,
  requisitosDe,
  rutaEvidencia,
  type DefinicionServicio,
} from '../../src/compartido/servicios';

const servicio = (requisitos: DefinicionServicio['requisitos']) =>
  ({prueba: {titulo: 'Prueba', rol: 'cuidador' as const, requisitos}});

const base = {
  id: 'identidad',
  titulo: 'Identidad',
  descripcion: 'x',
  verificacion: 'IDENTIDAD' as const,
  validador: 'manual' as const,
  evidencia: ['frente'],
  vigencia_meses: null,
  obligatorio: true,
};

describe('catálogo de servicios', () => {
  test('el catálogo real está bien armado', () => {
    expect(erroresDelCatalogo()).toEqual([]);
  });

  test('paseo pide correo, perfil, identidad y antecedentes, en ese orden', () => {
    expect(requisitosDe('paseo').map((r) => r.id)).toEqual(
      ['email', 'perfil', 'identidad', 'antecedentes']);
  });

  test('lo que valida el sistema no pide evidencia; lo manual sí', () => {
    expect(requisitoDe('paseo', 'email')?.evidencia).toEqual([]);
    expect(requisitoDe('paseo', 'identidad')?.evidencia).toEqual(['frente', 'reverso']);
  });

  test('esTipoServicio y requisitoDe', () => {
    expect(esTipoServicio('paseo')).toBe(true);
    expect(esTipoServicio('guarderia')).toBe(false);
    expect(esTipoServicio(undefined)).toBe(false);
    expect(requisitoDe('paseo', 'no_existe')).toBeUndefined();
  });

  test('esTipoServicio no acepta nombres heredados de Object', () => {
    for (const heredado of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(esTipoServicio(heredado)).toBe(false);
    }
  });

  test('rutaEvidencia coincide con la ruta que protege storage.rules', () => {
    expect(rutaEvidencia('u1', 'paseo', 'identidad', 'frente'))
      .toBe('habilitaciones/u1/paseo/identidad/frente');
  });
});

describe('vigencias configurables', () => {
  test('cada clave {id}_vigencia_meses de la configuración apunta a un requisito que vence', () => {
    const claves = Object.entries(CATALOGO_CONFIGURACION.habilitaciones.valores)
      .filter(([clave]) => clave.endsWith('_vigencia_meses'));
    expect(claves.length).toBeGreaterThan(0);
    for (const [clave, def] of claves) {
      const id = clave.replace(/_vigencia_meses$/, '');
      const requisito = Object.keys(CATALOGO_SERVICIOS)
        .flatMap((s) => requisitosDe(s as keyof typeof CATALOGO_SERVICIOS))
        .find((r) => r.id === id);
      expect(requisito).toBeDefined();
      expect(requisito?.vigencia_meses).toBe(def.porDefecto);
    }
  });
});

describe('erroresDelCatalogo detecta catálogos mal armados', () => {
  test('sin requisitos obligatorios', () => {
    expect(erroresDelCatalogo(servicio([{...base, obligatorio: false}])))
      .toEqual(expect.arrayContaining([expect.stringContaining('obligatorio')]));
  });

  test('ids repetidos', () => {
    expect(erroresDelCatalogo(servicio([base, base])))
      .toEqual(expect.arrayContaining([expect.stringContaining('repetido')]));
  });

  test('requisito del perfil sin campos, con evidencia o validado por otro', () => {
    const perfil = {...base, verificacion: null, evidencia: [], validador: 'sistema' as const};
    expect(erroresDelCatalogo(servicio([perfil])))
      .toEqual(expect.arrayContaining([expect.stringContaining('campos del perfil')]));
    expect(erroresDelCatalogo(servicio([{...perfil, perfil: ['a'], evidencia: ['frente']}])))
      .toEqual(expect.arrayContaining([expect.stringContaining('ni vence')]));
    expect(erroresDelCatalogo(servicio([{...perfil, perfil: ['a'], validador: 'manual'}])))
      .toEqual(expect.arrayContaining([expect.stringContaining('lo valida el sistema')]));
  });

  test('verificación y perfil a la vez', () => {
    expect(erroresDelCatalogo(servicio([{...base, perfil: ['a']}])))
      .toEqual(expect.arrayContaining([expect.stringContaining('no mezcla')]));
  });

  test('evidencia en lo que valida el sistema, o con nombres inválidos', () => {
    expect(erroresDelCatalogo(servicio([{...base, validador: 'sistema'}])))
      .toEqual(expect.arrayContaining([expect.stringContaining('no lleva evidencia')]));
    expect(erroresDelCatalogo(servicio([{...base, evidencia: ['Frente.jpg']}])))
      .toEqual(expect.arrayContaining([expect.stringContaining('evidencia inválidos')]));
    expect(erroresDelCatalogo(servicio([{...base, evidencia: ['a', 'a']}])))
      .toEqual(expect.arrayContaining([expect.stringContaining('evidencia inválidos')]));
  });

  test('vigencia inválida', () => {
    for (const vigencia_meses of [0, -1, 1.5]) {
      expect(erroresDelCatalogo(servicio([{...base, vigencia_meses}])))
        .toEqual(expect.arrayContaining([expect.stringContaining('vigencia')]));
    }
  });

  test('un proveedor externo se acepta igual que el manual', () => {
    expect(erroresDelCatalogo(servicio([{...base, validador: 'sumsub'}]))).toEqual([]);
  });
});

describe('tipo de operación', () => {
  test('TIPO_PASEO es un servicio del catálogo (así no se desalinean)', () => {
    expect(esTipoServicio(TIPO_PASEO)).toBe(true);
    expect(TIPOS_SERVICIO).toContain(TIPO_PASEO);
    expect(TIPO_PASEO).toBe('paseo');
  });

  test('esPaseo y esOperacionDe miran solo el tipo', () => {
    expect(esPaseo({tipo: 'paseo', estado: 'PENDIENTE'})).toBe(true);
    expect(esOperacionDe({tipo: 'paseo'}, 'paseo')).toBe(true);
    expect(esPaseo({tipo: 'guarderia'})).toBe(false);
    expect(esPaseo({tipo: 'PASEO'})).toBe(false);
    expect(esPaseo({})).toBe(false);
    expect(esPaseo(null)).toBe(false);
    expect(esPaseo(undefined)).toBe(false);
  });
});
