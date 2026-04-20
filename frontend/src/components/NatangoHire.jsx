import React, { useState, useEffect } from 'react';
import { MapPin, QrCode, CheckCircle2, User, Home, Phone, X, Camera } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function NatangoHire({ onClose, apiBaseUrl, currentUser }) {
  const [formData, setFormData] = useState({ nom: '', villa: '', phone: '', qrId: '' });
  const [gps, setGps] = useState(null);
  const [isSealing, setIsSealing] = useState(false);

  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0] // 0 = QR CODE
      }, false);

      scanner.render((decodedText) => {
        console.log("QR Scanné:", decodedText);
        try {
          const data = JSON.parse(decodedText);
          setFormData(prev => ({ ...prev, qrId: data.id || decodedText }));
        } catch (e) {
          setFormData(prev => ({ ...prev, qrId: decodedText }));
        }
        setShowScanner(false);
        scanner.clear();
      }, (error) => {
        // Erreurs de scan silencieuses
      });

      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [showScanner]);

  const handleScanQR = () => {
    setShowScanner(true);
  };

  // Capturer la position GPS exacte
  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setGps({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => alert("Erreur GPS. Activez la localisation.")
      );
    }
  };

  const handleSealData = async () => {
    if (!gps) {
      alert("⚠️ Vous devez capturer la position GPS d'abord !");
      return;
    }
    
    setIsSealing(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/hire/onboard`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'user_id': currentUser?.phone // 👈 On envoie le téléphone de l'agent pour authentification
        },
        body: JSON.stringify({ ...formData, lat: gps.lat, lng: gps.lng })
      });
      
      if (response.ok) {
        alert("✅ PROFIL SCELLÉ ! La maison est ajoutée à la base de données.");
        // Reset le form pour la prochaine maison
        setFormData({ nom: '', villa: '', phone: '', qrId: '' });
        setGps(null);
      } else {
        const errorData = await response.json();
        alert(`❌ Erreur: ${errorData.error || 'Échec du scellement'}`);
      }
    } catch (error) {
      alert("❌ Erreur de connexion au serveur.");
    }
    setIsSealing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#111b21]/90 border border-white/10 rounded-[32px] p-6 shadow-2xl relative">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white tracking-tighter">Natango Hire</h2>
          <p className="text-gray-400 text-sm">Enrôlement & Scellement GPS</p>
        </div>

        <div className="space-y-4">
          {/* Scan QR */}
          <button 
            onClick={handleScanQR}
            className="w-full p-4 bg-[#1a262c] hover:bg-[#202c33] border border-white/5 rounded-2xl flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-3 text-white">
              <QrCode className="text-[#0056FF]" />
              <span className="font-bold">{formData.qrId || "Scanner le QR Code du Bac"}</span>
            </div>
            {formData.qrId && <CheckCircle2 className="text-green-500" size={20} />}
          </button>

          {/* Formulaire Client */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-[#1a262c] p-4 rounded-2xl border border-white/5">
              <User className="text-gray-500" size={20} />
              <input 
                type="text" placeholder="Nom complet (ex: Ousmane Diop)" 
                className="bg-transparent border-none outline-none text-white w-full"
                value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-3 bg-[#1a262c] p-4 rounded-2xl border border-white/5">
              <Home className="text-gray-500" size={20} />
              <input 
                type="text" placeholder="Numéro Villa (ex: 45)" 
                className="bg-transparent border-none outline-none text-white w-full"
                value={formData.villa} onChange={e => setFormData({...formData, villa: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-3 bg-[#1a262c] p-4 rounded-2xl border border-white/5">
              <Phone className="text-gray-500" size={20} />
              <input 
                type="tel" placeholder="Numéro WhatsApp (ex: 771234567)" 
                className="bg-transparent border-none outline-none text-white w-full"
                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          {/* Capture GPS */}
          <button 
            onClick={captureLocation}
            className={`w-full p-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all ${
              gps ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-orange-500/20 text-orange-500 border border-orange-500/50 hover:bg-orange-500/30'
            }`}
          >
            <MapPin size={20} />
            {gps ? "Position Sécurisée" : "Capturer la Position Exacte"}
          </button>

          {/* Bouton de Scellement */}
          <button 
            onClick={handleSealData}
            disabled={!gps || !formData.qrId || !formData.nom || isSealing}
            className="w-full mt-6 py-5 bg-[#0056FF] disabled:bg-gray-700 text-white font-black text-xl rounded-2xl transition-all shadow-[0_0_20px_rgba(0,86,255,0.4)] disabled:shadow-none"
          >
            {isSealing ? "Enregistrement..." : "SCELLER LE PROFIL"}
          </button>

        </div>

        {/* OVERLAY DU SCANNER CAMERA */}
        {showScanner && (
          <div className="absolute inset-0 z-[110] bg-black rounded-[32px] flex flex-col p-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="text-white font-bold flex items-center gap-2"><Camera size={18} /> Scanner le Bac</h3>
              <button onClick={() => setShowScanner(false)} className="p-2 bg-white/10 rounded-full text-white"><X size={20} /></button>
            </div>
            <div id="reader" className="flex-1 overflow-hidden rounded-2xl bg-[#1a262c]"></div>
            <p className="text-gray-400 text-[10px] text-center mt-4 uppercase tracking-widest">Placez le QR Code dans le carré</p>
          </div>
        )}
      </div>
    </div>
  );
}