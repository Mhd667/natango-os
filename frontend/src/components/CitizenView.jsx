import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Camera as CameraIcon, Target, X, MapPin, Send, Bell } from 'lucide-react';

export default function CitizenView({ currentUser, isDarkMode }) {
  const API_BASE_URL = 'https://natango-os-production.up.railway.app';
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [publicStep, setPublicStep] = useState(1);
  const [checkinPhoto, setCheckinPhoto] = useState(null);
  const [publicZone, setPublicZone] = useState('');
  const [citizenData, setCitizenData] = useState({ name: currentUser?.name || '', phone: currentUser?.phone || '', type: 'Débordement de bac' });
  const [coords, setCoords] = useState(null);
  const [locationStr, setLocationStr] = useState("Position GPS requise");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const showToast = (message) => { setToastMessage(message); setTimeout(() => setToastMessage(null), 3500); };

  useEffect(() => {
    if (activeOverlay === 'public_report') {
      if (!checkinPhoto) startCamera();
    } else {
      stopCamera();
      setPublicStep(1);
    }
    return () => stopCamera();
  }, [activeOverlay, checkinPhoto]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Erreur caméra :", err);
      showToast("Veuillez autoriser l'accès à la caméra.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setCheckinPhoto(canvas.toDataURL('image/jpeg', 0.9));
      stopCamera();
      setPublicStep(2);
    }
  };

  const getLocationPublic = () => {
    setLocationStr("Recherche GPS en cours...");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationStr(`✓ Position capturée avec précision`);
          setPublicStep(3);
        },
        (err) => {
          showToast("GPS introuvable. Position par défaut utilisée.");
          setCoords({ lat: 14.716, lng: -17.467 });
          setPublicStep(3);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationStr("GPS non supporté"); setPublicStep(3);
    }
  };

  const sendPublicReport = async () => {
    if (!citizenData.name || !citizenData.phone) { showToast("Veuillez renseigner Nom et Numéro."); return; }
    showToast("Analyse de l'image par l'IA Natango...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone: publicZone, type: citizenData.type, name: citizenData.name, phone: citizenData.phone, lat: coords?.lat || 14.7, lng: coords?.lng || -17.4, photoBase64: checkinPhoto })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Signalement envoyé ! L'équipe arrive.");
        setActiveOverlay(null); setCheckinPhoto(null); setPublicStep(1);
      } else {
        showToast("Erreur lors de l'envoi.");
      }
    } catch (e) { showToast("Erreur de connexion."); }
  };

  return (
    <div className={`fixed inset-0 flex justify-center font-sans overflow-hidden ${isDarkMode ? "bg-black text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="w-full max-w-md bg-white dark:bg-[#0b141a] flex flex-col h-full relative overflow-hidden shadow-2xl border-x border-gray-200 dark:border-black">
        <div className="pt-12 pb-6 px-6 bg-[#0056FF] text-white flex items-center gap-4 shadow-md rounded-b-[30px] z-10">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-2"><img src="/logo.png" className="w-full h-full object-contain" alt="logo" /></div>
          <div><h1 className="text-xl font-black">Natango Citoyen</h1><p className="text-xs font-medium opacity-90">Gagnons ensemble contre les déchets</p></div>
        </div>

        <div className="flex-1 p-6 flex flex-col justify-center items-center space-y-8 animate-in fade-in">
          <div className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 animate-bounce"><AlertTriangle size={64} /></div>
          <h2 className="text-2xl font-black text-center dark:text-white">Signaler un incident</h2>
          <p className="text-center text-gray-500">Prenez une photo, notre IA s'occupe de dépêcher un agent immédiatement au bon endroit.</p>
          <button onClick={() => { setActiveOverlay('public_report'); setPublicStep(1); }} className="w-full py-5 bg-[#0056FF] text-white rounded-[24px] font-black text-lg shadow-xl active:scale-95 flex items-center justify-center gap-3"><CameraIcon size={24} /> Lancer le signalement</button>
        </div>

        {activeOverlay === 'public_report' && (
          <div className="absolute inset-0 z-[100] flex flex-col bg-black animate-in slide-in-from-bottom-full">
            <div className="flex justify-between items-center px-6 py-5 bg-black/50 absolute top-0 w-full z-10 text-white"><h3 className="font-black text-lg flex items-center gap-2"><Target size={20} /> Étape {publicStep}/3</h3><button onClick={() => { setActiveOverlay(null); setCheckinPhoto(null); }} className="bg-white/20 rounded-full p-2"><X size={20} /></button></div>

            <div className="flex-1 relative bg-black flex flex-col justify-center">
              {publicStep === 1 && (<>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /><canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none"></div>
                {isCameraActive && <button onClick={takePhoto} className="absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full border-4 border-white flex items-center justify-center active:scale-90 z-20"><div className="w-14 h-14 bg-white rounded-full"></div></button>}
              </>)}
              {publicStep === 2 && (<div className="p-8 text-center animate-in zoom-in"><MapPin size={80} className="text-[#0056FF] mx-auto mb-6 animate-pulse" /><h2 className="text-white text-2xl font-black mb-4">Où êtes-vous ?</h2><p className="text-gray-400 mb-10">Partagez votre position pour guider l'agent avec précision.</p><button onClick={getLocationPublic} className="w-full bg-[#0056FF] text-white font-bold py-4 rounded-2xl text-lg shadow-xl active:scale-95 flex justify-center gap-2"><MapPin size={24} /> Partager la position</button></div>)}
              {publicStep === 3 && (<div className="p-6 bg-white dark:bg-[#111b21] h-full rounded-t-[40px] animate-in slide-in-from-bottom-10 flex flex-col">
                <h2 className="text-2xl font-black mb-6 dark:text-white mt-4">Derniers détails</h2>
                <div className="space-y-5 flex-1">
                  <div><label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nom (Obligatoire)</label><input type="text" value={citizenData.name} onChange={e => setCitizenData({ ...citizenData, name: e.target.value })} className="w-full mt-1 bg-gray-50 dark:bg-[#202c33] dark:text-white rounded-2xl p-4 font-bold outline-none" placeholder="Ex: Jean Dupont" /></div>
                  <div><label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Numéro (Obligatoire)</label><input type="tel" value={citizenData.phone} onChange={e => setCitizenData({ ...citizenData, phone: e.target.value })} className="w-full mt-1 bg-gray-50 dark:bg-[#202c33] dark:text-white rounded-2xl p-4 font-bold outline-none" placeholder="Ex: 77 000 00 00" /></div>
                  <div><label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Type d'incident</label>
                    <select value={citizenData.type} onChange={e => setCitizenData({ ...citizenData, type: e.target.value })} className="w-full mt-1 bg-gray-50 dark:bg-[#202c33] dark:text-white rounded-2xl p-4 font-bold outline-none"><option value="Débordement de bac">Débordement de bac</option><option value="Déchets au sol">Déchets au sol</option><option value="Autre">Autre</option></select>
                  </div>
                  <div><label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Lieu précis</label>
                    <input type="text" value={publicZone} onChange={e => setPublicZone(e.target.value)} className="w-full mt-1 bg-gray-50 dark:bg-[#202c33] dark:text-white rounded-2xl p-4 font-bold outline-none" placeholder="Ex: Près des toilettes, Marché central..." />
                  </div>
                </div>
                <button onClick={sendPublicReport} className="w-full py-4 bg-[#0056FF] text-white rounded-[20px] font-black text-lg shadow-xl active:scale-95 mb-6 flex justify-center items-center gap-2"><Send size={20} /> Transmettre à l'IA</button>
              </div>)}
            </div>
          </div>
        )}

        {/* 🍏 NOTIFICATION UNIVERSELLE (Glassmorphism iOS) */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[500] w-[90%] max-w-sm bg-white/70 dark:bg-[#111b21]/70 backdrop-blur-2xl border border-white/40 dark:border-white/10 p-4 rounded-[28px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-start gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="w-10 h-10 rounded-[18px] bg-gradient-to-br from-[#0056FF] to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <Bell size={18} className="text-white" />
            </div>
            <div className="flex-1 mt-0.5">
              <h4 className="text-gray-900 dark:text-white font-bold text-sm">
                {typeof toastMessage === 'object' ? (toastMessage.title || "Natango OS") : "Natango OS"}
              </h4>
              <p className="text-gray-600 dark:text-gray-300 text-xs mt-1 font-medium leading-relaxed">
                {typeof toastMessage === 'object' ? toastMessage.body : toastMessage}
              </p>
            </div>
            <button onClick={() => setToastMessage(null)} className="p-1.5 text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100/50 dark:bg-white/5 rounded-full transition-colors">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}