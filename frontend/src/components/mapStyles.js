// On cache UNIQUEMENT le texte et les icônes des commerces/lieux, mais on garde leurs formes
const hideClutter = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] } // Optionnel : cache le nom des petites rues
];

export const darkMapStyle = [
  ...hideClutter,
  // Fond général
  { elementType: "geometry", stylers: [{ color: "#0b141a" }] },
  // Bâtiments (Maisons de la cité)
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#111b21" }, { lightness: 5 }] },
  // Jardins / Espaces verts
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#0a2619" }] },
  // Routes
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#202c33" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1a242b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] }
];

export const lightMapStyle = [
  ...hideClutter,
  // Fond général
  { elementType: "geometry", stylers: [{ color: "#f7f8fa" }] },
  // Bâtiments (Maisons de la cité)
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#eceff1" }] },
  // Jardins / Espaces verts
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#e6f4ea" }] },
  // Routes
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d1d5db" }] }
];