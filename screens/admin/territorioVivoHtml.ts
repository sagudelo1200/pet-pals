import type { ZonaH3 } from '@/services/firebase/firestore/colecciones/h3_zonas'

// ─── Paleta de colores por estado ────────────────────────────────────────────
export const COLORES_ESTADO: Record<
  string,
  { fill: string; opacity: number; label: string }
> = {
  sin_actividad: { fill: '#6B7280', opacity: 0.25, label: 'Sin actividad' },
  disponible: { fill: '#1D8F73', opacity: 0.5, label: 'Disponible' },
  sin_cobertura: { fill: '#C96B67', opacity: 0.6, label: 'Sin cobertura' },
  activa: { fill: '#3B82F6', opacity: 0.55, label: 'Activa' },
  en_operacion: { fill: '#F59E0B', opacity: 0.7, label: 'En operación' },
}

// ─── Constructor del HTML de Leaflet ─────────────────────────────────────────
export function construirHTML(zonas: ZonaH3[]): string {
  const zonasJSON = JSON.stringify(
    zonas.map(z => ({
      id: z.indice_celda,
      estado: z.estado,
      cuidadores: z.cuidadores_count,
      demanda: z.demanda_total,
      activos: z.paseos_activos,
      total: z.paseos_total,
    }))
  )

  const coloresJSON = JSON.stringify(COLORES_ESTADO)

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
    html, body { height: 100%; background: #0A0F0E; }
    #map { height: 100%; width: 100%; }

    /* Leyenda */
    .leyenda {
      background: rgba(18,25,24,0.92);
      border: 1px solid #1F2D2A;
      border-radius: 8px;
      padding: 10px 12px;
      font-family: sans-serif;
      font-size: 11px;
      color: #EBF4F2;
      line-height: 1.8;
    }
    .leyenda-item { display: flex; align-items: center; gap: 7px; }
    .leyenda-dot {
      width: 12px; height: 12px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    /* Popup */
    .leaflet-popup-content-wrapper {
      background: #121918;
      color: #EBF4F2;
      border: 1px solid #1D8F73;
      border-radius: 8px;
    }
    .leaflet-popup-tip { background: #121918; }
    .popup-titulo {
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 6px;
      color: #2DB391;
    }
    .popup-fila { font-size: 12px; margin-bottom: 3px; }
  <\/style>
</head>
<body>
  <div id="map"></div>
  <script>
    var ZONAS   = ${zonasJSON};
    var COLORES = ${coloresJSON};

    var map = L.map('map', {
      center: [4.666, -74.052],
      zoom: 12,
      zoomControl: false,
    });

    // Zoom abajo-derecha
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Botón "Mi ubicación" — encima del zoom (se apila hacia arriba por ser bottomright)
    var LocateControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: function(map) {
        var btn = L.DomUtil.create('div', 'leaflet-bar leaflet-control locate-btn');
        btn.innerHTML = '&#x2316;';
        btn.title = 'Mi ubicación';
        btn.style.cssText = [
          'background:#121918',
          'color:#2DB391',
          'cursor:pointer',
          'width:36px',
          'height:36px',
          'display:flex',
          'align-items:center',
          'justify-content:center',
          'font-size:18px',
          'font-weight:700',
          'border:2px solid #1F2D2A',
          'border-radius:4px',
          'user-select:none',
        ].join(';');

        var marker = null;

        L.DomEvent.on(btn, 'click', function() {
          if (!navigator.geolocation) return;
          btn.style.color = '#F59E0B';
          navigator.geolocation.getCurrentPosition(
            function(pos) {
              btn.style.color = '#2DB391';
              var lat = pos.coords.latitude;
              var lng = pos.coords.longitude;
              map.setView([lat, lng], 14);
              if (marker) map.removeLayer(marker);
              marker = L.circleMarker([lat, lng], {
                radius: 8,
                fillColor: '#1D8F73',
                color: '#2DB391',
                weight: 2,
                fillOpacity: 0.9,
              }).addTo(map).bindPopup('Mi ubicación').openPopup();
            },
            function() { btn.style.color = '#C96B67'; }
          );
        });

        L.DomEvent.disableClickPropagation(btn);
        return btn;
      },
    });
    new LocateControl().addTo(map);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
      }
    ).addTo(map);

    // ── Leyenda ───────────────────────────────────────────────
    var leyenda = L.control({ position: 'bottomleft' });
    leyenda.onAdd = function() {
      var div = L.DomUtil.create('div', 'leyenda');
      var estados = Object.keys(COLORES);
      var html = '<strong style="display:block;margin-bottom:6px">Estado de zonas<\\/strong>';
      estados.forEach(function(k) {
        var c = COLORES[k];
        html += '<div class="leyenda-item">'
          + '<div class="leyenda-dot" style="background:' + c.fill
          + ';opacity:' + (c.opacity + 0.3) + '"><\\/div>'
          + c.label
          + '<\\/div>';
      });
      div.innerHTML = html;
      return div;
    };
    leyenda.addTo(map);

    // ── Renderizado de zonas ──────────────────────────────────
    var polygons = L.layerGroup().addTo(map);
    var bounds   = [];

    ZONAS.forEach(function(zona) {
      try {
        var boundary = h3.cellToBoundary(zona.id);
        var latlngs  = boundary.map(function(p) { return [p[0], p[1]]; });
        var c = COLORES[zona.estado] || COLORES['sin_actividad'];

        var poly = L.polygon(latlngs, {
          color:       c.fill,
          fillColor:   c.fill,
          fillOpacity: c.opacity,
          weight:      1.5,
          opacity:     0.85,
        });

        var estadoLabel = (COLORES[zona.estado] || {}).label || zona.estado;
        poly.bindPopup(
          '<div class="popup-titulo">' + estadoLabel.toUpperCase() + '<\\/div>'
          + '<div class="popup-fila">🐕 Cuidadores: <b>' + zona.cuidadores + '<\\/b><\\/div>'
          + '<div class="popup-fila">📋 Demanda: <b>'    + zona.demanda   + '<\\/b><\\/div>'
          + '<div class="popup-fila">🦮 Activos: <b>'    + zona.activos   + '<\\/b><\\/div>'
          + '<div class="popup-fila">✅ Total paseos: <b>'+ zona.total    + '<\\/b><\\/div>'
          + '<div class="popup-fila" style="margin-top:4px;font-size:10px;color:#98A7A4">'
          + zona.id + '<\\/div>'
        );

        polygons.addLayer(poly);
        latlngs.forEach(function(ll) { bounds.push(ll); });
      } catch(e) {
        console.warn('Error dibujando zona', zona.id, e);
      }
    });

    // Auto-fit a las zonas cargadas
    if (bounds.length > 0) {
      try { map.fitBounds(bounds, { padding: [30, 30] }); } catch(e) {}
    }
  <\/script>
</body>
</html>`
}
