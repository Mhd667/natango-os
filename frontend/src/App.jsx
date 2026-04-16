import React, { useState, useRef, useEffect } from 'react';
import {
  Loader2, CheckCircle2, MoreVertical, Paperclip, Mic,
  MessageCircle, Phone, LayoutDashboard, User, BarChart2,
  X, Users, Clock, ChevronRight, Search, ArrowLeft,
  Play, Pause, FileText, Download, PhoneOff, Volume2, Camera, Send, Target, Award, Moon, Sun,
  PhoneIncoming, PhoneOutgoing, AlignLeft, CheckSquare, FileAudio, MapPin, Navigation, Map, Zap, StopCircle, BarChart,
  AlertTriangle, RotateCcw, CircleDot, Shield, CameraIcon, Smartphone, HelpCircle, Bell, XCircle, Wallet, Activity
} from 'lucide-react';

// IMPORTATION DE TES NOUVEAUX COMPOSANTS PROPRES
import CitizenView from './components/CitizenView';
import AuthOnboarding from './components/AuthOnboarding';
import Overlays from './components/Overlays';
import ChatWidgets from './components/ChatWidgets';
import NatangoHire from './components/NatangoHire';
import NatangoBadge from './components/NatangoBadge';

const getInitialApiUrl = () => {
    try {
        const savedUser = localStorage.getItem('natangoUser');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            if (user.role === 'Agent') return 'https://a587568ac7fffa.lhr.life';
        }
    } catch (e) {}
    return 'http://localhost:5000';
};

const API_BASE_URL = getInitialApiUrl();

