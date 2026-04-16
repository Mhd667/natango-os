import React, { useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polygon, Polyline } from '@react-google-maps/api';
import { lightMapStyle, darkMapStyle } from './mapStyles';

const containerStyle = { width: '100%', height: '100%' };

// Centre sur la zone Golf / Alioune Sow
const center = { lat: 14.775, lng: -17.400 }; 

// Restriction géographique stricte
const DAKAR_BANLIEUE_BOUNDS = {
  north: 14.800, // Limite Nord Guédiawaye
  south: 14.750, // Limite Sud (Pikine)
  west: -17.430, // Limite Ouest (Parcelles)
  east: -17.360  // Limite Est
};

export default function MapDashboard({ isDarkMode, dashboardTab, liveData }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const options = useMemo(() => ({
    styles: isDarkMode ? darkMapStyle : lightMapStyle,
    disableDefaultUI: true,
    zoomControl: false,
    restriction: {
      latLngBounds: DAKAR_BANLIEUE_BOUNDS,
      strictBounds: false
    }
  }), [isDarkMode]);

  if (!isLoaded) {
    return <div className="w-full h-full bg-[#111b21] animate-pulse flex items-center justify-center">Chargement Map...</div>;
  }

  // Faux itinéraire pour la démo (La ligne Yango)
  const mockItinerary = [
    { lat: 14.775, lng: -17.400 },
    { lat: 14.776, lng: -17.398 },
    { lat: 14.778, lng: -17.399 }
  ];

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={16} options={options}>
      
      {/* 🔴 VUE HEATMAP (Les maisons et zones colorées) */}
      {dashboardTab === 'heatmap' && (liveData?.heatmapZones || []).map((zone, idx) => {
        let fillColor = '#ef4444'; // Rouge
        if (zone.status === 'scanned') fillColor = '#f97316'; // Orange
        if (zone.status === 'clean') fillColor = '#22c55e'; // Vert

        return (
          <Polygon
            key={`zone-${idx}`}
            paths={zone.coordinates}
            options={{ fillColor, fillOpacity: 0.3, strokeColor: fillColor, strokeOpacity: 0.8, strokeWeight: 2 }}
          />
        );
      })}

      {/* 🔵 VUE OPÉRATIONS (Agents et Itinéraires) */}
      {(dashboardTab === 'ops' || dashboardTab === 'rh') && (
        <>
          {/* Ligne d'itinéraire façon Yango/Uber */}
          <Polyline
            path={mockItinerary}
            options={{
              strokeColor: isDarkMode ? '#00a884' : '#0056FF',
              strokeOpacity: 0.8,
              strokeWeight: 5,
            }}
          />

          {/* Marqueurs des Agents */}
          {(liveData?.agents || []).map((agent, idx) => (
            <Marker 
              key={`agent-${idx}`}
              position={{ lat: agent.last_lat || 14.775, lng: agent.last_lng || -17.400 }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: agent.status === 'active' ? (isDarkMode ? '#00a884' : '#0056FF') : '#9ca3af',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
            />
          ))}
        </>
      )}
    </GoogleMap>
  );
}