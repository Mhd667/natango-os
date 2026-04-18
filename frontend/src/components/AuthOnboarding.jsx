import React, { useState } from 'react';
import { Loader2, Phone, Shield, Camera, Target, Navigation, CheckCircle2, ChevronRight, Bell, X } from 'lucide-react';

export default function AuthOnboarding({ onLoginSuccess, isDarkMode }) {
  const API_BASE_URL = 'https://natango-os-production.up.railway.app';
  
  // États 100% locaux à l'écran de connexion
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({ phone: '', name: '', role: 'DG', photo: null, pinCode: '' });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingText, setOnboardingText] = useState("Initialisation des modules Natango...\nConnexion sécurisée établie.");
  const [toastMessage, setToastMessage] = useState(null);
  const [tempUser, setTempUser] = useState(null); // Stocke l'utilisateur avant de l'envoyer à App.jsx

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePhotoUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, photo: URL.createObjectURL(e.target.files[0]) });
    }
  };

  const finishLoginProcess = (user) => {
    // C'est ici qu'on prévient App.jsx que la connexion est totalement terminée (tuto inclus)
    onLoginSuccess(user);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setToastMessage({ title: "Connexion", body: "Vérification des accès en cours..." });

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone.replace(/\s/g, ''),
          pin: formData.pinCode
        })
      });
      const result = await response.json();

      if (result.success) {
        setToastMessage(null);
        setTempUser(result.user);
        
        const hasSeenTutorial = localStorage.getItem('natangoOnboarding');
        if (!hasSeenTutorial && result.user.role === 'Agent') {
          // Affiche le tutoriel d'abord
          setShowOnboarding(true);
        } else {
          // Passe à l'écran du terminal
          setStep(4);
        }
      } else {
        setToastMessage(null);
        alert(`⛔ ${result.message}`);
      }
    } catch (error) {
      setToastMessage(null);
      alert("Erreur réseau. Vérifiez que votre serveur local ou Render tourne bien.");
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-[#0b141a] flex flex-col h-full relative overflow-hidden shadow-2xl border-x border-gray-200 dark:border-[#111b21]">
      
      {/* 🍏 NOTIFICATION UNIVERSELLE */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[500] w-[90%] max-w-sm bg-white/70 dark:bg-[#111b21]/70 backdrop-blur-2xl border border-white/40 dark:border-white/10 p-4 rounded-[28px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-start gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="w-10 h-10 rounded-[18px] bg-gradient-to-br from-[#0056FF] to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <Bell size={18} className="text-white" />
          </div>
          <div className="flex-1 mt-0.5">
            <h4 className="text-gray-900 dark:text-white font-bold text-sm">{toastMessage.title || "Natango OS"}</h4>
            <p className="text-gray-600 dark:text-gray-300 text-xs mt-1 font-medium leading-relaxed">{toastMessage.body || toastMessage}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1.5 text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100/50 dark:bg-white/5 rounded-full transition-colors"><X size={14} /></button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        
        {step === 0 && !showOnboarding && (
          <div className="w-full flex flex-col items-center text-center animate-in fade-in">
            <div className="w-44 h-44 mb-10 bg-white p-3 rounded-full shadow-sm border border-gray-100 dark:border-[#202c33] flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Natango" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight dark:text-[#e9edef] mb-4">Natango OS</h1>
            <p className="text-[15px] text-gray-500 max-w-[300px] mx-auto mb-12">Le cerveau opérationnel de vos événements.</p>
            <button onClick={() => setStep(1)} className="w-10/12 bg-[#0056FF] text-white py-4 rounded-full font-bold shadow-xl active:scale-[0.98]">Connexion</button>
          </div>
        )}

        {step === 1 && !showOnboarding && (
          <div className="w-full flex flex-col animate-in fade-in px-4">
            <h2 className="text-2xl font-bold text-center mb-10 dark:text-[#e9edef]">Vérification</h2>
            <form onSubmit={(e) => { e.preventDefault(); if (formData.phone.length > 5) { setStep(2); setTimeout(() => setStep(3), 800); } }} className="space-y-8">
              <div className="flex gap-4 justify-center">
                <div className="w-20 border-b-2 border-[#0056FF] pb-2"><input type="text" value="+221" disabled className="w-full bg-transparent text-center font-bold text-xl dark:text-[#e9edef]" /></div>
                <div className="flex-1 border-b-2 border-[#0056FF] pb-2"><input type="tel" placeholder="N° Téléphone" className="w-full bg-transparent font-bold text-xl outline-none dark:text-[#e9edef]" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} autoFocus required /></div>
              </div>
              <div className="flex justify-center mt-12"><button type="submit" className={`px-10 py-4 rounded-full font-bold text-lg shadow-lg ${formData.phone.length > 5 ? 'bg-[#0056FF] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`} disabled={formData.phone.length <= 5}>Suivant</button></div>
            </form>
          </div>
        )}

        {step === 2 && !showOnboarding && (
          <div className="flex flex-col items-center space-y-4 animate-in zoom-in">
            <Loader2 className="h-12 w-12 text-[#0056FF] animate-spin" />
            <p className="text-gray-500">Recherche base...</p>
          </div>
        )}

        {step === 3 && !showOnboarding && (
          <div className="w-full flex flex-col animate-in fade-in px-4">
            <h2 className="text-2xl font-bold text-center mb-8 dark:text-[#e9edef]">Profil</h2>
            {formData.role !== 'Public' && (
              <div className="flex justify-center mb-10">
                <input type="file" id="photo-upload" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <div onClick={() => document.getElementById('photo-upload').click()} className="w-28 h-28 rounded-full flex items-center justify-center cursor-pointer border-4 border-gray-200 dark:border-[#202c33] bg-gray-100 dark:bg-[#111b21] overflow-hidden shadow-inner">
                  {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <Camera size={36} className="text-gray-400" />}
                </div>
              </div>
            )}
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Phone size={16} className="text-[#0056FF]" /> Numéro de téléphone</label>
                <input type="tel" required placeholder="Ex: 774089807" className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-[#202c33] border-none text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-[#0056FF] transition-all" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Shield size={16} className="text-[#0056FF]" /> Code d'accès secret</label>
                <input type="password" required placeholder="Votre code PIN..." className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-[#202c33] border-none text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-[#0056FF] transition-all" value={formData.pinCode || ''} onChange={(e) => setFormData({...formData, pinCode: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-4 bg-[#0056FF] text-white rounded-2xl font-black text-lg shadow-[0_10px_20px_rgba(0,86,255,0.3)] active:scale-95 transition-all">Activer Natango OS</button>
            </form>
          </div>
        )}

        {step === 4 && !showOnboarding && tempUser && (
          <div className="absolute inset-0 bg-black z-[200] flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
            <div className="w-full max-w-sm flex items-center justify-center mb-8">
              <div className="w-16 h-16 bg-[#111b21] rounded-2xl flex items-center justify-center animate-pulse border border-green-500/30 shadow-[0_0_30px_rgba(0,168,132,0.2)]">
                <img src="/logo.png" alt="AI" className="w-10 h-10 object-contain grayscale" />
              </div>
            </div>
            <div className="w-full bg-[#0b141a] border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00a884] to-transparent opacity-50"></div>
              <p className="font-mono text-[13px] text-[#00a884] leading-loose whitespace-pre-wrap">
                <span className="opacity-50 select-none mr-2">{'>'}</span>{onboardingText}
                <span className="inline-block w-2 h-4 ml-1 bg-[#00a884] animate-pulse"></span>
              </p>
            </div>
            <button onClick={() => finishLoginProcess(tempUser)} className="w-full max-w-sm mt-12 py-5 bg-[#00a884] text-black rounded-full font-black text-lg shadow-[0_10px_40px_rgba(0,168,132,0.3)] hover:scale-[1.02] active:scale-95 transition-all">Démarrer ma journée</button>
          </div>
        )}

      </div>

      {/* 🚀 ONBOARDING (TUTORIEL AGENT) */}
      {showOnboarding && tempUser && (
        <div className="absolute inset-0 z-[300] bg-[#0056FF] dark:bg-[#00a884] flex flex-col items-center justify-center p-6 text-white animate-in slide-in-from-bottom">
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm text-center space-y-8">
            {onboardingStep === 1 && (
              <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6"><Target size={48} className="text-white" /></div>
                <h2 className="text-3xl font-black mb-4">Bienvenue, {tempUser.name.split(' ')[0]}</h2>
                <p className="text-lg text-white/80 font-medium">Vous êtes maintenant connecté(e) au réseau Natango. Votre position GPS est sécurisée et le système est prêt.</p>
              </div>
            )}
            {onboardingStep === 2 && (
              <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.3)]"><Navigation size={48} className="text-white" /></div>
                <h2 className="text-3xl font-black mb-4">Radar Tactique</h2>
                <p className="text-lg text-white/80 font-medium">Ne cherchez plus. Quand une mission vous est assignée, ouvrez le Radar. Suivez la flèche pour trouver la zone exacte.</p>
              </div>
            )}
            {onboardingStep === 3 && (
              <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6"><Camera size={48} className="text-white" /></div>
                <h2 className="text-3xl font-black mb-4">Validation IA</h2>
                <p className="text-lg text-white/80 font-medium">Prenez des photos nettes après votre nettoyage. L'Intelligence Artificielle de Natango vérifiera la propreté avant de clôturer la mission.</p>
              </div>
            )}
          </div>
          <div className="w-full max-w-sm pb-8 flex flex-col gap-4">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3].map(step => (<div key={step} className={`h-2 rounded-full transition-all duration-300 ${onboardingStep === step ? 'w-8 bg-white' : 'w-2 bg-white/30'}`} />))}
            </div>
            <button
              onClick={() => {
                if (onboardingStep < 3) {
                  setOnboardingStep(onboardingStep + 1);
                } else {
                  localStorage.setItem('natangoOnboarding', 'true');
                  setShowOnboarding(false);
                  setStep(4); // Ouvre le terminal final après le tuto
                }
              }}
              className="w-full py-4 bg-white text-[#0056FF] dark:text-[#00a884] rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              {onboardingStep === 3 ? <>Démarrer ma mission <CheckCircle2 size={20} /></> : <>Continuer <ChevronRight size={20} /></>}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}