/**
 * Genera el HTML completo para el mapa interactivo de cobertura del cuidador.
 *
 * Usa Leaflet + h3-js (CDN) — mismo patrón que TerritorioVivo.
 * La selección de celdas se gestiona en JS dentro del WebView.
 * Al guardar, se llama window.ReactNativeWebView.postMessage({ type:'save', cells:[...] })
 */
export function construirHTMLCobertura(
  h3Home: string,
  selectedCellsInit: string[],
  bottomInset: number = 0,
  topInset: number = 0
): string {
  const h3HomeJSON = JSON.stringify(h3Home)
  const selectedJSON = JSON.stringify(selectedCellsInit)
  // Altura del footer nativo incluyendo safe area
  const footerBottom = 14 + bottomInset

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <script src="https://unpkg.com/h3-js@4.1.0/dist/h3-js.umd.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; background: #0A0F0E; overflow: hidden; }
    #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }

    /* Footer flotante */
    #footer {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 1000;
      background: rgba(10,15,14,0.96);
      border-top: 1px solid #1F2D2A;
      padding: 14px 20px ${footerBottom}px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #count-text {
      flex: 1;
      color: #98A7A4;
      font-size: 13px;
    }
    #save-btn {
      background: #1D8F73;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-tap-highlight-color: transparent;
      white-space: nowrap;
    }
    #save-btn:disabled { opacity: 0.5; }

    /* Alejar controles de los bordes del sistema */
    .leaflet-top    { margin-top:    ${topInset}px; }
    .leaflet-bottom { margin-bottom: 80px; }

    /* Popup oscuro */
    .leaflet-popup-content-wrapper {
      background: #121918;
      color: #EBF4F2;
      border: 1px solid #1D8F73;
      border-radius: 8px;
    }
    .leaflet-popup-tip { background: #121918; }
    .popup-id {
      font-size: 10px;
      color: #98A7A4;
      margin-top: 4px;
      font-family: monospace;
    }
  <\/style>
</head>
<body>
  <div id="map"></div>
  <div id="footer">
    <span id="count-text">Cargando…</span>
    <button id="save-btn">Guardar cobertura</button>
  </div>

  <script>
    var H3_HOME    = ${h3HomeJSON};
    var INIT_CELLS = ${selectedJSON};
    var RADIO_MAPA = 3;   // gridDisk k=3 → 37 celdas visibles alrededor del centro

    var SEL_FILL    = '#1D8F73';
    var SEL_STROKE  = '#2DB391';
    var UNS_FILL    = '#1F2D2A';
    var UNS_STROKE  = '#2C3432';

    // Estado local de selección
    var selectedCells = new Set(INIT_CELLS);

    // ── Mapa ─────────────────────────────────────────────────────────────────
    var homeLL = h3.cellToLatLng(H3_HOME);

    var map = L.map('map', {
      center: homeLL,
      zoom: 14,
      zoomControl: false,
    });

    // Controles
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Botón "Mi ubicación"
    var LocateControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: function () {
        var btn = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        btn.innerHTML = '&#x2316;';
        btn.title = 'Mi ubicación';
        btn.style.cssText = [
          'background:#121918','color:#2DB391','cursor:pointer',
          'width:36px','height:36px','display:flex',
          'align-items:center','justify-content:center',
          'font-size:18px','font-weight:700',
          'border:2px solid #1F2D2A','border-radius:4px',
          'user-select:none',
        ].join(';');
        var marker = null;
        L.DomEvent.on(btn, 'click', function () {
          if (!navigator.geolocation) return;
          btn.style.color = '#F59E0B';
          navigator.geolocation.getCurrentPosition(
            function (pos) {
              btn.style.color = '#2DB391';
              map.setView([pos.coords.latitude, pos.coords.longitude], 15);
              if (marker) map.removeLayer(marker);
              marker = L.circleMarker(
                [pos.coords.latitude, pos.coords.longitude],
                { radius: 8, fillColor: '#1D8F73', color: '#2DB391', weight: 2, fillOpacity: 0.9 }
              ).addTo(map);
            },
            function () { btn.style.color = '#C96B67'; }
          );
        });
        L.DomEvent.disableClickPropagation(btn);
        return btn;
      },
    });
    new LocateControl().addTo(map);

    // ── Tiles + botón tema claro/oscuro ───────────────────────
    var isDark = true;
    var tileLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      { maxZoom: 19 }
    ).addTo(map);

    var ThemeControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function () {
        var btn = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        btn.innerHTML = '&#x2600;&#xFE0F;';
        btn.title = 'Cambiar tema';
        btn.style.cssText = [
          'background:#121918','color:#EBF4F2','cursor:pointer',
          'width:36px','height:36px','display:flex',
          'align-items:center','justify-content:center',
          'font-size:16px','line-height:1',
          'border:2px solid #1F2D2A','border-radius:4px',
          'user-select:none',
        ].join(';');
        L.DomEvent.on(btn, 'click', function () {
          isDark = !isDark;
          map.removeLayer(tileLayer);
          tileLayer = L.tileLayer(
            isDark
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
              : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            { maxZoom: 19 }
          ).addTo(map);
          btn.innerHTML     = isDark ? '&#x2600;&#xFE0F;' : '&#x1F319;';
          btn.style.background  = isDark ? '#121918' : '#f8f8f8';
          btn.style.borderColor = isDark ? '#1F2D2A' : '#ccc';
          btn.style.color       = isDark ? '#EBF4F2' : '#333';
        });
        L.DomEvent.disableClickPropagation(btn);
        return btn;
      },
    });
    new ThemeControl().addTo(map);

    // ── Hexágonos ─────────────────────────────────────────────────────────────
    var polyLayer = L.layerGroup().addTo(map);
    var polyMap   = {};   // cellId → L.polygon

    function styleFor(cellId) {
      var sel = selectedCells.has(cellId);
      return {
        color:       sel ? SEL_STROKE : UNS_STROKE,
        fillColor:   sel ? SEL_FILL   : UNS_FILL,
        fillOpacity: sel ? 0.48 : 0.20,
        weight:      sel ? 2    : 1,
        opacity:     1,
      };
    }

    function addCells(cells) {
      cells.forEach(function (cellId) {
        if (polyMap[cellId]) return;
        try {
          var boundary = h3.cellToBoundary(cellId);
          var latlngs  = boundary.map(function (p) { return [p[0], p[1]]; });
          var poly     = L.polygon(latlngs, styleFor(cellId));

          poly.on('click', function () {
            if (selectedCells.has(cellId)) {
              selectedCells.delete(cellId);
            } else {
              selectedCells.add(cellId);
            }
            poly.setStyle(styleFor(cellId));
            updateCount();
          });

          poly.bindPopup(
            '<div style="font-size:11px;font-family:monospace;color:#98A7A4">'
            + cellId + '<\\/div>'
          );

          polyLayer.addLayer(poly);
          polyMap[cellId] = poly;
        } catch (e) {
          console.warn('[cobertura] error celda', cellId, e);
        }
      });
    }

    function refreshStyles() {
      Object.keys(polyMap).forEach(function (id) {
        polyMap[id].setStyle(styleFor(id));
      });
    }

    function updateCount() {
      var n = selectedCells.size;
      document.getElementById('count-text').textContent =
        n + (n === 1 ? ' zona seleccionada' : ' zonas seleccionadas');
    }

    function loadVisible() {
      var center = map.getCenter();
      var centerCell = h3.latLngToCell(center.lat, center.lng, 8);
      var visible = h3.gridDisk(centerCell, RADIO_MAPA);
      // Asegura que las celdas seleccionadas siempre estén visibles
      selectedCells.forEach(function (id) { visible.push(id); });
      addCells(visible);
      refreshStyles();
    }

    // Carga inicial: vecindad del home + celdas ya seleccionadas
    var initVisible = h3.gridDisk(H3_HOME, RADIO_MAPA);
    INIT_CELLS.forEach(function (id) { initVisible.push(id); });
    addCells(initVisible);
    updateCount();

    map.on('moveend', loadVisible);

    // ── Guardar ──────────────────────────────────────────────────────────────
    document.getElementById('save-btn').addEventListener('click', function () {
      var btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.textContent = 'Guardando\u2026';
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'save',
        cells: Array.from(selectedCells),
      }));
    });
  <\/script>
</body>
</html>`
}
