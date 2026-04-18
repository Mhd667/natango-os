import React from 'react';
import { 
  AlertTriangle, PhoneOff, PhoneCall, Clock, X, Map, User, 
  CheckCircle2, Camera, Navigation, Shield, FileAudio, 
  RotateCcw, CircleDot, Loader2, Download, FileText,
  MapPin, XCircle, Scan, Wallet, Users // 👈 Icônes Dashboards
} from 'lucide-react'; 
import MapDashboard from './MapDashboard';
import AgentMission from './AgentMission';

export default function Overlays({
  apiBaseUrl,
  activeOverlay, setActiveOverlay, currentUser,
  activeChatId,
  // Props pour l'appel d'urgence
  isDeclining, setIsDeclining, declineReason, setDeclineReason, currentIncidentId,
  // Props pour les RH
  attendanceStatus, setAttendanceStatus, attendanceReason, setAttendanceReason, setToastMessage,
  // Props pour le Dashboard DG
  dashboardTab, setDashboardTab, liveData, openAgentDetails,
  // Props pour le Dossier Agent
  selectedAgentStats,
  // Props pour la Mission Tactique
  currentTaskData, setCurrentTaskId,
  // Props pour le Check-in / Photo
  checkinPhoto, setCheckinPhoto, videoRef, canvasRef, isCameraActive, takePhoto, startCamera, validateCheckIn, validateTask,
  // Props pour le Radar et la Carte
  coords, calculateDistance, calculateBearing, getMapCoordinates,
  // Props pour le Rapport Intelligence
  selectedCall, setSelectedCall,
  // Props pour le Scanner QR
  handleQRScan
}) {

  const API_BASE_URL = 'https://natango-os-production.up.railway.app';

  // Si aucun overlay n'est actif, on ne rend rien
  if (!activeOverlay && !selectedCall) return null;

  return (
    <>
      {/* 📞 ÉCRAN D'APPEL D'URGENCE */}
      {activeOverlay === 'incoming_call_screen' && (
        <div className="absolute inset-0 z-[400] bg-gray-900 flex flex-col items-center justify-center py-12 px-6 animate-in fade-in">
          {isDeclining ? (
            <div className="w-full max-w-sm bg-white dark:bg-[#111b21] rounded-[30px] p-6 shadow-2xl animate-in zoom-in">
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Motif du refus</h3>
              <p className="text-sm text-gray-500 mb-4">Veuillez justifier pourquoi vous ne pouvez pas intervenir.</p>
              <textarea
                className="w-full bg-gray-100 dark:bg-[#202c33] border-none rounded-xl p-4 text-gray-900 dark:text-white mb-4 h-32 focus:ring-2 focus:ring-red-500"
                placeholder="Ex: Véhicule en panne, Fin de service..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setIsDeclining(false)} className="flex-1 py-3 font-bold text-gray-500 bg-gray-200 dark:bg-white/5 rounded-xl">Annuler</button>
                <button
                  onClick={async () => {
                    if (declineReason.trim().length < 3) return alert("Veuillez entrer un motif valide.");
                    await fetch(`${API_BASE_URL}/api/decline-mission`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ incidentId: currentIncidentId, agentPhone: currentUser.phone, agentName: currentUser.name, reason: declineReason })
                    });
                    setIsDeclining(false); setDeclineReason(''); setActiveOverlay(null);
                  }}
                  className="flex-1 py-3 font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-lg">
                  Confirmer le refus
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-between h-full w-full">
              <div className="flex flex-col items-center mt-10">
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.8)]"><AlertTriangle size={40} className="text-white" /></div>
                </div>
                <h2 className="text-white text-3xl font-black tracking-wider uppercase">Urgence Terrain</h2>
                <p className="text-gray-400 font-bold mt-2 text-lg">Mission en attente de réponse</p>
              </div>
              <div className="flex w-full justify-around mb-10 gap-6">
                <button onClick={() => setIsDeclining(true)} className="flex-1 bg-gray-800 hover:bg-red-900 text-white p-6 rounded-[30px] flex flex-col items-center gap-2 transition-colors border border-gray-700"><PhoneOff size={32} /><span className="font-bold">Décliner</span></button>
                <button onClick={() => { setActiveOverlay(null); setActiveOverlay('mission'); }} className="flex-1 bg-green-500 hover:bg-green-400 text-white p-6 rounded-[30px] flex flex-col items-center gap-2 shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all transform hover:scale-105 animate-bounce"><PhoneCall size={32} /><span className="font-bold">Intervenir</span></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ⏰ ÉCRAN CONTRÔLE RH (9h00) */}
      {activeOverlay === 'hr_attendance_prompt_screen' && (
        <div className="absolute inset-0 z-[450] bg-gray-900/95 backdrop-blur-md flex flex-col items-center justify-center py-12 px-6 animate-in zoom-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-[#111b21] rounded-[40px] p-8 shadow-2xl flex flex-col items-center border-4 border-orange-500/30">
            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center mb-6"><Clock size={40} className="text-orange-500" /></div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white text-center mb-2">Contrôle de Présence</h2>
            <p className="text-gray-500 text-center font-medium mb-8">Il est passé 9h00 et aucun check-in n'a été détecté. Venez-vous travailler aujourd'hui ?</p>
            {!attendanceStatus ? (
              <div className="w-full space-y-4 flex flex-col">
                <button onClick={() => setAttendanceStatus('retard')} className="w-full py-4 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 font-bold rounded-2xl border border-orange-200 dark:border-orange-500/20 hover:scale-105 transition-transform">Oui, je serai en retard</button>
                <button onClick={() => setAttendanceStatus('absent')} className="w-full py-4 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 font-bold rounded-2xl border border-red-200 dark:border-red-500/20 hover:scale-105 transition-transform">Non, je suis absent</button>
              </div>
            ) : (
              <div className="w-full flex flex-col animate-in fade-in">
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 text-sm uppercase tracking-wider">Justification ({attendanceStatus})</h3>
                <textarea className="w-full bg-gray-50 dark:bg-[#202c33] border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-gray-900 dark:text-white h-32 focus:ring-2 focus:ring-[#0056FF] outline-none resize-none mb-6" placeholder={attendanceStatus === 'retard' ? "Ex: Embouteillages..." : "Ex: Maladie..."} value={attendanceReason} onChange={(e) => setAttendanceReason(e.target.value)} />
                <div className="flex gap-3">
                  <button onClick={() => setAttendanceStatus(null)} className="flex-1 py-4 font-bold text-gray-500 bg-gray-100 dark:bg-white/5 rounded-2xl">Retour</button>
                  <button onClick={async () => {
                    if (attendanceReason.trim().length < 5) return alert("Veuillez fournir un motif détaillé.");
                    await fetch(`${API_BASE_URL}/api/hr-attendance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: currentUser.phone, name: currentUser.name, isComing: attendanceStatus === 'retard', reason: attendanceReason }) });
                    setAttendanceStatus(null); setAttendanceReason(''); setActiveOverlay(null);
                    setToastMessage({ title: "RH Natango", body: "Votre justification a été transmise." });
                  }} className="flex-[2] py-4 font-black text-white bg-[#0056FF] hover:bg-blue-600 rounded-2xl shadow-[0_10px_20px_rgba(0,86,255,0.3)]">Transmettre</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📊 DASHBOARDS CONTEXTUELS DG (S'adapte selon le Chat Actif) */}
      {activeOverlay === 'dashboard' && (currentUser?.role === 'DG' || currentUser?.role === 'Superviseur') && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full h-full max-w-6xl bg-[#F7F8FA] dark:bg-[#0b141a] rounded-[40px] shadow-2xl flex flex-col border border-gray-200 dark:border-white/10 overflow-hidden">

            {/* --- CAS 1 : DASHBOARD FINANCE (NATANGO ACCOUNT) --- */}
            {activeChatId === 'account' && (
              <div className="flex flex-col h-full animate-in zoom-in-95 duration-300">
                <div className="bg-white dark:bg-[#111b21] px-8 py-6 border-b border-gray-100 dark:border-white/5 shrink-0 flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-2xl dark:text-white flex items-center gap-3"><Wallet className="text-[#0056FF]" size={28} /> Intelligence Financière</h3>
                    <p className="text-gray-500 text-sm font-bold mt-1 tracking-widest uppercase">Grand Livre Comptable & Trésorerie</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => alert("Génération du CSV en cours...")} className="px-6 py-3 bg-[#0056FF] hover:bg-blue-600 text-white rounded-full font-black flex items-center gap-2 shadow-[0_10px_20px_rgba(0,86,255,0.2)] active:scale-95 transition-all"><Download size={18} /> Exporter CSV</button>
                    <button onClick={() => setActiveOverlay(null)} className="bg-gray-100 dark:bg-[#202c33] rounded-full p-3 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"><X size={24} className="text-gray-500" /></button>
                  </div>
                </div>
                <div className="p-8 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-[#111b21] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Recettes du mois</p>
                      <p className="text-4xl font-black text-[#0056FF]">760 000 <span className="text-xl text-gray-500">CFA</span></p>
                    </div>
                    <div className="bg-white dark:bg-[#111b21] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-2">Impayés</p>
                      <p className="text-4xl font-black text-red-500">64 000 <span className="text-xl text-red-300">CFA</span></p>
                    </div>
                    <div className="bg-white dark:bg-[#111b21] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <p className="text-xs font-black text-green-500 uppercase tracking-widest mb-2">Taux de recouvrement</p>
                      <p className="text-4xl font-black text-green-500">92 <span className="text-xl text-green-300">%</span></p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#111b21] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-[#202c33] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest font-black">
                          <th className="p-5 border-b border-gray-100 dark:border-white/5">Date</th>
                          <th className="p-5 border-b border-gray-100 dark:border-white/5">Résident</th>
                          <th className="p-5 border-b border-gray-100 dark:border-white/5">Montant</th>
                          <th className="p-5 border-b border-gray-100 dark:border-white/5">Méthode</th>
                          <th className="p-5 border-b border-gray-100 dark:border-white/5">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
                          <td className="p-5 font-bold dark:text-white">12 Avr. 2026</td>
                          <td className="p-5 font-bold dark:text-gray-300 group-hover:text-[#0056FF] transition-colors">Ousmane Diop</td>
                          <td className="p-5 font-black text-gray-900 dark:text-white">2 000 CFA</td>
                          <td className="p-5"><span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Wave</span></td>
                          <td className="p-5"><span className="flex items-center gap-2 text-green-500 font-bold"><CheckCircle2 size={16} /> Payé</span></td>
                        </tr>
                        <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
                          <td className="p-5 font-bold dark:text-white">11 Avr. 2026</td>
                          <td className="p-5 font-bold dark:text-gray-300 group-hover:text-[#0056FF] transition-colors">Awa Ndiaye</td>
                          <td className="p-5 font-black text-gray-900 dark:text-white">2 000 CFA</td>
                          <td className="p-5"><span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">Orange Money</span></td>
                          <td className="p-5"><span className="flex items-center gap-2 text-green-500 font-bold"><CheckCircle2 size={16} /> Payé</span></td>
                        </tr>
                        <tr className="hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group cursor-pointer bg-red-50/50 dark:bg-red-900/5">
                          <td className="p-5 font-bold text-red-900 dark:text-red-200">10 Avr. 2026</td>
                          <td className="p-5 font-bold text-red-900 dark:text-red-200">Moussa Fall</td>
                          <td className="p-5 font-black text-red-900 dark:text-red-400">2 000 CFA</td>
                          <td className="p-5">-</td>
                          <td className="p-5"><span className="flex items-center gap-2 text-red-500 font-bold"><AlertTriangle size={16} /> Impayé</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- CAS 2 : DASHBOARD CRM (NATANGO CUSTOMER) --- */}
            {activeChatId === 'customer' && (
              <div className="flex flex-col h-full animate-in zoom-in-95 duration-300">
                <div className="bg-white dark:bg-[#111b21] px-8 py-6 border-b border-gray-100 dark:border-white/5 shrink-0 flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-2xl dark:text-white flex items-center gap-3"><Users className="text-indigo-500" size={28} /> CRM Intelligence</h3>
                    <p className="text-gray-500 text-sm font-bold mt-1 tracking-widest uppercase">Base de données Foyers & QR Codes</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => alert("Exportation de la base de données...")} className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full font-black flex items-center gap-2 shadow-[0_10px_20px_rgba(99,102,241,0.2)] active:scale-95 transition-all"><Download size={18} /> Base Complète</button>
                    <button onClick={() => setActiveOverlay(null)} className="bg-gray-100 dark:bg-[#202c33] rounded-full p-3 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"><X size={24} className="text-gray-500" /></button>
                  </div>
                </div>
                <div className="p-8 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-[#111b21] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Adhérents Actifs</p>
                      <p className="text-4xl font-black text-indigo-500">412 <span className="text-xl text-gray-500">/ 800</span></p>
                    </div>
                    <div className="bg-white dark:bg-[#111b21] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <p className="text-xs font-black text-green-500 uppercase tracking-widest mb-2">Satisfaction WhatsApp</p>
                      <p className="text-4xl font-black text-green-500">98.5 <span className="text-xl text-green-300">%</span></p>
                    </div>
                    <div className="bg-white dark:bg-[#111b21] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <p className="text-xs font-black text-orange-500 uppercase tracking-widest mb-2">Alertes Service</p>
                      <p className="text-4xl font-black text-orange-500">2 <span className="text-xl text-orange-300">Signalements</span></p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#111b21] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#202c33] flex gap-2">
                      <button className="px-4 py-2 bg-white dark:bg-[#111b21] text-indigo-500 font-bold rounded-xl shadow-sm text-sm border border-gray-200 dark:border-white/5">Tous les foyers</button>
                      <button className="px-4 py-2 text-gray-500 dark:text-gray-400 font-bold rounded-xl hover:bg-white dark:hover:bg-[#111b21] text-sm transition-colors">Zone Nord</button>
                      <button className="px-4 py-2 text-red-500 font-bold rounded-xl hover:bg-white dark:hover:bg-[#111b21] text-sm transition-colors">À relancer</button>
                    </div>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white dark:bg-[#111b21] text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest font-black">
                          <th className="p-5 border-b border-gray-100 dark:border-white/5">Foyer / Contact</th>
                          <th className="p-5 border-b border-gray-100 dark:border-white/5">Localisation</th>
                          <th className="p-5 border-b border-gray-100 dark:border-white/5">Statut QR</th>
                          <th className="p-5 border-b border-gray-100 dark:border-white/5">Service du jour</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                          <td className="p-5"><p className="font-black dark:text-white text-[15px]">Ousmane Diop</p><p className="text-xs font-bold text-gray-400">+221 77 000 00 01</p></td>
                          <td className="p-5 font-bold text-gray-600 dark:text-gray-300">Zone Nord (Rue 12)</td>
                          <td className="p-5"><span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-black"><Shield size={12} className="inline mr-1" /> Actif</span></td>
                          <td className="p-5"><span className="text-green-500 font-black flex items-center gap-2"><CheckCircle2 size={18} /> Validé 08:42</span></td>
                        </tr>
                        <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                          <td className="p-5"><p className="font-black dark:text-white text-[15px]">Awa Ndiaye</p><p className="text-xs font-bold text-gray-400">+221 77 000 00 02</p></td>
                          <td className="p-5 font-bold text-gray-600 dark:text-gray-300">Zone Est (Villa 45)</td>
                          <td className="p-5"><span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-black"><Shield size={12} className="inline mr-1" /> Actif</span></td>
                          <td className="p-5"><span className="text-orange-500 font-black flex items-center gap-2"><Clock size={18} /> En attente (Moussa)</span></td>
                        </tr>
                        <tr className="hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors cursor-pointer bg-red-50/30 dark:bg-red-900/5">
                          <td className="p-5"><p className="font-black text-red-900 dark:text-red-200 text-[15px]">Moussa Fall</p><p className="text-xs font-bold text-red-400">+221 77 000 00 03</p></td>
                          <td className="p-5 font-bold text-red-800 dark:text-red-300">Zone Sud (Avenue 2)</td>
                          <td className="p-5"><span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-black"><XCircle size={12} className="inline mr-1" /> Suspendu</span></td>
                          <td className="p-5"><span className="text-red-500 font-black flex items-center gap-2">Ignoré (Impayé)</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* --- CAS 3 : DASHBOARD OPS & RH (D'origine) --- */}
            {(activeChatId === 'ops' || activeChatId === 'rh' || activeChatId === 'hub') && (
              <div className="flex flex-col h-full animate-in zoom-in-95 duration-300">
                <div className="bg-white dark:bg-[#111b21] px-6 py-5 border-b border-gray-100 dark:border-white/5 shrink-0 z-10 flex justify-between items-center">
                  <h3 className="font-black text-xl dark:text-white flex items-center gap-3"><Map size={22} className="text-[#0056FF]" /> Centre Opérationnel & RH</h3>
                  <button onClick={() => setActiveOverlay(null)} className="bg-gray-100 dark:bg-[#202c33] rounded-full p-2"><X size={20} className="text-gray-500" /></button>
                </div>
                <div className="px-6 py-4 bg-white dark:bg-[#111b21] shrink-0 border-b border-gray-100 dark:border-white/5">
                  <div className="flex bg-gray-100 dark:bg-[#202c33] p-1 rounded-[20px] max-w-md">
                    <button onClick={() => setDashboardTab('operations')} className={`flex-1 py-2.5 rounded-[16px] text-[13px] font-black transition-all ${dashboardTab === 'operations' ? 'bg-white dark:bg-[#111b21] shadow-sm text-[#0056FF]' : 'text-gray-500 dark:text-gray-400'}`}>Opérations</button>
                    <button onClick={() => setDashboardTab('rh')} className={`flex-1 py-2.5 rounded-[16px] text-[13px] font-black transition-all ${dashboardTab === 'rh' ? 'bg-white dark:bg-[#111b21] shadow-sm text-[#0056FF]' : 'text-gray-500 dark:text-gray-400'}`}>RH</button>
                    <button onClick={() => setDashboardTab('heatmap')} className={`flex-1 py-2.5 rounded-[16px] text-[13px] font-black transition-all ${dashboardTab === 'heatmap' ? 'bg-white dark:bg-[#111b21] shadow-sm text-[#0056FF]' : 'text-gray-500 dark:text-gray-400'}`}>Heatmap</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="relative w-full h-80 rounded-[32px] overflow-hidden border-4 border-white dark:border-[#202c33] shadow-inner mb-4">
                    <MapDashboard 
                      isDarkMode={document.documentElement.classList.contains('dark')} 
                      dashboardTab={dashboardTab} 
                      liveData={liveData} 
                    />
                  </div>

                  {dashboardTab === 'rh' && (
                    <div className="bg-white dark:bg-[#111b21] rounded-3xl p-5 border border-gray-100 dark:border-white/5">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Affectations du jour</h4>
                      <div className="space-y-3">
                        {(liveData?.agents && liveData.agents.length > 0 ? liveData.agents : []).map((agent, idx) => (
                          <div key={idx} onClick={() => openAgentDetails(agent)} className="cursor-pointer hover:scale-[1.02] transition-transform flex justify-between items-center p-3 bg-gray-50 dark:bg-[#202c33] rounded-2xl border border-gray-100 dark:border-transparent">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${agent.status === 'active' || agent.is_checked_in ? 'bg-blue-100 text-[#0056FF]' : 'bg-gray-200 text-gray-500 dark:bg-gray-800'}`}><User size={18} /></div>
                              <div><p className="font-bold text-sm dark:text-white">{agent.name || 'Agent Natango'}</p><p className="text-[10px] font-bold text-gray-400">{agent.status === 'active' || agent.is_checked_in ? '🟢 En ligne (Check-in OK)' : '⚪ Hors ligne (Pas de selfie)'}</p></div>
                            </div>
                            {agent.status === 'active' || agent.is_checked_in ? <CheckCircle2 size={18} className="text-green-500" /> : <Clock size={18} className="text-gray-400" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dashboardTab === 'operations' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 bg-white dark:bg-[#111b21] rounded-3xl p-5 border border-gray-100 dark:border-white/5">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Alertes actives</h4>
                        {(typeof liveData.incidents === 'object' ? (liveData.incidents?.pending || liveData.incidents?.total || 0) : liveData.incidents) > 0 ? (
                          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-start gap-3"><AlertTriangle className="text-red-500 shrink-0" /><div><p className="text-sm font-bold text-red-700 dark:text-red-400">Intervention en attente</p></div></div>
                        ) : (
                          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl flex items-center gap-3"><CheckCircle2 className="text-green-500" /><p className="text-sm font-bold text-green-700 dark:text-green-400">Aucun incident critique</p></div>
                        )}
                      </div>
                      <div className="bg-white dark:bg-[#111b21] rounded-3xl p-5 border border-gray-100 dark:border-white/5"><p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">En cours</p><p className="text-2xl font-black text-[#0056FF]">{typeof liveData.incidents === 'object' ? (liveData.incidents?.pending || liveData.incidents?.total || 0) : liveData.incidents}</p></div>
                      <div className="bg-white dark:bg-[#111b21] rounded-3xl p-5 border border-gray-100 dark:border-white/5"><p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">Tps Rép.</p><p className="text-2xl font-black text-gray-800 dark:text-white">{liveData.avgInterventionTime || '0'}m</p></div>
                    </div>
                  )}

                  {dashboardTab === 'heatmap' && (
                    <div className="bg-white dark:bg-[#111b21] rounded-3xl p-5 border border-gray-100 dark:border-white/5">
                      <div className="flex justify-between items-center mb-6"><h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Taux de saturation global</h4><span className="bg-blue-100 text-[#0056FF] px-3 py-1 rounded-full text-xs font-bold">{liveData.time}</span></div>
                      <div className="relative w-full h-4 bg-gray-100 dark:bg-[#202c33] rounded-full overflow-hidden mb-2"><div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${liveData.fillRate > 80 ? 'bg-red-500' : liveData.fillRate > 50 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${liveData.fillRate}%` }}></div></div>
                      <p className="text-right text-sm font-black dark:text-white">{liveData.fillRate}%</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 📁 DOSSIER RH AGENT */}
      {activeOverlay === 'agent_details' && selectedAgentStats && (
        <div className="absolute inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#111b21] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-white/10">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#202c33]">
              <h3 className="font-black text-xl dark:text-white flex items-center gap-3"><User size={22} className="text-[#0056FF]" /> Dossier Agent</h3>
              <button onClick={() => setActiveOverlay(null)} className="bg-gray-200 dark:bg-white/10 rounded-full p-2"><X size={20} className="text-gray-500 dark:text-gray-300" /></button>
            </div>
            <div className="p-8 flex flex-col items-center">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4"><span className="text-3xl font-black text-[#0056FF]">{(selectedAgentStats.name || 'A').charAt(0).toUpperCase()}</span></div>
              <h2 className="text-2xl font-black dark:text-white mb-1">{selectedAgentStats.name || 'Agent Inconnu'}</h2>
              <p className="text-gray-500 font-bold mb-6">{selectedAgentStats.phone || selectedAgentStats.phone_number || 'Numéro non transmis'}</p>
              {selectedAgentStats.loading ? (
                <Loader2 className="animate-spin text-[#0056FF] my-8" size={32} />
              ) : (
                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between p-5 rounded-3xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                    <span className="font-bold text-gray-500">Statut du jour</span>
                    <div className="flex items-center gap-2 font-black text-lg">
                      {selectedAgentStats.status === 'Présent' && <><CheckCircle2 className="text-[#00a884]" /> <span className="text-[#00a884]">Présent</span></>}
                      {selectedAgentStats.status === 'Retard' && <><Clock className="text-orange-500" /> <span className="text-orange-500">Retard</span></>}
                      {selectedAgentStats.status === 'Absent' && <><XCircle className="text-red-500" /> <span className="text-red-500">Absent</span></>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-blue-50 dark:bg-[#0056FF]/10 p-5 rounded-3xl border border-blue-100 dark:border-[#0056FF]/20 text-center shadow-inner">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Missions</p>
                      <p className="text-3xl font-black text-[#0056FF]">{selectedAgentStats?.missionsCount || 0}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/10 p-5 rounded-3xl border border-purple-100 dark:border-purple-900/20 text-center shadow-inner">
                      <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Score XP</p>
                      <p className="text-3xl font-black text-purple-600">{selectedAgentStats?.xp || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🧭 NOUVEAU SYSTÈME DE MISSION AGENT (YANGO STYLE) */}
      {activeOverlay === 'mission' && (
        <AgentMission 
          apiBaseUrl={apiBaseUrl}
          missionData={currentTaskData}
          onScanQR={handleQRScan} 
          onClose={() => setActiveOverlay(null)} 
        />
      )}


      {/* 📷 CHECK-IN FACEID (Pour la prise de service) */}
      {activeOverlay === 'checkin' && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full bg-white dark:bg-[#111b21] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/10">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-white/10">
              <h3 className="font-black text-xl dark:text-white flex items-center gap-3"><Camera className="text-blue-500" /> FaceID Natango</h3>
              <button onClick={() => { setActiveOverlay(null); setCheckinPhoto(null); }} className="bg-gray-100 dark:bg-white/5 rounded-full p-2"><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="w-full h-72 bg-black rounded-[32px] overflow-hidden relative border-2 border-white/10">
                {!checkinPhoto ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-80" /><canvas ref={canvasRef} className="hidden" />
                    {isCameraActive && <button onClick={takePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300 active:scale-90"><div className="w-12 h-12 bg-[#0056FF] dark:bg-[#00a884] m-auto rounded-full"></div></button>}
                    {!isCameraActive && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-white w-8 h-8" /></div>}
                  </>
                ) : (
                  <>
                    <img src={checkinPhoto} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/20"><CheckCircle2 size={80} className="text-white" /></div>
                    <button onClick={() => { setCheckinPhoto(null); startCamera(); }} className="absolute top-4 right-4 bg-black/60 p-2.5 rounded-full text-white"><X size={20} /></button>
                  </>
                )}
              </div>
            </div>
            <div className="p-6 pt-0">
              <button onClick={validateCheckIn} disabled={!checkinPhoto} className={`w-full py-4 rounded-3xl font-black text-lg shadow-2xl flex justify-center items-center gap-3 ${checkinPhoto ? 'bg-green-600 text-white active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                <CheckCircle2 size={24} /> Confirmer présence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📄 RAPPORT INTELLIGENCE STRUCTURÉ */}
      {selectedCall && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full bg-white dark:bg-[#111b21] rounded-t-[40px] shadow-2xl flex flex-col max-h-[92%] animate-in slide-in-from-bottom-full border-t border-gray-100 dark:border-white/5">
            <div className="flex justify-between items-start px-6 py-5 border-b border-gray-100 dark:border-white/5 shrink-0">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1"><Shield size={16} className="text-[#0056FF] dark:text-[#00a884]" /><span className="text-[10px] font-black uppercase tracking-widest text-[#0056FF] dark:text-[#00a884]">Rapport Intelligence</span></div>
                <h3 className="font-black text-xl dark:text-white">{selectedCall.title}</h3>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[11px] font-bold text-gray-400 bg-gray-50 dark:bg-[#202c33] px-2.5 py-0.5 rounded-full flex items-center gap-1"><Clock size={12} /> {selectedCall.duration}</span>
                  <span className="text-[11px] text-gray-400">{selectedCall.date}</span>
                </div>
              </div>
              <button onClick={() => setSelectedCall(null)} className="bg-gray-100 dark:bg-white/5 rounded-full p-2 ml-2 shrink-0"><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="flex items-center gap-2 text-xs font-black text-[#0056FF] dark:text-[#00a884] mb-3 uppercase tracking-widest"><FileAudio size={16} /> Synthèse IA</h4>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-white/5 dark:to-white/[0.02] p-5 rounded-3xl border border-blue-100 dark:border-transparent">
                  <p className="text-[15px] font-medium leading-relaxed dark:text-[#e9edef]">{selectedCall.summary}</p>
                </div>
              </div>
              {selectedCall.notes?.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">Observations</h4>
                  <div className="space-y-2">
                    {selectedCall.notes.map((note, i) => (
                      <div key={i} className="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3.5 rounded-2xl border border-gray-100 dark:border-white/5">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-[#202c33] flex items-center justify-center shrink-0"><span className="text-[10px] font-black text-gray-500">{i + 1}</span></div>
                        <span className="text-[14px] font-medium dark:text-[#e9edef]">{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedCall.actions?.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">Décisions & Actions</h4>
                  <div className="space-y-2.5">
                    {selectedCall.actions.map((action, i) => {
                      const txt = typeof action === 'object' ? action.text : action;
                      const st = typeof action === 'object' ? action.status : 'pending';
                      const c = st === 'done' ? { label: 'Acté', bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-900/30', icon: <CheckCircle2 size={16} /> } :
                                st === 'deferred' ? { label: 'Reporté', bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/30', icon: <RotateCcw size={16} /> } :
                                st === 'urgent' ? { label: 'Urgent', bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-900/30', icon: <AlertTriangle size={16} /> } :
                                { label: 'En cours', bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/30', icon: <CircleDot size={16} /> };
                      return (
                        <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border ${c.border} ${c.bg}`}>
                          <div className={`${c.text} shrink-0 mt-0.5`}>{c.icon}</div>
                          <p className="flex-1 text-[14px] font-bold dark:text-[#e9edef]">{txt}</p>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${c.bg} ${c.text} border ${c.border} shrink-0`}>{c.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="pt-2">
                <button onClick={() => alert("Export PDF...")} className="w-full flex items-center justify-center gap-3 bg-gray-900 dark:bg-white/10 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95"><FileText size={20} /> Exporter (PDF)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}