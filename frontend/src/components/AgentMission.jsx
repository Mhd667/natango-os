import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, CheckCircle2, Clock, Map } from 'lucide-react';

// Formule mathématique pour calculer la distance en mètres entre deux coordonnées GPS
function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c); // Retourne la distance en mètres
}

export default function AgentMission({ apiBaseUrl }) {
    const [agentLocation, setAgentLocation] = useState(null);
    const [houses, setHouses] = useState([]);

    // 1. TRAQUER L'AGENT EN TEMPS RÉEL (Le GPS du téléphone)
    useEffect(() => {
        if (!navigator.geolocation) return;

        // watchPosition met à jour les coordonnées à chaque fois que l'agent fait un pas
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setAgentLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (err) => console.error("Erreur GPS Agent:", err),
            { enableHighAccuracy: true } // Force le GPS précis
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // 2. RÉCUPÉRER LES MAISONS DEPUIS LE SERVEUR
    useEffect(() => {
        const fetchHouses = async () => {
            try {
                // Remplace localhost par l'URL Render si tu es déployé
                const response = await fetch(`${apiBaseUrl}/api/dashboard/status`);
                const data = await response.json();

                // Transforme l'objet en tableau pour pouvoir le trier
                const houseArray = Object.entries(data).map(([id, info]) => ({
                    id,
                    ...info
                }));
                setHouses(houseArray);
            } catch (err) {
                console.error("Erreur de connexion au serveur");
            }
        };

        fetchHouses();
        const interval = setInterval(fetchHouses, 3000); // Actualise toutes les 3s
        return () => clearInterval(interval);
    }, []);

    // 3. LE CERVEAU DE MARCUS : Calcul et Tri de l'Itinéraire
    // On calcule la distance pour chaque maison, puis on trie de la plus proche à la plus loin
    const itinerary = houses
        .map(house => ({
            ...house,
            distance: agentLocation && house.location
                ? getDistance(agentLocation.lat, agentLocation.lng, house.location.lat, house.location.lng)
                : Infinity
        }))
        .sort((a, b) => a.distance - b.distance);

    return (
        <div className="min-h-screen bg-[#0b141a] text-white p-4 font-sans">

            {/* HEADER DE MISSION */}
            <div className="bg-[#111b21] border border-white/10 p-6 rounded-3xl mb-6 shadow-2xl">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter">Natango Ops</h1>
                        <p className="text-[#0056FF] font-bold text-sm mt-1 flex items-center gap-2">
                            <Navigation size={14} className="animate-pulse" />
                            Itinéraire Dynamique Actif
                        </p>
                    </div>
                    <div className={`p-3 rounded-full ${agentLocation ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        <MapPin size={24} />
                    </div>
                </div>
                {!agentLocation && (
                    <p className="text-red-400 text-xs mt-4">⚠️ En attente du signal GPS de votre téléphone...</p>
                )}
            </div>

            {/* LISTE DES MISSIONS TRIÉES PAR DISTANCE */}
            <div className="space-y-4 pb-20">
                <h2 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-4 px-2">Cibles à proximité</h2>

                {itinerary.map((house, index) => {
                    // Logique visuelle
                    const isPaid = house.statut === "Payé";
                    const isNearest = index === 0 && house.distance !== Infinity;

                    return (
                        <div
                            key={house.id}
                            className={`p-5 rounded-2xl border transition-all ${isPaid
                                    ? isNearest
                                        ? 'bg-green-500/10 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' // La cible prioritaire
                                        : 'bg-[#111b21] border-green-500/30' // Les autres cibles payées
                                    : 'bg-[#111b21] border-white/5 opacity-60' // Les cibles en attente
                                }`}
                        >
                            <div className="flex justify-between items-center">

                                {/* Infos Maison */}
                                <div className="flex flex-col">
                                    <span className="text-xl font-black flex items-center gap-2">
                                        {house.nom}
                                        {isNearest && isPaid && <span className="bg-green-500 text-white text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-widest">Cible la plus proche</span>}
                                    </span>
                                    <span className="text-gray-400 text-sm">Villa {house.villa} • QR: {house.qrId}</span>
                                </div>

                                {/* Statut & Distance */}
                                <div className="text-right flex flex-col items-end">
                                    {isPaid ? (
                                        <CheckCircle2 className="text-green-500 mb-1" size={24} />
                                    ) : (
                                        <Clock className="text-orange-500 mb-1" size={24} />
                                    )}

                                    {/* Affichage de la distance dynamique */}
                                    {house.distance !== Infinity ? (
                                        <span className={`font-mono font-bold ${isNearest ? 'text-green-400 text-lg' : 'text-gray-400 text-sm'}`}>
                                            {house.distance} m
                                        </span>
                                    ) : (
                                        <span className="text-gray-600 text-xs text-right">GPS manquant</span>
                                    )}
                                </div>

                            </div>
                        </div>
                    );
                })}

                {itinerary.length === 0 && (
                    <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl">
                        <Map className="mx-auto text-gray-500 mb-2" size={32} />
                        <p className="text-gray-500">Aucune cible scellée sur cette zone.</p>
                    </div>
                )}
            </div>

        </div>
    );
}