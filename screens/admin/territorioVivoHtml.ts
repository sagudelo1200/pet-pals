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

// ─── Función para color por índice de inteligencia (0-100) ─────────────────
function _colorPorIndice(valor: number | undefined): {
  fill: string
  opacity: number
} {
  if (valor === undefined || valor === null) {
    return { fill: '#6B7280', opacity: 0.25 } // Gris: sin datos
  }
  // Verde (alto) -> Amarillo -> Rojo (bajo)
  if (valor >= 70) return { fill: '#10B981', opacity: 0.6 } // Verde
  if (valor >= 50) return { fill: '#F59E0B', opacity: 0.55 } // Amarillo
  if (valor >= 30) return { fill: '#F97316', opacity: 0.55 } // Naranja
  return { fill: '#EF4444', opacity: 0.5 } // Rojo
}

// ─── Constructor del HTML de Leaflet ─────────────────────────────────────────
export function construirHTML(
  zonas: ZonaH3[],
  topInset: number = 0,
  bottomInset: number = 0
): string {
  // Debug: Log de la estructura raw
  console.log('[DEBUG] Zonas recibidas:', zonas.length)
  console.log('[DEBUG] Primera zona raw:', zonas[0])

  // Debug de cada zona (primeras 3)
  zonas.slice(0, 3).forEach((z, idx) => {
    console.log(`[DEBUG] Zona[${idx}]:`, {
      h3_r9: z.h3_r9,
      h3_r8: z.h3_r8,
      estado: z.operativa?.estado,
      narrativa_existe: !!z.narrativa,
      operativa_existe: !!z.operativa,
    })
  })

  const zonasJSON = JSON.stringify(
    zonas.map(z => ({
      id_r8: z.h3_r8,
      id_r9: z.h3_r9,
      estado: z.operativa?.estado,
      cuidadores: z.operativa?.cuidadores_count || 0,
      demanda: z.operativa?.demanda_total || 0,
      activos: z.operativa?.paseos_activos || 0,
      total: z.operativa?.paseos_total || 0,
      // Inteligencia territorial
      bienestar: z.narrativa?.indices?.bienestar,
      seguridad: z.narrativa?.indices?.seguridad,
      actividad: z.narrativa?.indices?.actividad,
      socializacion: z.narrativa?.indices?.socializacion,
      tipo: z.narrativa?.identidad?.tipo,
      eventos: z.narrativa?.total_eventos || 0,
    }))
  )

  const coloresJSON = JSON.stringify(COLORES_ESTADO)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <script src="https://unpkg.com/h3-js@4.1.0/dist/h3-js.umd.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; width: 100%; background: #0A0F0E; overflow: hidden; }
    #map { height: 100%; width: 100%; }
    .leaflet-top { margin-top: ${topInset}px; }
    .leaflet-bottom { margin-bottom: ${bottomInset}px; }
    
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
  </style>
</head>
<body>
  <div id="map"><\/div>
  <div id="debug-toggle" style="position:absolute;top:52px;right:12px;background:#0A3F37;color:#2DB391;border:2px solid #2DB391;border-radius:4px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;font-weight:700;z-index:9998;user-select:none;">▼</div>
  <div id="debug" style="position:absolute;top:96px;right:0;width:280px;height:300px;background:rgba(10,15,14,0.95);color:#2DB391;border-left:2px solid #2DB391;border:2px solid #2DB391;border-radius:0;padding:12px;font-family:monospace;font-size:10px;overflow-y:auto;z-index:9999;display:flex;flex-direction:column;box-sizing:border-box;"></div>
  <script>
    var debugVisible = true;
    var debugEl = document.getElementById('debug');
    var debugToggle = document.getElementById('debug-toggle');
    
    debugToggle.addEventListener('click', function() {
      debugVisible = !debugVisible;
      if (debugVisible) {
        debugEl.style.display = 'flex';
        debugToggle.innerHTML = '▼';
      } else {
        debugEl.style.display = 'none';
        debugToggle.innerHTML = '◀';
      }
    });

    function debug(msg) {
      if (debugEl) {
        var line = document.createElement('div');
        line.textContent = msg;
        line.style.marginBottom = '4px';
        debugEl.appendChild(line);
        debugEl.scrollTop = debugEl.scrollHeight;
      }
      console.log('[TerritorioVivo]', msg);
    }

    debug('🚀 Iniciando carga...');
    
    var ZONAS   = ${zonasJSON};
    var COLORES = ${coloresJSON};

    debug('📊 Total zonas: ' + ZONAS.length);
    
    // Debug detallado de primeras zonas
    if (ZONAS.length === 0) {
      debug('❌ ¡LA COLECCIÓN ESTÁ VACÍA!');
      debug('⚠️ Verifica Firestore y los permisos');
    } else {
      debug('✅ Datos disponibles en Firestore');
      for (var i = 0; i < Math.min(2, ZONAS.length); i++) {
        var z = ZONAS[i];
        debug('  Z[' + i + ']: r9=' + (z.id_r9 ?? '❌UNDEF') + ' r8=' + (z.id_r8 ?? '❌UNDEF'));
      }
    }

    var map = L.map('map', {
      center: [6.2442, -75.5812],
      zoom: 12,
      zoomControl: false,
    });

    debug('🗺️ Mapa listo');

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // ── Botón Localización ────────────────────────
    var LocateControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: function(map) {
        var btn = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        btn.innerHTML = '&#x2316;';
        btn.title = 'Mi ubicación';
        btn.style.cssText = 'background:#121918;color:#2DB391;cursor:pointer;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;border:2px solid #1F2D2A;border-radius:4px;user-select:none;';
        var marker = null;
        L.DomEvent.on(btn, 'click', function() {
          if (!navigator.geolocation) return;
          btn.style.color = '#F59E0B';
          navigator.geolocation.getCurrentPosition(function(pos) {
            btn.style.color = '#2DB391';
            var lat = pos.coords.latitude;
            var lng = pos.coords.longitude;
            map.setView([lat, lng], 14);
            if (marker) map.removeLayer(marker);
            marker = L.circleMarker([lat, lng], {radius: 8, fillColor: '#1D8F73', color: '#2DB391', weight: 2, fillOpacity: 0.9}).addTo(map).bindPopup('Mi ubicación').openPopup();
          }, function() { btn.style.color = '#C96B67'; });
        });
        L.DomEvent.disableClickPropagation(btn);
        return btn;
      },
    });
    new LocateControl().addTo(map);

    // ── Tema claro/oscuro ────────────────────────
    var isDark = true;
    var tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    var ThemeControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function () {
        var btn = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        btn.innerHTML = '&#x2600;&#xFE0F;';
        btn.title = 'Cambiar tema';
        btn.style.cssText = 'background:#121918;color:#EBF4F2;cursor:pointer;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;border:2px solid #1F2D2A;border-radius:4px;user-select:none;';
        L.DomEvent.on(btn, 'click', function () {
          isDark = !isDark;
          map.removeLayer(tileLayer);
          tileLayer = L.tileLayer(isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
          btn.innerHTML = isDark ? '&#x2600;&#xFE0F;' : '&#x1F319;';
          btn.style.background = isDark ? '#121918' : '#f8f8f8';
          btn.style.borderColor = isDark ? '#1F2D2A' : '#ccc';
          btn.style.color = isDark ? '#EBF4F2' : '#333';
        });
        L.DomEvent.disableClickPropagation(btn);
        return btn;
      },
    });
    new ThemeControl().addTo(map);

    // ── Resolución R8/R9 ──────────────────────────
    var resolucion = 'r8';
    var ResolucionControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function () {
        var btn = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        btn.innerHTML = '⬡ R8';
        btn.title = 'Click: cambiar a R9';
        btn.style.cssText = 'background:#0A3F37;color:#2DB391;cursor:pointer;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1;font-weight:700;border:2px solid #2DB391;border-radius:4px;user-select:none;transition:all 0.2s ease;box-shadow:0 0 8px rgba(45,179,145,0.4);';
        L.DomEvent.on(btn, 'click', function () {
          resolucion = resolucion === 'r8' ? 'r9' : 'r8';
          if (resolucion === 'r8') {
            btn.style.backgroundColor = '#0A3F37';
            btn.style.borderColor = '#2DB391';
            btn.style.color = '#2DB391';
            btn.style.boxShadow = '0 0 8px rgba(45,179,145,0.4)';
            btn.innerHTML = '⬡ R8';
            btn.title = 'Click: cambiar a R9';
          } else {
            btn.style.backgroundColor = '#3F2C0A';
            btn.style.borderColor = '#F59E0B';
            btn.style.color = '#F59E0B';
            btn.style.boxShadow = '0 0 8px rgba(245,158,11,0.4)';
            btn.innerHTML = '⬡ R9';
            btn.title = 'Click: cambiar a R8';
          }
          renderizarZonas();
        });
        L.DomEvent.disableClickPropagation(btn);
        return btn;
      },
    });
    new ResolucionControl().addTo(map);

    // ── Vista Inteligencia ────────────────────────
    var vistaInteligencia = false;
    var IntelligenceControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function () {
        var btn = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        btn.innerHTML = '🧠';
        btn.title = 'Cambiar a Inteligencia';
        btn.style.cssText = 'background:#121918;color:#EBF4F2;cursor:pointer;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;border:2px solid #1F2D2A;border-radius:4px;user-select:none;';
        L.DomEvent.on(btn, 'click', function () {
          vistaInteligencia = !vistaInteligencia;
          btn.style.borderColor = vistaInteligencia ? '#2DB391' : '#1F2D2A';
          btn.style.backgroundColor = vistaInteligencia ? '#1D8F73' : '#121918';
          btn.title = vistaInteligencia ? 'Cambiar a Estado' : 'Cambiar a Inteligencia';
          renderizarZonas();
        });
        L.DomEvent.disableClickPropagation(btn);
        return btn;
      },
    });
    new IntelligenceControl().addTo(map);

    // ── Leyenda ──────────────────────────────────
    var leyenda = L.control({ position: 'bottomleft' });
    leyenda.onAdd = function() {
      var div = L.DomUtil.create('div', 'leyenda');
      var html = '';
      if (vistaInteligencia) {
        html = '<strong>Bienestar<\\/strong><div class="leyenda-item"><div class="leyenda-dot" style="background:#10B981;opacity:0.8"><\\/div>70-100<\\/div><div class="leyenda-item"><div class="leyenda-dot" style="background:#F59E0B;opacity:0.8"><\\/div>50-69<\\/div><div class="leyenda-item"><div class="leyenda-dot" style="background:#F97316;opacity:0.8"><\\/div>30-49<\\/div><div class="leyenda-item"><div class="leyenda-dot" style="background:#EF4444;opacity:0.8"><\\/div>0-29<\\/div><div class="leyenda-item"><div class="leyenda-dot" style="background:#6B7280;opacity:0.5"><\\/div>Sin datos<\\/div>';
      } else {
        html = '<strong>Estado<\\/strong>';
        Object.keys(COLORES).forEach(function(k) {
          var c = COLORES[k];
          html += '<div class="leyenda-item"><div class="leyenda-dot" style="background:' + c.fill + ';opacity:' + (c.opacity + 0.3) + '"><\\/div>' + c.label + '<\\/div>';
        });
      }
      div.innerHTML = html;
      return div;
    };
    leyenda.addTo(map);

    // ── Renderizado ──────────────────────────────
    var polygons = L.layerGroup().addTo(map);
    var bounds = [];

    function renderizarZonas() {
      map.removeLayer(polygons);
      polygons = L.layerGroup().addTo(map);
      bounds = [];
      leyenda.remove();
      leyenda.addTo(map);

      var zonasRenderizadas = 0;
      debug('🔄 Renderizando zonas (resolucion=' + resolucion + ')...');

      ZONAS.forEach(function(zona, idx) {
        try {
          if (zona.estado === 'sin_actividad' && zona.cuidadores === 0 && zona.demanda === 0 && zona.activos === 0 && zona.total === 0) return;

          var h3_id = resolucion === 'r8' ? zona.id_r8 : zona.id_r9;
          
          if (!h3_id) {
            debug('❌ Z' + idx + ': id_r8=' + (zona.id_r8 ?? 'undef') + ' id_r9=' + (zona.id_r9 ?? 'undef'));
            return;
          }

          if (!h3 || !h3.cellToBoundary) {
            debug('❌ h3-js no está disponible');
            return;
          }

          var boundary = h3.cellToBoundary(h3_id);
          var latlngs = boundary.map(function(p) { return [p[0], p[1]]; });
          
          var c = vistaInteligencia ? (function() {
            var v = zona.bienestar;
            if (v === undefined || v === null) return { fill: '#6B7280', opacity: 0.25 };
            if (v >= 70) return { fill: '#10B981', opacity: 0.6 };
            if (v >= 50) return { fill: '#F59E0B', opacity: 0.55 };
            if (v >= 30) return { fill: '#F97316', opacity: 0.55 };
            return { fill: '#EF4444', opacity: 0.5 };
          })() : (COLORES[zona.estado] || COLORES['sin_actividad']);

          var poly = L.polygon(latlngs, {
            color: c.fill,
            fillColor: c.fill,
            fillOpacity: c.opacity,
            weight: 1.5,
            opacity: 0.85,
          });

          var popupHTML = '';
          if (vistaInteligencia) {
            popupHTML = '<div class="popup-titulo">Inteligencia<\\/div><div class="popup-fila">Tipo: <b>' + (zona.tipo || '—') + '<\\/b><\\/div><div class="popup-fila">Bienestar: <b>' + (zona.bienestar ?? '—') + '<\\/b><\\/div><div class="popup-fila">Seguridad: <b>' + (zona.seguridad ?? '—') + '<\\/b><\\/div><div class="popup-fila">Actividad: <b>' + (zona.actividad ?? '—') + '<\\/b><\\/div><div class="popup-fila">Socialización: <b>' + (zona.socializacion ?? '—') + '<\\/b><\\/div><div class="popup-fila">Eventos: <b>' + zona.eventos + '<\\/b><\\/div>';
          } else {
            var estadoLabel = (COLORES[zona.estado] || {}).label || zona.estado;
            popupHTML = '<div class="popup-titulo">' + estadoLabel.toUpperCase() + '<\\/div><div class="popup-fila">Cuidadores: <b>' + zona.cuidadores + '<\\/b><\\/div><div class="popup-fila">Demanda: <b>' + zona.demanda + '<\\/b><\\/div><div class="popup-fila">Activos: <b>' + zona.activos + '<\\/b><\\/div><div class="popup-fila">Paseos: <b>' + zona.total + '<\\/b><\\/div>';
          }
          popupHTML += '<div class="popup-fila" style="margin-top:4px;font-size:10px;color:#98A7A4">' + h3_id + '<\\/div>';

          poly.bindPopup(popupHTML);
          poly.on('click', function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                tipo: 'ZONA_SELECCIONADA',
                h3_id: h3_id,
                h3_r8: zona.id_r8,
                h3_r9: zona.id_r9,
                estado: zona.estado,
                cuidadores: zona.cuidadores,
                demanda: zona.demanda,
                activos: zona.activos,
                total: zona.total,
              }));
            }
          });
          polygons.addLayer(poly);
          latlngs.forEach(function(ll) { bounds.push(ll); });
          zonasRenderizadas++;
        } catch(e) {
          debug('❌ Error en zona ' + idx + ': ' + e.message);
        }
      });

      debug('✅ Zonas renderizadas: ' + zonasRenderizadas);

      if (bounds.length > 0) {
        try { 
          map.fitBounds(bounds, { padding: [30, 30] });
          debug('🎯 Vista ajustada');
        } catch(e) { 
          debug('⚠️ Error ajustando vista: ' + e.message);
        }
      } else {
        debug('⚠️ Sin límites para renderizar');
      }
    }

    debug('🔄 Llamando renderizarZonas()...');
    renderizarZonas();
    debug('✨ Mapa listo');
  <\/script>
</body>
</html>`
}