// =====================================================
// COMPOSANT : AUDIO PLAYER
// =====================================================
function AudioPlayer({ base64, bars, mime }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const defaultBars = bars || [10, 18, 6, 22, 14, 8, 16, 20, 12, 14, 8, 16];

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const togglePlay = () => {
    if (!base64) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(`data:${mime || 'audio/mp3'};base64,${base64}`);
      audioRef.current.onloadedmetadata = () => setDuration(audioRef.current.duration);
      audioRef.current.onended = () => {
        setIsPlaying(false); setProgress(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        audioRef.current = null;
      };
    }
    audioRef.current.play().then(() => {
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        if (audioRef.current) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      }, 100);
    }).catch(() => setIsPlaying(false));
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <button onClick={togglePlay} disabled={!base64} className={`w-9 h-9 flex-shrink-0 bg-[#0056FF] dark:bg-[#00a884] text-white dark:text-[#111b21] rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${!base64 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
        {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="ml-0.5 fill-current" />}
      </button>
      <div className="flex-1 flex items-center gap-0.5 px-1">
        {defaultBars.map((h, i) => (
          <div key={i} className={`w-1 rounded-full transition-colors duration-150 ${i < Math.floor((progress / 100) * defaultBars.length) ? 'bg-[#0056FF] dark:bg-[#00a884]' : 'bg-gray-300 dark:bg-[#2a3942]'}`} style={{ height: `${h}px` }} />
        ))}
      </div>
      <span className="text-[10px] font-bold text-gray-500 dark:text-[#8696a0] min-w-[30px] text-right">
        {isPlaying ? formatTime(audioRef.current?.currentTime || 0) : formatTime(duration)}
      </span>
    </div>
  );
}

// =====================================================
// FONCTION : LECTURE VOCALE GEMINI
// =====================================================
const playGeminiVoice = async (text) => {
  try {
    const response = await fetch('http://localhost:5000/api/gemini-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await response.json();
    
    if (data.audioContent) {
      // On joue l'audio renvoyé par Gemini
      const audio = new Audio(`data:${data.mimeType};base64,${data.audioContent}`);
      audio.play();
    }
  } catch (err) {
    console.error("Échec de la lecture vocale:", err);
  }
};

// =====================================================
// APPLICATION PRINCIPALE (CHEF D'ORCHESTRE)
// =====================================================
export default function App() {
  // 🛑 HACK D'IMPRESSION (À remettre sur "false" après tes captures)
  const modeImpression = false; 

  if (modeImpression) {
    return <NatangoBadge villa="1" bacId="BAC-001" />;
  }

  const [currentUser, setCurrentUser] = useState(null);
  
  // États de navigation
  const [activeView, setActiveView] = useState('chat_list');
  const [activeChatId, setActiveChatId] = useState('');
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Desktop detection
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);

  // États pour les chats & appels
  const [chats, setChats] = useState({});
  const [callHistoryList, setCallHistoryList] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [useVoiceReply, setUseVoiceReply] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  
  // États Dashboard & RH
  const [dashboardTab, setDashboardTab] = useState('operations');
  const [liveData, setLiveData] = useState({ time: "19:30:00", fillRate: 0, incidents: 0, zones: [] });
  const [selectedAgentStats, setSelectedAgentStats] = useState(null);
  const [agentXP, setAgentXP] = useState(1200);

  // États Missions & Urgences
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [currentIncidentId, setCurrentIncidentId] = useState(null);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [currentTaskData, setCurrentTaskData] = useState(null);
  const [resolvedTasks, setResolvedTasks] = useState([]);

  // États RH & Caméra
  const [attendanceReason, setAttendanceReason] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [checkinPhoto, setCheckinPhoto] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Audio / Meeting Refs
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const meetingRecorderRef = useRef(null);
  const meetingStreamRef = useRef(null);
  const meetingIntervalRef = useRef(null);
  const isSendingChunkRef = useRef(false);
  const knownTasksRef = useRef(new Set());
  const [meetingTranscript, setMeetingTranscript] = useState("");
  const meetingTranscriptRef = useRef("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const sessionTimeoutRef = useRef(null);
  const [callStartTime, setCallStartTime] = useState(null);

  // --- RÉFÉRENCES GEMINI LIVE ---
  const liveWsRef = useRef(null);
  const liveAudioCtxRef = useRef(null);
  const liveStreamRef = useRef(null);
  const processorRef = useRef(null);

  // GPS
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); document.body.style.backgroundColor = '#0b141a'; }
    else { document.documentElement.classList.remove('dark'); document.body.style.backgroundColor = '#F7F8FA'; }
  }, [isDarkMode]);

  useEffect(() => {
    if (activeView === 'conversation') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeView, isAiTyping]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');

    if (role === 'Public') {
      setCurrentUser({ name: 'Citoyen', role: 'Public', phone: '0000' });
    } else {
      const savedUser = localStorage.getItem('natangoUser');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        handleLoginSuccess(parsedUser);
      }
    }
  }, []);

  const playSound = (type = 'ding') => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'ding') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'ringtone') {
        osc.type = 'square'; osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.setValueAtTime(600, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.8, ctx.currentTime);
        osc.start(); osc.stop(ctx.currentTime + 1.5);
      }
    } catch (e) { console.warn("Audio non supporté"); }
  };

  const showToast = (message) => { setToastMessage(message); setTimeout(() => setToastMessage(null), 3500); };

  const generateInitialChats = (role, name) => {
    if (role === 'DG' || role === 'Superviseur') {
      return { 
        'hub': { name: 'Natango Hub', sub: 'Chef de Cabinet', color: 'bg-blue-500', messages: [{ id: 1, type: 'system', content: `🟢 Connexion établie. Bienvenue ${name}.` }] },
        'account': { name: 'Natango Account', sub: 'Expert Comptable', color: 'bg-amber-500', messages: [{ id: 2, type: 'system', content: 'Module comptable synchronisé. Prêt pour l\'audit.' }] },
        'customer': { name: 'Natango Customer', sub: 'Relation Client', color: 'bg-indigo-500', messages: [{ id: 3, type: 'system', content: 'Passerelle WhatsApp connectée.' }] },
        'ops': { name: 'Natango Ops', sub: 'Logistique & Dispatch', color: 'bg-green-500', messages: [{ id: 4, type: 'system', content: 'Carte et dispatching en direct.' }] },
        'rh': { name: 'Natango RH', sub: 'Monitoring Effectifs', color: 'bg-orange-500', messages: [{ id: 5, type: 'system', content: 'Scanner facial et géolocalisation actifs.' }] }
      };
    } else {
      return { 
        'ops': { name: 'Centrale Ops', sub: 'Missions Live', color: 'bg-green-500', messages: [{ id: 1, type: 'system', content: `🟢 Position GPS sécurisée. En attente de mission...` }] },
        'rh': { name: 'Natango RH', sub: 'Check-in', color: 'bg-orange-500', messages: [{ id: 2, type: 'action_rh', content: 'Effectuez votre check-in (Photo) pour prendre votre service.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] },
        'hire': { name: 'Natango Hire', sub: 'Enrôlement & GPS', color: 'bg-indigo-600', messages: [{ id: 3, type: 'action_hire', content: 'Module de scellage terrain activé. Utilisez le bouton ci-dessous pour enrôler une nouvelle villa.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] }
      };
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('natangoUser', JSON.stringify(user));
    setChats(generateInitialChats(user.role, user.name));
    // ⚠️ On remplace 'terrain' par 'ops' pour l'agent
    setActiveChatId((user.role === 'DG' || user.role === 'Superviseur') ? 'hub' : 'ops');
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'Agent') {
      const sendLocation = () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              fetch(`${API_BASE_URL}/api/heartbeat`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: currentUser.phone, name: currentUser.name, lat: pos.coords.latitude, lng: pos.coords.longitude })
              }).catch(() => { });
            },
            () => { }, { enableHighAccuracy: true }
          );
        }
      };
      const heart = setInterval(sendLocation, 20000);
      sendLocation();
      return () => clearInterval(heart);
    }
  }, [currentUser]);

  useEffect(() => {
    let intervalEvents; let intervalTasks; let intervalDg;

    if (currentUser && currentUser.role !== 'Public') {
      intervalEvents = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/events/${currentUser.role}/${currentUser.phone}`);
          const data = await res.json();
          if (data.success && data.events.length > 0) {
            setChats(prev => {
              const newChats = { ...prev };
              data.events.forEach(e => { if (newChats[e.chatId]) newChats[e.chatId].messages.push(e.messageObj); });
              return newChats;
            });

            const firstEvent = data.events[0];
            if (firstEvent.type === 'incoming_call') {
              setCurrentIncidentId(firstEvent.messageObj.incidentId);
              setActiveOverlay('incoming_call_screen'); playSound('ringtone');
            } else if (firstEvent.type === 'hr_attendance_prompt') {
              setActiveOverlay('hr_attendance_prompt_screen'); playSound('ding');
            } else {
              playSound('ding'); showToast({ title: "Natango OS", body: firstEvent.messageObj?.content || "Nouvelle notification" });
            }
          }
        } catch (e) { }
      }, 3000);

      if (currentUser.role === 'Agent') {
        intervalTasks = setInterval(async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/tasks/${currentUser.phone}`);
            const data = await res.json();
            if (data.success && data.task && !knownTasksRef.current.has(data.task.id)) {
              knownTasksRef.current.add(data.task.id);
              setCurrentTaskData(data.task);
              
              // 🚨 LOGIQUE DYNAMIQUE : DG vs CITOYEN & COULEURS D'URGENCE
              let emoji = '🔵'; let urgencyLevel = 'NORMALE';
              if (data.task.urgency === 'Critical') { emoji = '🚨'; urgencyLevel = 'CRITIQUE'; }
              else if (data.task.urgency === 'High') { emoji = '⚠️'; urgencyLevel = 'HAUTE'; }
              else if (data.task.urgency === 'Medium') { emoji = '🟠'; urgencyLevel = 'MOYENNE'; }

              const isDG = data.task.type === "Déploiement Tactique DG";
              
              const urgencyMsg = isDG 
                ? `👔 ORDRE DE DÉPLOIEMENT (${urgencyLevel})\n📍 Zone : ${data.task.zone}\n👉 ${data.task.description}`
                : `${emoji} SIGNALEMENT CITOYEN (${urgencyLevel})\n🗑️ Type : ${data.task.type}\n📍 Lieu : ${data.task.zone}\n👤 Signalé par : ${data.task.citizenName}\n👉 Intervention requise.`;
              
              setChats(prev => ({
                ...prev, 'ops': {
                  ...prev['ops'], messages: [...prev['ops'].messages, {
                    id: data.task.id, type: 'action', taskId: data.task.id, content: urgencyMsg,
                    fullTask: data.task, // 👈 ON SAUVEGARDE LA TÂCHE COMPLÈTE ICI
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }]
                }
              }));
              playSound('ding'); showToast({ title: "Nouvelle Mission", body: "Une mission vous a été assignée." });
            }
          } catch (e) { }
        }, 4000);
      }

      if (currentUser.role === 'DG' || currentUser.role === 'Superviseur') {
        intervalDg = setInterval(async () => {
          try { const res = await fetch(`${API_BASE_URL}/api/dashboard-live`); const data = await res.json(); if (data.success) setLiveData(data.data); } catch (e) { }
        }, 5000);
      }
    }
    return () => { clearInterval(intervalEvents); clearInterval(intervalTasks); clearInterval(intervalDg); };
  }, [currentUser]);

  const getHistoryForApi = (chatId) => {
    if (!chats[chatId]) return [];
    return chats[chatId].messages.map(msg => {
      if (['text_in', 'voice_in'].includes(msg.type)) return { role: 'user', content: msg.content || "" };
      if (['text_out', 'voice_out'].includes(msg.type)) return { role: 'assistant', content: msg.content || "" };
      return null;
    }).filter(Boolean);
  };

  const handleSendMessage = async (textOverride) => {
    const userMessage = textOverride || inputText;
    if (!userMessage.trim() || isAiTyping) return;
    
    const cid = activeChatId;
    setChats(prev => ({ ...prev, [cid]: { ...prev[cid], messages: [...prev[cid].messages, { id: Date.now(), type: 'text_in', content: userMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] } }));
    
    if (!textOverride) setInputText(''); 
    setIsAiTyping(true);
    
    try {
      // 🟢 LOGIQUE D'AIGUILLAGE : chaque IA a sa propre route backend
      let endpoint = `${API_BASE_URL}/api/chat`; // Route par défaut pour Hub, Ops, RH
      if (cid === 'account') endpoint = `${API_BASE_URL}/api/account/chat`;
      if (cid === 'customer') endpoint = `${API_BASE_URL}/api/customer/chat`;

      const response = await fetch(endpoint, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
            userId: currentUser.phone, 
            userName: currentUser.name, 
            role: currentUser.role, 
            targetAi: cid, 
            message: userMessage, 
            history: getHistoryForApi(cid) 
        }) 
      });
      
      const data = await response.json();
      if (data.success) {
        setChats(prev => ({ 
          ...prev, 
          [cid]: { ...prev[cid], messages: [...prev[cid].messages, data.reply] } 
        }));

        // 🟢 Déclencheur vocal : si tu as utilisé le micro, Gemini répond avec sa voix
        if (useVoiceReply && data.reply.type === 'text_out') {
           playGeminiVoice(data.reply.content);
           setUseVoiceReply(false); // Réinitialise pour le prochain message
        }
      }
    } catch (error) { 
        showToast("Erreur Serveur IA."); 
    } finally { 
        setIsAiTyping(false); 
    }
  };

  // =====================================================
  // GESTION DES NOTES VOCALES (STT GEMINI)
  // =====================================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result.split(',')[1];
          try {
            const res = await fetch(`${API_BASE_URL}/api/stt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Audio })
            });
            const data = await res.json();
            if (data.success && data.transcription) {
              setUseVoiceReply(true);
              handleSendMessage(data.transcription);
            }
          } catch (e) {
            showToast("Erreur de transcription Gemini.");
          }
        };
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      showToast("Accès micro refusé.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const getDynamicMission = (name) => {
    const n = name.toLowerCase();
    if (n.includes('mouhamed') || n.includes('sow')) return "Évacuation prioritaire Zone Sud";
    if (n.includes('hamidou') || n.includes('ndiaye')) return "Supervision Propreté Zone Est";
    return "Surveillance Logistique";
  };

  const openAgentDetails = async (agent) => {
    setActiveOverlay('agent_details');
    setSelectedAgentStats({ ...agent, loading: true });
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent-stats/${agent.phone || agent.phone_number}`);
      const data = await res.json();
      if (data.success) setSelectedAgentStats({ ...agent, ...data.stats, loading: false });
    } catch (e) { setSelectedAgentStats({ ...agent, loading: false, error: true }); }
  };

  const reportAgentIssue = async () => {
    const issue = prompt("Décrivez le problème (ex: Plus de sacs, Zone bloquée) :");
    if (!issue) return;
    try {
      await fetch(`${API_BASE_URL}/api/agent-issue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: currentUser.name, phone: currentUser.phone, issue }) });
      showToast("Problème envoyé à l'IA.");
    } catch (e) { }
  };

  // =====================================================
  // VALIDATION ARRIVÉE SUR ZONE (bouton "J'y suis")
  // =====================================================
  const validerArriveeSurZone = async (zoneName) => {
    try {
      await fetch(`${API_BASE_URL}/api/zone-arrival`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentUser.phone,
          name: currentUser.name,
          zone: zoneName,
          lat: coords?.lat,
          lng: coords?.lng
        })
      });
      showToast(`✅ Position confirmée en ${zoneName}`);
      // Mettre à jour le message pour montrer la confirmation
      setChats(prev => {
        const newChats = { ...prev };
        const terrainMsgs = newChats['terrain'].messages.map(m =>
          m.zoneName === zoneName && m.type === 'zone_assign'
            ? { ...m, confirmed: true }
            : m
        );
        newChats['terrain'] = { ...newChats['terrain'], messages: terrainMsgs };
        return newChats;
      });
    } catch (e) {
      showToast("Erreur réseau. Réessayez.");
    }
  };

  // =====================================================
  // VERROU 24H POUR LE CHECK-IN
  // =====================================================
  const handleOpenCheckin = () => {
    const lastCheckin = localStorage.getItem(`lastCheckin_${currentUser.phone}`);
    
    if (lastCheckin) {
      const timePassed = Date.now() - parseInt(lastCheckin, 10);
      const hours24 = 24 * 60 * 60 * 1000;
      
      if (timePassed < hours24) {
        showToast("⏳ Vous avez déjà pointé aujourd'hui. Caméra verrouillée.");
        return;
      }
    }
    setActiveOverlay('checkin');
  };

  // =====================================================
  // GESTION DE LA CAMÉRA (Selfie vs Face Arrière)
  // =====================================================
  const startCamera = async () => {
    try {
      const facingMode = activeOverlay === 'checkin' ? 'user' : 'environment';
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); }
    } catch (err) { 
      console.error("Erreur caméra :", err);
      showToast("Veuillez autoriser l'accès à la caméra de votre téléphone."); 
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    if (activeOverlay === 'checkin' || activeOverlay === 'proof_photo') {
      if (!checkinPhoto) startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeOverlay, checkinPhoto]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth; 
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      setCheckinPhoto(canvasRef.current.toDataURL('image/jpeg', 0.9));
      stopCamera();
    }
  };

  const validateCheckIn = async () => {
    if (!checkinPhoto) return;
    
    showToast("Transmission au Superviseur en cours...");
    try {
      // 1. Envoi au Backend (qui mettra à jour le Dashboard DG)
      await fetch(`${API_BASE_URL}/api/checkin`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentUser.phone,
          name: currentUser.name,
          lat: coords?.lat || 14.716,
          lng: coords?.lng || -17.467,
          photoBase64: checkinPhoto
        })
      });
      
      // Envoi d'un message direct au chat RH du DG pour l'informer
      fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.phone,
          userName: currentUser.name,
          role: 'Agent',
          targetAi: 'rh',
          message: `[SYSTÈME] L'agent ${currentUser.name} a validé sa prise de poste (Check-in). Position sécurisée.`,
          history: []
        })
      }).catch(()=>{});

      localStorage.setItem(`lastCheckin_${currentUser.phone}`, Date.now());

      setActiveOverlay(null); 
      setCheckinPhoto(null);
      showToast("Check-in validé et transmis !");

      setChats(prev => ({
        ...prev,
        'rh': {
          ...prev['rh'],
          messages: [
            ...prev['rh'].messages,
            {
              id: Date.now(),
              type: 'text_out',
              content: `✅ Prise de poste validée pour ${currentUser.name}.\n📍 Coordonnées transmises au Superviseur.\n🔒 Appareil photo verrouillé pour 24h.`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        }
      }));
    } catch (e) {
      setActiveOverlay(null);
      showToast("Erreur réseau pendant le check-in.");
    }
  };

  const validateTask = async () => {
    if (!checkinPhoto || !currentTaskId) return;
    try {
      await fetch(`${API_BASE_URL}/api/resolve`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ taskId: currentTaskId, photo: checkinPhoto, agentName: currentUser.name }) 
      });
      setResolvedTasks(prev => [...prev, currentTaskId]); 
      setActiveOverlay(null); 
      setCheckinPhoto(null);
      showToast("Mission accomplie ! L'IA vérifie l'intervention."); 
      setAgentXP(prev => prev + 150);
    } catch (e) { 
      setActiveOverlay(null); 
    }
  };

  // =====================================================
  // VALIDATION PAR SCAN QR (L'Arme de l'Agent)
  // =====================================================
  const handleQRScan = async () => {
    if (!currentTaskId) return;
    
    showToast("Analyse cryptographique du QR Code...");
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/scan-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentPhone: currentUser.phone,
          agentName: currentUser.name,
          qrData: "DEMO_QR_800", // Fausse donnée pour la démo
          lat: coords?.lat || 14.716,
          lng: coords?.lng || -17.467,
          taskId: currentTaskId
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setResolvedTasks(prev => [...prev, currentTaskId]);
        setActiveOverlay(null);
        stopCamera();
        
        // Notification triomphale
        showToast({ 
          title: "Collecte Validée", 
          body: "✅ CRM mis à jour. Le client a reçu sa notification WhatsApp." 
        });
        setAgentXP(prev => prev + 200); // Bonus XP pour le scan !
      } else {
        showToast(data.message || "Échec du scan (Trop loin de la cible ?)");
      }
    } catch (e) {
      showToast("Erreur de connexion au serveur Ops.");
    }
  };

  // =====================================================
  // CALCULS GPS
  // =====================================================
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3; const rad = Math.PI / 180;
    const a = Math.sin((lat2 - lat1) * rad / 2) * Math.sin((lat2 - lat1) * rad / 2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) * Math.sin((lon2 - lon1) * rad / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const rad = Math.PI / 180;
    const y = Math.sin((lon2 - lon1) * rad) * Math.cos(lat2 * rad);
    const x = Math.cos(lat1 * rad) * Math.sin(lat2 * rad) - Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lon2 - lon1) * rad);
    return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
  };

  // =====================================================
  // MOTEUR DE RENDU CARTE (Lat/Lng -> X/Y Pixels)
  // =====================================================
  const getMapCoordinates = (lat, lng) => {
    // Si pas de GPS, on met au centre
    if (!lat || !lng) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    
    // Centre de référence (Dakar par défaut)
    const centerLat = 14.7160; 
    const centerLng = -17.4670;
    
    // Zoom de la mini-carte (Ajuste ce chiffre si les points sortent trop de l'écran)
    const zoom = 1200; 
    
    // Calcul des pourcentages
    let top = 50 + ((centerLat - lat) * zoom);
    let left = 50 + ((lng - centerLng) * zoom);
    
    // On bloque les pastilles pour ne pas qu'elles sortent du cadre de la carte
    top = Math.max(10, Math.min(90, top));
    left = Math.max(10, Math.min(90, left));
    
    return { 
      top: `${top}%`, 
      left: `${left}%`, 
      transform: 'translate(-50%, -50%)',
      transition: 'all 1.5s ease-in-out' // 👈 C'est ça qui fait glisser la pastille doucement
    };
  };

  // =====================================================
  // MODE RÉUNION (GEMINI LIVE WEBSOCKET)
  // =====================================================

  const startMeetingLive = async () => {
    setIsCallActive(true);
    showToast("Connexion au réseau satellite Natango...");

    // 1. Connexion au WebSocket de ton backend
    // Si tu es en prod, remplace ws:// par wss://
    liveWsRef.current = new WebSocket(`ws://localhost:5000/api/meeting-live`);

    liveWsRef.current.onopen = async () => {
      // On signale au serveur qui parle
      liveWsRef.current.send(JSON.stringify({ type: 'session_start', userName: currentUser.name }));

      try {
        // 2. Capture du micro en continu (Format PCM 16kHz exigé par Gemini)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
        liveStreamRef.current = stream;

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        liveAudioCtxRef.current = audioCtx;
        
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        // 3. Envoi des paquets audio en base64 au serveur en temps réel
        processor.onaudioprocess = (e) => {
          if (!liveWsRef.current || liveWsRef.current.readyState !== WebSocket.OPEN) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768)); // Conversion Float32 -> Int16
          }
          
          const buffer = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < buffer.byteLength; i++) binary += String.fromCharCode(buffer[i]);
          
          liveWsRef.current.send(JSON.stringify({ type: 'audio_chunk', audio: btoa(binary) }));
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      } catch (err) {
        showToast("Erreur d'accès au micro.");
        stopMeetingLive();
      }
    };

    liveWsRef.current.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'ai_text') {
        // Le texte arrive en direct
        setIsAiTyping(false);
      }
      
      if (msg.type === 'ai_audio') {
        // 4. Lecture de la voix de l'IA (PCM 24kHz renvoyé par Gemini)
        setIsAiTyping(true); // Fait pulser le logo pendant qu'il parle
        try {
          const binary = atob(msg.audio);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          
          const int16Array = new Int16Array(bytes.buffer);
          const float32Array = new Float32Array(int16Array.length);
          for (let i = 0; i < int16Array.length; i++) float32Array[i] = int16Array[i] / 32768.0;

          const playCtx = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = playCtx.createBuffer(1, float32Array.length, 24000);
          audioBuffer.getChannelData(0).set(float32Array);
          
          const playSource = playCtx.createBufferSource();
          playSource.buffer = audioBuffer;
          playSource.connect(playCtx.destination);
          playSource.start();
          
          playSource.onended = () => setIsAiTyping(false);
        } catch (e) { console.error("Erreur lecture audio IA", e); }
      }

      if (msg.type === 'meeting_summary') {
        // Quand on raccroche, on reçoit le beau rapport
        setCallHistoryList(prev => [{ id: Date.now(), title: msg.data.title, date: "À l'instant", type: "outgoing", duration: "Terminé", summary: msg.data.summary, notes: msg.data.notes, actions: msg.data.actions }, ...prev]);
        showToast("Le rapport de réunion a été généré et archivé.");
      }
    };
  };

  const stopMeetingLive = () => {
    // Coupe la session, déclenche la création du rapport côté serveur
    if (liveWsRef.current && liveWsRef.current.readyState === WebSocket.OPEN) {
      liveWsRef.current.send(JSON.stringify({ type: 'session_end' }));
    }
    setTimeout(() => {
      if (processorRef.current) processorRef.current.disconnect();
      if (liveAudioCtxRef.current) liveAudioCtxRef.current.close();
      if (liveStreamRef.current) liveStreamRef.current.getTracks().forEach(t => t.stop());
      if (liveWsRef.current) liveWsRef.current.close();
      setIsCallActive(false);
      setIsAiTyping(false);
    }, 500); // Petit délai pour s'assurer que le message "session_end" est bien parti
  };

  // =====================================================
  // VUES PRINCIPALES (ROUTING INTERNE)
  // =====================================================
  if (!currentUser) {
    return <AuthOnboarding onLoginSuccess={handleLoginSuccess} isDarkMode={isDarkMode} />;
  }

  if (currentUser.role === 'Public') {
    return <CitizenView currentUser={currentUser} isDarkMode={isDarkMode} />;
  }

  return (
    <div className={`fixed inset-0 flex justify-center font-sans overflow-hidden transition-colors duration-300 ${isDarkMode ? "bg-black text-gray-100" : "bg-[#F7F8FA] text-gray-900"}`}>
      <div className={`w-full h-full bg-white dark:bg-[#0b141a] flex flex-col md:flex-row relative overflow-hidden border-x border-gray-200 dark:border-black shadow-2xl transition-all duration-500 ease-in-out ${activeOverlay === 'dashboard' ? 'max-w-6xl' : 'max-w-md md:max-w-5xl'}`}>

        {/* 🍏 NOTIFICATION UNIVERSELLE */}
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

        {/* ============ DESKTOP SIDEBAR ============ */}
        <div className="hidden md:flex md:w-80 md:shrink-0 flex-col h-full border-r border-gray-100 dark:border-[#202c33] bg-white dark:bg-[#0b141a]">
          <div className="flex items-center justify-around px-2 pt-3 pb-1 border-b border-gray-100 dark:border-[#202c33] shrink-0">
            <button onClick={() => setActiveView('chat_list')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-black transition-all ${activeView === 'chat_list' || activeView === 'conversation' ? 'bg-blue-50 dark:bg-[#202c33] text-[#0056FF] dark:text-[#00a884]' : 'text-gray-400 hover:text-gray-600'}`}><MessageCircle size={18} /> Capteurs</button>
            <button onClick={() => setActiveView('call_history')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-black transition-all ${activeView === 'call_history' ? 'bg-blue-50 dark:bg-[#202c33] text-[#0056FF] dark:text-[#00a884]' : 'text-gray-400 hover:text-gray-600'}`}><Phone size={18} /> Calls</button>
            {(currentUser.role === 'DG' || currentUser.role === 'Superviseur') && (<button onClick={() => setActiveOverlay('dashboard')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-black transition-all ${activeOverlay === 'dashboard' ? 'bg-blue-50 dark:bg-[#202c33] text-[#0056FF] dark:text-[#00a884]' : 'text-gray-400 hover:text-gray-600'}`}><LayoutDashboard size={18} /> Live</button>)}
            <button onClick={() => setActiveView('profile')} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-black transition-all ${activeView === 'profile' ? 'bg-blue-50 dark:bg-[#202c33] text-[#0056FF] dark:text-[#00a884]' : 'text-gray-400 hover:text-gray-600'}`}><User size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* SIDEBAR: CHAT LIST */}
            {(activeView === 'chat_list' || activeView === 'conversation') && !isCallActive && (
              <div className="flex-1 flex flex-col">
                <div className="pt-5 pb-3 px-5 shrink-0"><h1 className="text-xl font-extrabold dark:text-[#e9edef] mb-3">Capteurs Natango</h1></div>
                <div className="flex-1 overflow-y-auto">
                  {Object.entries(chats).map(([id, chat]) => (
                    <div key={id} onClick={() => { setActiveChatId(id); setActiveView('conversation'); }} className={`flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#111b21] cursor-pointer transition-colors ${activeChatId === id ? 'bg-blue-50/50 dark:bg-[#111b21]' : ''}`}>
                      <div className={`w-11 h-11 bg-gray-100 dark:bg-[#111b21] rounded-xl border border-gray-100 dark:border-[#202c33] p-1.5 flex shrink-0 ${id === 'marketing' ? 'border-purple-200 bg-purple-50' : ''}`}>
                        {id === 'marketing' ? <BarChart size={22} className="text-purple-500 m-auto" /> : 
                         id === 'hub' ? <LayoutDashboard size={22} className="text-blue-500 m-auto" /> :
                         id === 'account' ? <Wallet size={22} className="text-amber-500 m-auto" /> :
                         id === 'customer' ? <Users size={22} className="text-indigo-500 m-auto" /> :
                         id === 'ops' ? <Activity size={22} className="text-green-500 m-auto" /> :
                         id === 'rh' ? <Shield size={22} className="text-orange-500 m-auto" /> :
                         <img src="/logo.png" className={`w-full h-full object-contain ${id !== 'hub' && id !== 'terrain' ? 'grayscale opacity-70' : ''}`} alt="av" />}
                      </div>
                      <div className="ml-3 flex-1 border-b border-gray-100 dark:border-[#202c33] pb-3">
                        <div className="flex justify-between items-baseline mb-0.5"><h3 className="font-bold text-[14px] dark:text-[#e9edef]">{chat.name}</h3><ChevronRight size={14} className="text-gray-300" /></div>
                        <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${chat.color} ${id === 'terrain' || id === 'hub' ? 'animate-pulse' : ''}`}></span><p className="text-[12px] text-gray-500 dark:text-[#8696a0] font-medium truncate">{chat.sub}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* SIDEBAR: PROFILE */}
            {activeView === 'profile' && !isCallActive && (
              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="pt-5 pb-4 px-5 border-b border-gray-100 dark:border-[#202c33]">
                  <h1 className="text-xl font-extrabold dark:text-[#e9edef] mb-4">Profil {currentUser.role}</h1>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#111b21] flex items-center justify-center overflow-hidden border-3 border-gray-200 dark:border-[#202c33]"><User size={32} className="text-gray-400" /></div>
                    <div><h2 className="text-lg font-black dark:text-white">{currentUser.name}</h2><p className="text-sm text-gray-500 dark:text-[#8696a0]">{currentUser.phone}</p></div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="bg-gray-50 dark:bg-[#111b21] rounded-2xl p-4 flex items-center justify-between border border-gray-100 dark:border-[#202c33]">
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-[#202c33] flex items-center justify-center text-indigo-500">{isDarkMode ? <Moon size={18} /> : <Sun size={18} />}</div><p className="text-[14px] font-bold dark:text-[#e9edef]">Mode Sombre</p></div>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-12 h-6 rounded-full p-0.5 ${isDarkMode ? 'bg-[#00a884]' : 'bg-gray-300'}`}><div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#111b21] rounded-2xl p-4 border border-gray-100 dark:border-[#202c33]">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Poste</p>
                    <p className="text-[14px] font-bold dark:text-[#e9edef]">{(currentUser.role === 'DG' || currentUser.role === 'Superviseur') ? 'Directeur Général' : 'Agent de Terrain'}</p>
                  </div>
                  {currentUser.role === 'Agent' && (
                    <>
                      <div className="bg-blue-50 dark:bg-[#111b21] border border-blue-100 dark:border-[#202c33] rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-[#202c33] rounded-xl flex items-center justify-center text-[#0056FF] dark:text-[#00a884]"><Target size={20} /></div>
                        <div>
                          <p className="text-[10px] text-[#0056FF] dark:text-[#00a884] uppercase font-black tracking-widest">Mission</p>
                          <p className="text-[13px] font-bold dark:text-[#e9edef]">{getDynamicMission(currentUser.name)}</p>
                        </div>
                      </div>
                      <div className="bg-orange-50 dark:bg-[#111b21] border border-orange-100 dark:border-[#202c33] rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-[#202c33] rounded-xl flex items-center justify-center text-orange-500"><Award size={20} /></div>
                        <div>
                          <p className="text-[10px] text-orange-500 uppercase font-black tracking-widest">Performance</p>
                          <p className="text-[14px] font-black dark:text-[#e9edef]">{agentXP} XP</p>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="p-4 pt-0">
                    <button onClick={() => { localStorage.removeItem('natangoUser'); window.location.href = '/'; }} className="w-full mt-4 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 font-black rounded-3xl active:scale-95 border border-red-100 dark:border-red-900/30">Se déconnecter</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============ MAIN CONTENT AREA ============ */}
        <div className="flex-1 overflow-hidden flex flex-col relative">

          {/* MOBILE CHAT LIST */}
          {activeView === 'chat_list' && !isCallActive && (
            <div className="flex-1 flex flex-col animate-in fade-in h-full absolute inset-0 bg-white dark:bg-[#0b141a] z-10 md:hidden">
              <div className="pt-12 pb-4 px-5 shrink-0"><h1 className="text-3xl font-extrabold dark:text-[#e9edef] mb-5">Capteurs Natango</h1></div>
              <div className="flex-1 overflow-y-auto pb-4">
                {Object.entries(chats).map(([id, chat]) => (
                  <div key={id} onClick={() => { setActiveChatId(id); setActiveView('conversation'); }} className="flex items-center px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#111b21] cursor-pointer">
                    <div className={`w-14 h-14 bg-gray-100 dark:bg-[#111b21] rounded-2xl border border-gray-100 dark:border-[#202c33] p-2 flex shrink-0 ${id === 'marketing' ? 'border-purple-200 bg-purple-50' : ''}`}>
                      {id === 'marketing' ? <BarChart size={28} className="text-purple-500 m-auto" /> : 
                       id === 'hub' ? <LayoutDashboard size={28} className="text-blue-500 m-auto" /> :
                       id === 'account' ? <Wallet size={28} className="text-amber-500 m-auto" /> :
                       id === 'customer' ? <Users size={28} className="text-indigo-500 m-auto" /> :
                       id === 'ops' ? <Activity size={28} className="text-green-500 m-auto" /> :
                       id === 'rh' ? <Shield size={28} className="text-orange-500 m-auto" /> :
                       <img src="/logo.png" className={`w-full h-full object-contain ${id !== 'hub' && id !== 'terrain' ? 'grayscale opacity-70' : ''}`} alt="av" />}
                    </div>
                    <div className="ml-4 flex-1 border-b border-gray-100 dark:border-[#202c33] pb-4">
                      <div className="flex justify-between items-baseline mb-1"><h3 className="font-bold text-[17px] dark:text-[#e9edef]">{chat.name}</h3><ChevronRight size={16} className="text-gray-300" /></div>
                      <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${chat.color} ${id === 'terrain' || id === 'hub' ? 'animate-pulse' : ''}`}></span><p className="text-[13px] text-gray-500 dark:text-[#8696a0] font-medium truncate">{chat.sub}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MOBILE PROFILE */}
          {activeView === 'profile' && !isCallActive && (
             <div className="flex-1 flex flex-col animate-in fade-in h-full absolute inset-0 bg-white dark:bg-[#0b141a] z-10 overflow-y-auto md:hidden">
              <div className="pt-12 pb-6 px-5 border-b border-gray-100 dark:border-[#202c33]">
                <h1 className="text-3xl font-extrabold dark:text-[#e9edef] mb-6">Profil {currentUser.role}</h1>
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-[#111b21] flex items-center justify-center overflow-hidden border-4 border-gray-200 dark:border-[#202c33]"><User size={44} className="text-gray-400" /></div>
                  <div><h2 className="text-2xl font-black dark:text-white">{currentUser.name}</h2><p className="text-gray-500 dark:text-[#8696a0]">{currentUser.phone}</p></div>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-gray-50 dark:bg-[#111b21] rounded-3xl p-5 flex items-center justify-between border border-gray-100 dark:border-[#202c33]">
                  <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-[#202c33] flex items-center justify-center text-indigo-500">{isDarkMode ? <Moon size={22} /> : <Sun size={22} />}</div><p className="text-[15px] font-bold dark:text-[#e9edef]">Mode Sombre</p></div>
                  <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-14 h-7 rounded-full p-1 ${isDarkMode ? 'bg-[#00a884]' : 'bg-gray-300'}`}><div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${isDarkMode ? 'translate-x-7' : 'translate-x-0'}`}></div></button>
                </div>
                <div className="bg-gray-50 dark:bg-[#111b21] rounded-3xl p-5 border border-gray-100 dark:border-[#202c33]">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Poste</p>
                  <p className="text-[16px] font-bold dark:text-[#e9edef]">{(currentUser.role === 'DG' || currentUser.role === 'Superviseur') ? 'Directeur Général' : 'Agent de Terrain'}</p>
                </div>
                {currentUser.role === 'Agent' && (
                  <>
                    <div className="bg-blue-50 dark:bg-[#111b21] border border-blue-100 dark:border-[#202c33] rounded-3xl p-5 flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-100 dark:bg-[#202c33] rounded-2xl flex items-center justify-center text-[#0056FF] dark:text-[#00a884]"><Target size={28} /></div>
                      <div>
                        <p className="text-[10px] text-[#0056FF] dark:text-[#00a884] uppercase font-black tracking-widest">Mission</p>
                        <p className="text-[15px] font-bold dark:text-[#e9edef]">{getDynamicMission(currentUser.name)}</p>
                      </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-[#111b21] border border-orange-100 dark:border-[#202c33] rounded-3xl p-5 flex items-center gap-4">
                      <div className="w-14 h-14 bg-orange-100 dark:bg-[#202c33] rounded-2xl flex items-center justify-center text-orange-500"><Award size={28} /></div>
                      <div>
                        <p className="text-[10px] text-orange-500 uppercase font-black tracking-widest">Performance</p>
                        <p className="text-[16px] font-black dark:text-[#e9edef]">{agentXP} XP</p>
                      </div>
                    </div>
                    {/* BOUTON NATANGO HIRE */}
                    <button 
                      onClick={() => setActiveOverlay('hire')} 
                      className="w-full mt-4 py-5 bg-indigo-600 text-white font-black rounded-3xl active:scale-95 border border-indigo-400 shadow-[0_10px_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-3"
                    >
                      <Smartphone size={24} /> Natango Hire (Onboarding)
                    </button>
                  </>
                )}
                <button onClick={() => { localStorage.removeItem('natangoUser'); window.location.href = '/'; }} className="w-full mt-4 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 font-black rounded-3xl active:scale-95 border border-red-100 dark:border-red-900/30">Se déconnecter</button>
              </div>
             </div>
          )}

          {/* CONVERSATION AREA */}
          {(isDesktop || activeView === 'conversation') && !isCallActive && (
            <div className={`flex-1 flex flex-col h-full absolute inset-0 z-20 bg-natango-pattern dark:bg-[#0b141a] ${!isDesktop ? 'animate-in slide-in-from-right-full' : ''}`}>
              <div className="h-16 bg-white/80 dark:bg-[#111b21]/80 backdrop-blur-md border-b border-gray-100 dark:border-[#202c33] flex items-center justify-between px-3 z-20 shrink-0">
                <div className="flex items-center gap-1">
                  <button onClick={() => setActiveView('chat_list')} className="p-2 text-gray-600 dark:text-[#8696a0] rounded-full md:hidden"><ArrowLeft size={24} /></button>
                  <div className={`w-10 h-10 bg-gray-100 dark:bg-[#202c33] rounded-xl flex overflow-hidden items-center justify-center ${activeChatId === 'marketing' ? 'bg-purple-100' : ''}`}>{activeChatId === 'marketing' ? <BarChart size={20} className="text-purple-500" /> : <img src="/logo.png" className={`w-full h-full object-contain ${activeChatId === 'rh' ? 'grayscale' : ''}`} alt="av" />}</div>
                  <div className="flex flex-col ml-2"><span className="font-bold text-[15px] dark:text-[#e9edef]">{chats[activeChatId]?.name}</span><span className="text-[11px] text-green-500 dark:text-[#00a884] font-bold uppercase">Live Sync</span></div>
                </div>
                <div className="flex items-center gap-1">
                  {(currentUser.role === 'DG' || currentUser.role === 'Superviseur') && activeChatId !== 'marketing' && (
                    <button onClick={() => setActiveOverlay('dashboard')} className="text-gray-500 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95"><Map size={22} className={activeOverlay === 'dashboard' ? 'text-[#0056FF]' : ''} /></button>
                  )}
                  <button onClick={startMeetingLive} className="text-[#0056FF] dark:text-[#00a884] p-2 rounded-full active:scale-90 bg-blue-50 dark:bg-white/5"><Phone size={22} className="fill-current" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
                {chats[activeChatId]?.messages.map((msg) => {
                  switch (msg.type) {
                    case 'system': return <div key={msg.id} className="flex justify-center my-3"><span className="text-[10px] font-bold uppercase tracking-widest bg-gray-100 dark:bg-[#111b21] text-gray-400 px-4 py-1.5 rounded-full">{msg.content}</span></div>;
                    case 'action': return (
                      <div key={msg.id} className="flex justify-start"><div className="bg-white dark:bg-[#202c33] w-[90%] rounded-3xl rounded-tl-sm px-4 py-4 shadow-md border border-gray-200 dark:border-transparent animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-3 text-[#0056FF] font-bold text-sm"><MapPin size={18} className="animate-bounce" /> {msg.content.includes('ORDRE') ? 'Déploiement Stratégique' : 'Mission Tactique'}</div>
                        <p className="text-[15px] leading-relaxed mb-4 font-medium dark:text-[#e9edef] whitespace-pre-wrap">{msg.content}</p>
                        {resolvedTasks.includes(msg.taskId) ? (
                          <div className="bg-green-100 dark:bg-green-900/20 text-green-700 py-3 rounded-2xl text-sm font-bold flex justify-center items-center gap-2"><CheckCircle2 size={18} /> Mission accomplie</div>
                        ) : (
                          <button onClick={() => {
                            setCurrentTaskId(msg.taskId);
                            // ON PASSE LA VRAIE TÂCHE AVEC LA PHOTO (msg.fullTask) !
                            setCurrentTaskData(msg.fullTask || { id: msg.taskId, type: 'Alerte', urgency: 'High', description: msg.content });
                            setActiveOverlay('mission');
                          }} className="w-full bg-[#0056FF] dark:bg-[#00a884] text-white font-bold py-3 rounded-2xl active:scale-95 flex items-center justify-center gap-2">Accepter et Revoir <ChevronRight size={18} /></button>
                        )}
                        <span className="text-[10px] text-gray-500 float-right mt-1.5">{msg.time}</span>
                      </div></div>
                    );
                    case 'action_rh': return (
                      <div key={msg.id} className="flex justify-start"><div className="bg-white dark:bg-[#202c33] w-[85%] rounded-3xl rounded-tl-sm px-4 py-4 shadow-md border border-gray-100 dark:border-transparent">
                        <p className="text-[15px] leading-relaxed mb-4 font-medium dark:text-[#e9edef]">{msg.content}</p>
                        <button onClick={handleOpenCheckin} className="w-full flex items-center justify-center gap-3 bg-[#0056FF] dark:bg-[#00a884] text-white font-bold py-3.5 rounded-2xl active:scale-95 shadow-xl"><Camera size={20} /> Scanner mon visage</button>
                        <span className="text-[10px] text-gray-500 float-right mt-1.5">{msg.time}</span>
                      </div></div>
                    );
                    case 'action_hire': return (
                      <div key={msg.id} className="flex justify-start"><div className="bg-white dark:bg-[#202c33] w-[85%] rounded-3xl rounded-tl-sm px-4 py-4 shadow-md border border-gray-200 dark:border-transparent animate-in slide-in-from-left">
                        <div className="flex items-center gap-3 mb-3 text-indigo-500 font-bold text-sm"><Smartphone size={18} /> Outil de Scellage</div>
                        <p className="text-[15px] leading-relaxed mb-4 font-medium dark:text-[#e9edef] whitespace-pre-wrap">{msg.content}</p>
                        <button onClick={() => setActiveOverlay('hire')} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">Ouvrir Natango Hire <ChevronRight size={18} /></button>
                        <span className="text-[10px] text-gray-500 float-right mt-1.5">{msg.time}</span>
                      </div></div>
                    );
                    case 'text_in': return (<div key={msg.id} className="flex justify-end"><div className="bg-[#DCEBFF] dark:bg-[#005c4b] max-w-[85%] rounded-3xl rounded-tr-sm px-4 py-3 shadow-sm"><p className="text-[14px] font-medium dark:text-[#e9edef] pr-6">{msg.content}</p><div className="flex items-center gap-1 float-right mt-1 ml-2"><span className="text-[10px] text-gray-500">{msg.time}</span><CheckCircle2 size={12} className="text-[#0056FF] dark:text-[#53bdeb]" /></div></div></div>);
                    case 'text_out': return (<div key={msg.id} className="flex justify-start"><div className="bg-white dark:bg-[#202c33] max-w-[85%] rounded-3xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-transparent"><p className="text-[14px] font-medium dark:text-[#e9edef] whitespace-pre-wrap">{msg.content}</p><span className="text-[10px] text-gray-500 float-right mt-1">{msg.time}</span></div></div>);
                    case 'zone_assign': return (
                      <div key={msg.id} className="flex justify-start">
                        <div className="bg-white dark:bg-[#202c33] w-[90%] rounded-3xl rounded-tl-sm px-4 py-4 shadow-md border border-blue-100 dark:border-transparent animate-in zoom-in-95">
                          <div className="flex items-center gap-3 mb-3 text-[#0056FF] font-bold text-sm">
                            <MapPin size={18} className="animate-bounce" /> Déploiement Tactique
                          </div>
                          <p className="text-[15px] leading-relaxed mb-4 font-medium dark:text-[#e9edef] whitespace-pre-wrap">
                            {msg.content}
                          </p>
                          {msg.confirmed ? (
                            <div className="bg-green-100 dark:bg-green-900/20 text-green-700 py-3 rounded-2xl text-sm font-bold flex justify-center items-center gap-2">
                              <CheckCircle2 size={18} /> Position confirmée
                            </div>
                          ) : (
                            <button
                              onClick={() => validerArriveeSurZone(msg.zoneName)}
                              className="w-full bg-black dark:bg-white text-white dark:text-black font-black py-3.5 rounded-2xl active:scale-95 shadow-lg flex items-center justify-center gap-2"
                            >
                              <MapPin size={20} /> J'y suis (Confirmer ma position)
                            </button>
                          )}
                          <span className="text-[10px] text-gray-500 float-right mt-1.5">{msg.time}</span>
                        </div>
                      </div>
                    );
                    case 'widget_finance':
                    case 'widget_dashboard':
                    case 'file_export':
                    case 'health_report':
                        return <ChatWidgets key={msg.id} msg={msg} />;
                    default: return null;
                  }
                })}
                {isAiTyping && (<div className="flex justify-start"><div className="bg-white dark:bg-[#202c33] rounded-2xl px-5 py-4 border border-gray-100 dark:border-transparent flex gap-1.5"><div className="w-2 h-2 bg-blue-500 dark:bg-[#00a884] rounded-full animate-bounce"></div><div className="w-2 h-2 bg-blue-500 dark:bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div><div className="w-2 h-2 bg-blue-500 dark:bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div></div></div>)}
                <div ref={messagesEndRef} />
              </div>

              <div className="bg-white dark:bg-[#111b21] px-3 py-3 flex flex-col gap-2 shrink-0 border-t border-gray-100 dark:border-[#202c33] pb-safe">
                {currentUser.role === 'Agent' && activeChatId === 'terrain' && (
                  <button onClick={reportAgentIssue} className="self-start text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-full flex items-center gap-1 active:scale-95"><HelpCircle size={14} /> Signaler un problème</button>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1 bg-gray-100 dark:bg-[#202c33] rounded-[28px] flex items-center px-4 py-2 min-h-[48px]"><button className="text-gray-500 p-1.5"><Paperclip size={22} /></button><input type="text" placeholder="Message Natango..." className="flex-1 bg-transparent px-3 text-[15px] font-medium outline-none dark:text-[#e9edef] placeholder:text-gray-400" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} /></div>
                  {inputText.trim() ? (<button onClick={() => handleSendMessage()} className="w-12 h-12 rounded-full bg-[#0056FF] dark:bg-[#00a884] flex items-center justify-center text-white dark:text-[#111b21] shrink-0 shadow-lg active:scale-90"><Send size={22} className="ml-1" /></button>)
                    : (<button onClick={isRecording ? stopRecording : startRecording} className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg transition-all active:scale-90 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#0056FF] dark:bg-[#00a884]'}`}>{isRecording ? <StopCircle size={24} fill="currentColor" /> : <Mic size={24} />}</button>)}
                </div>
              </div>
            </div>
          )}

          {/* ÉCRAN D'APPEL NATANGO LIVE (S'affiche quand isCallActive est true) */}
          {isCallActive && (
            <div className="absolute inset-0 z-[200] bg-[#0b141a] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
              
              {/* Animation radar de l'IA (Pulse) */}
              <div className="relative flex items-center justify-center mb-12">
                <div className={`absolute w-40 h-40 rounded-full ${isAiTyping ? 'bg-[#0056FF]/50 animate-ping' : 'bg-[#00a884]/20 animate-pulse'}`}></div>
                <div className={`absolute w-24 h-24 rounded-full ${isAiTyping ? 'bg-[#0056FF]/80 animate-ping' : 'bg-[#00a884]/40 animate-pulse'}`} style={{ animationDelay: '0.2s' }}></div>
                <div className="relative z-10 w-24 h-24 bg-gray-900 rounded-full border-4 border-gray-800 flex items-center justify-center shadow-2xl">
                   <img src="/logo.png" alt="Natango" className={`w-16 h-16 object-contain ${isAiTyping ? '' : 'grayscale'}`} />
                </div>
              </div>

              <h2 className="text-white text-2xl font-black mb-2">
                {isAiTyping ? 'Natango parle...' : 'Natango écoute en arrière-plan...'}
              </h2>
              <p className="text-gray-400 text-sm font-medium mb-16">
                Dites "Natango" ou "Système" pour interagir
              </p>

              {/* BOUTON RACCROCHER */}
              <button 
                onClick={stopMeetingLive} 
                className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl active:scale-90 border-4 border-[#0b141a] hover:bg-red-500 transition-colors"
              >
                <PhoneOff size={32} />
              </button>
            </div>
          )}

          {/* INJECTION GLOBALE DES MODALES D'AFFICHAGE */}
          <Overlays 
            apiBaseUrl={API_BASE_URL}
            activeOverlay={activeOverlay} setActiveOverlay={setActiveOverlay} currentUser={currentUser}
            activeChatId={activeChatId}
            isDeclining={isDeclining} setIsDeclining={setIsDeclining} declineReason={declineReason} setDeclineReason={setDeclineReason} currentIncidentId={currentIncidentId}
            attendanceStatus={attendanceStatus} setAttendanceStatus={setAttendanceStatus} attendanceReason={attendanceReason} setAttendanceReason={setAttendanceReason} setToastMessage={showToast}
            dashboardTab={dashboardTab} setDashboardTab={setDashboardTab} liveData={liveData} openAgentDetails={openAgentDetails}
            selectedAgentStats={selectedAgentStats} currentTaskData={currentTaskData} setCurrentTaskId={setCurrentTaskId}
            checkinPhoto={checkinPhoto} setCheckinPhoto={setCheckinPhoto} videoRef={videoRef} canvasRef={canvasRef} isCameraActive={isCameraActive} takePhoto={takePhoto} startCamera={startCamera} validateCheckIn={validateCheckIn} validateTask={validateTask}
            coords={coords} calculateDistance={calculateDistance} calculateBearing={calculateBearing} getMapCoordinates={getMapCoordinates}
            selectedCall={selectedCall} setSelectedCall={setSelectedCall}
            handleQRScan={handleQRScan}
          />

          {/* 📱 PORTAIL NATANGO HIRE (SCELLAGE TERRAIN) */}
          {activeOverlay === 'hire' && (
            <NatangoHire apiBaseUrl={API_BASE_URL} onClose={() => setActiveOverlay(null)} />
          )}
  
          {/* MOBILE NAV */}
          {!isCallActive && (
            <div className="h-18 bg-white dark:bg-[#111b21] border-t border-gray-100 dark:border-white/5 flex items-center justify-around px-3 z-30 shrink-0 pb-safe md:hidden">
              <button onClick={() => setActiveView('chat_list')} className={`flex flex-col items-center gap-1.5 ${activeView === 'chat_list' || activeView === 'conversation' ? 'text-[#0056FF] dark:text-[#00a884] scale-110' : 'text-gray-400 opacity-60'}`}><MessageCircle size={26} className={activeView === 'chat_list' || activeView === 'conversation' ? "fill-current" : ""} /><span className="text-[10px] font-black uppercase">Capteurs</span></button>
              {(currentUser.role === 'DG' || currentUser.role === 'Superviseur') && (<button onClick={() => setActiveOverlay('dashboard')} className={`flex flex-col items-center gap-1.5 ${activeOverlay === 'dashboard' ? 'text-[#0056FF] dark:text-[#00a884] scale-110' : 'text-gray-400 opacity-60'}`}><LayoutDashboard size={26} className={activeOverlay === 'dashboard' ? "fill-current" : ""} /><span className="text-[10px] font-black uppercase">Live</span></button>)}
              <button onClick={() => setActiveView('profile')} className={`flex flex-col items-center gap-1.5 ${activeView === 'profile' ? 'text-[#0056FF] dark:text-[#00a884] scale-110' : 'text-gray-400 opacity-60'}`}><User size={26} className={activeView === 'profile' ? "fill-current" : ""} /><span className="text-[10px] font-black uppercase">Profil</span></button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}