import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const createIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const greenIcon = createIcon('#10b981');
const redIcon = createIcon('#ef4444');
const blueIcon = createIcon('#3b82f6');
const grayIcon = createIcon('#6b7280');

export function RemoteWorkersMap({ workers = [], clockRecords = [], height = '500px' }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Initialize map
    if (!mapInstanceRef.current && mapRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([-15.77972, -47.92972], 4); // Brazil center

      // Dark theme tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const bounds = [];

    // Add worker home locations
    workers.forEach(worker => {
      if (worker.home_location?.lat && worker.home_location?.lng) {
        const { lat, lng } = worker.home_location;
        bounds.push([lat, lng]);

        // Home location marker (blue circle)
        const homeCircle = L.circle([lat, lng], {
          radius: worker.location_radius_meters || 100,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 5',
        }).addTo(mapInstanceRef.current);
        markersRef.current.push(homeCircle);

        // Home marker
        const homeMarker = L.marker([lat, lng], { icon: blueIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="min-width: 150px;">
              <strong>${worker.name}</strong><br/>
              <span style="color: #6b7280; font-size: 12px;">📍 Local cadastrado</span><br/>
              <span style="font-size: 11px;">Raio: ${worker.location_radius_meters || 100}m</span><br/>
              <span style="font-size: 11px; color: ${worker.clocked_today ? '#10b981' : '#6b7280'}">
                ${worker.clocked_today ? '✅ Ponto hoje' : '⏳ Sem ponto hoje'}
              </span>
            </div>
          `);
        markersRef.current.push(homeMarker);

        // Today's clock location (if different from home)
        if (worker.today_location?.lat && worker.today_location?.lng) {
          const clockMarker = L.marker(
            [worker.today_location.lat, worker.today_location.lng],
            { icon: greenIcon }
          )
            .addTo(mapInstanceRef.current)
            .bindPopup(`
              <div style="min-width: 150px;">
                <strong>${worker.name}</strong><br/>
                <span style="color: #10b981; font-size: 12px;">✅ Ponto registrado hoje</span>
              </div>
            `);
          markersRef.current.push(clockMarker);
        }
      }
    });

    // Add clock records
    clockRecords.forEach(record => {
      if (record.location?.lat && record.location?.lng) {
        const { lat, lng } = record.location;
        bounds.push([lat, lng]);

        const isWithinRadius = (record.distance_from_home || 0) <= 200;
        const icon = isWithinRadius ? greenIcon : redIcon;

        const clockTime = new Date(record.clock_in).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });

        const marker = L.marker([lat, lng], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="min-width: 180px;">
              <strong>${record.user_name}</strong><br/>
              <span style="font-size: 12px;">📅 ${clockTime}</span><br/>
              <span style="font-size: 11px; color: ${isWithinRadius ? '#10b981' : '#ef4444'}">
                ${isWithinRadius ? '✅' : '⚠️'} ${record.distance_from_home || 0}m do local cadastrado
              </span>
            </div>
          `);
        markersRef.current.push(marker);
      }
    });

    // Fit bounds
    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [workers, clockRecords]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height, 
        width: '100%', 
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    />
  );
}
