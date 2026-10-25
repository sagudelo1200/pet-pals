import {
  CARTO_TILES,
  CARTO_ATRIBUCION,
  CSS_ATRIBUCION,
  JS_ATRIBUCION,
} from '@/services/maps/carto'

/** Celda que ya es de otra zona (se muestra en gris y no se puede tomar). */
export interface CeldaAjena {
  celda: string
  nombre: string
}

interface Opciones {
  /** Dónde centrar el mapa. */
  centro: [number, number]
  celdas: string[]
  excluidas: string[]
  ajenas: CeldaAjena[]
  topInset?: number
  bottomInset?: number
}

/**
 * HTML del mapa donde el admin pinta una zona (Leaflet + h3-js por CDN, igual
 * que el mapa de cobertura del cuidador).
 *
 * - Escala "Barrios" (R7) para la zona y "Ajuste fino" (R8) para afinar.
 * - "Agregar" suma o quita celdas de la zona; "Excluir" abre un hueco dentro
 *   de lo que la zona ya cubre.
 * - Una celda fina dentro de un barrio de otra zona SÍ se puede tomar (gana la
 *   más específica); una celda que ya es de otra zona, no.
 * - Al guardar manda `{type:'save', celdas, excluidas}` a la app.
 */
export function construirHTMLEditorZona({
  centro,
  celdas,
  excluidas,
  ajenas,
  topInset = 0,
  bottomInset = 0,
}: Opciones): string {
  // Los nombres vienen de la base: se evita que un "</script>" rompa la página
  const datos = JSON.stringify({ centro, celdas, excluidas, ajenas }).replace(
    /</g,
    '\\u003c'
  )
  const pie = 12 + bottomInset

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/h3-js@4.1.0/dist/h3-js.umd.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; background: #0A0F0E; overflow: hidden; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
    #pie {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000;
      background: rgba(10,15,14,0.96); border-top: 1px solid #1F2D2A;
      padding: 10px 14px ${pie}px; display: flex; flex-direction: column; gap: 8px;
    }
    .fila { display: flex; align-items: center; gap: 8px; }
    .grupo { display: flex; flex: 1; border: 1px solid #2C3432; border-radius: 8px; overflow: hidden; }
    .grupo button {
      flex: 1; padding: 9px 4px; font-size: 12px; font-weight: 600; border: none;
      background: #121918; color: #98A7A4; -webkit-tap-highlight-color: transparent;
    }
    .grupo button.activo { background: #1D8F73; color: #fff; }
    .grupo button.activo.excluir { background: #C96B67; }
    #conteo { flex: 1; color: #98A7A4; font-size: 12px; }
    #guardar {
      background: #1D8F73; color: #fff; border: none; border-radius: 10px;
      padding: 11px 20px; font-size: 14px; font-weight: 700; white-space: nowrap;
    }
    #guardar:disabled { opacity: 0.5; }
    #aviso {
      position: fixed; top: ${topInset + 8}px; left: 50%; transform: translateX(-50%);
      z-index: 1100; background: rgba(18,25,24,0.95); color: #EBF4F2;
      border: 1px solid #C9AA45; border-radius: 8px; padding: 8px 12px;
      font-size: 12px; display: none; max-width: 90%; text-align: center;
    }
    ${CSS_ATRIBUCION}
    .leaflet-top { margin-top: ${topInset}px; }
    .leaflet-bottom { margin-bottom: 120px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="aviso"></div>
  <div id="pie">
    <div class="fila">
      <div class="grupo" id="escala">
        <button data-escala="7" class="activo">Barrios</button>
        <button data-escala="8">Ajuste fino</button>
      </div>
      <div class="grupo" id="accion">
        <button data-accion="agregar" class="activo">Agregar</button>
        <button data-accion="excluir" class="excluir">Excluir</button>
      </div>
    </div>
    <div class="fila">
      <span id="conteo"></span>
      <button id="guardar">Guardar zona</button>
    </div>
  </div>

  <script>
    var DATOS = ${datos};
    var celdas = new Set(DATOS.celdas);
    var excluidas = new Set(DATOS.excluidas);
    var ajenas = {};
    DATOS.ajenas.forEach(function (a) { ajenas[a.celda] = a.nombre; });

    var escala = 7;            // 7 = barrios, 8 = ajuste fino
    var accion = 'agregar';    // 'agregar' | 'excluir'
    var MAX_HEXAGONOS = 600;
    var ZOOM_MINIMO = { 7: 11, 8: 13 };

    var map = L.map('map', { center: DATOS.centro, zoom: 13, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('${CARTO_TILES.oscuro}', {
      maxZoom: 19, attribution: '${CARTO_ATRIBUCION}'
    }).addTo(map);
${JS_ATRIBUCION}

    var capa = L.layerGroup().addTo(map);
    var poligonos = {};

    // Quién manda sobre una celda: ella y sus padres, la más específica primero
    function cadena(celda) {
      var res = h3.getResolution(celda);
      var lista = [celda];
      [8, 7].forEach(function (r) {
        if (r < res) lista.push(h3.cellToParent(celda, r));
      });
      return lista;
    }

    function estadoDe(celda) {
      var lista = cadena(celda);
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        var directa = c === celda;
        if (excluidas.has(c)) return { tipo: 'hueco', directa: directa };
        if (celdas.has(c)) return { tipo: 'propia', directa: directa };
        if (ajenas[c]) return { tipo: 'ajena', directa: directa, nombre: ajenas[c] };
      }
      return { tipo: 'libre', directa: false };
    }

    function estilo(celda) {
      var e = estadoDe(celda);
      if (e.tipo === 'propia') {
        return e.directa
          ? { color: '#2DB391', fillColor: '#1D8F73', fillOpacity: 0.55, weight: 2 }
          : { color: '#2DB391', fillColor: '#1D8F73', fillOpacity: 0.22, weight: 1 };
      }
      if (e.tipo === 'hueco') {
        return { color: '#C96B67', fillColor: '#C96B67', fillOpacity: e.directa ? 0.5 : 0.25, weight: 2 };
      }
      if (e.tipo === 'ajena') {
        return { color: '#6B7A99', fillColor: '#6B7A99', fillOpacity: e.directa ? 0.4 : 0.18, weight: 1 };
      }
      return { color: '#2C3432', fillColor: '#1F2D2A', fillOpacity: 0.12, weight: 1 };
    }

    function avisar(texto) {
      var el = document.getElementById('aviso');
      el.textContent = texto;
      el.style.display = 'block';
      clearTimeout(avisar.t);
      avisar.t = setTimeout(function () { el.style.display = 'none'; }, 2800);
    }

    function alternar(celda) {
      var e = estadoDe(celda);
      if (accion === 'agregar') {
        if (ajenas[celda]) { avisar('Esta celda ya es de la zona "' + ajenas[celda] + '"'); return; }
        if (celdas.has(celda)) { celdas.delete(celda); }
        else { excluidas.delete(celda); celdas.add(celda); }
      } else {
        if (excluidas.has(celda)) { excluidas.delete(celda); }
        else {
          var cubierta = cadena(celda).slice(1).some(function (c) { return celdas.has(c); });
          if (!cubierta) { avisar('Solo se puede excluir dentro de lo que la zona ya cubre'); return; }
          celdas.delete(celda);
          excluidas.add(celda);
        }
      }
      restilar();
      actualizarConteo();
    }

    function restilar() {
      Object.keys(poligonos).forEach(function (id) { poligonos[id].setStyle(estilo(id)); });
    }

    function actualizarConteo() {
      var n = celdas.size, m = excluidas.size;
      document.getElementById('conteo').textContent =
        n + (n === 1 ? ' celda' : ' celdas') + (m ? ' · ' + m + (m === 1 ? ' excluida' : ' excluidas') : '');
    }

    function dibujar() {
      capa.clearLayers();
      poligonos = {};
      if (map.getZoom() < ZOOM_MINIMO[escala]) {
        avisar('Acerca el mapa para ver las celdas de esta escala');
        return;
      }
      var b = map.getBounds();
      var contorno = [
        [b.getSouth(), b.getWest()], [b.getNorth(), b.getWest()],
        [b.getNorth(), b.getEast()], [b.getSouth(), b.getEast()]
      ];
      var visibles = h3.polygonToCells(contorno, escala);
      if (visibles.length > MAX_HEXAGONOS) {
        avisar('Acerca el mapa para ver las celdas de esta escala');
        return;
      }
      visibles.forEach(function (celda) {
        var limites = h3.cellToBoundary(celda).map(function (p) { return [p[0], p[1]]; });
        var poligono = L.polygon(limites, estilo(celda));
        poligono.on('click', function () { alternar(celda); });
        capa.addLayer(poligono);
        poligonos[celda] = poligono;
      });
    }

    function elegir(grupoId, atributo, valor) {
      document.querySelectorAll('#' + grupoId + ' button').forEach(function (b) {
        b.classList.toggle('activo', b.getAttribute(atributo) === String(valor));
      });
    }

    document.querySelectorAll('#escala button').forEach(function (b) {
      b.addEventListener('click', function () {
        escala = Number(b.getAttribute('data-escala'));
        elegir('escala', 'data-escala', escala);
        if (escala === 8 && map.getZoom() < ZOOM_MINIMO[8]) map.setZoom(ZOOM_MINIMO[8]);
        else dibujar();
      });
    });
    document.querySelectorAll('#accion button').forEach(function (b) {
      b.addEventListener('click', function () {
        accion = b.getAttribute('data-accion');
        elegir('accion', 'data-accion', accion);
      });
    });

    document.getElementById('guardar').addEventListener('click', function () {
      var boton = document.getElementById('guardar');
      boton.disabled = true;
      boton.textContent = 'Guardando\\u2026';
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'save',
        celdas: Array.from(celdas),
        excluidas: Array.from(excluidas)
      }));
    });

    map.on('moveend', dibujar);
    actualizarConteo();
    dibujar();
  </script>
</body>
</html>`
}
