import React, { useState, useRef, useEffect } from 'react';
import { 
  Loader2, CheckCircle2, MoreVertical, Paperclip, Mic, 
  MessageCircle, Phone, LayoutDashboard, User, BarChart2, 
  X, Users, Clock, ChevronRight, Search, ArrowLeft,
  Play, Pause, FileText, Download, PhoneOff, Volume2, Camera, Send, Target, Award, Moon, Sun,
  PhoneIncoming, PhoneOutgoing, AlignLeft, CheckSquare, FileAudio, MapPin, Navigation, Map, Zap, Activity, StopCircle, BarChart,
  AlertTriangle, RotateCcw, CircleDot, Shield, CameraIcon, Smartphone, HelpCircle
} from 'lucide-react';

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
      <button onClick={togglePlay} disabled={!base64}
        className={`w-9 h-9 flex-shrink-0 bg-[#0056FF] dark:bg-[#00a884] text-white dark:text-[#111b21] rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${!base64 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
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

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [step, setStep] = useState(0); 
  const [formData, setFormData] = useState({ phone: '', name: '', role: 'DG', photo: null });
  const [agentXP, setAgentXP] = useState(1200);
  const [activeView, setActiveView] = useState('chat_list'); 
  const [activeChatId, setActiveChatId] = useState('');
  const [activeOverlay, setActiveOverlay] = useState(null); 
  const [dashboardTab, setDashboardTab] = useState('operations');
  const [selectedCall, setSelectedCall] = useState(null); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false); 
  const [isRecording, setIsRecording] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  
  const [meetingTranscript, setMeetingTranscript] = useState("");
  const meetingTranscriptRef = useRef(""); 
  const [isSessionActive, setIsSessionActive] = useState(false);
  const sessionTimeoutRef = useRef(null);

  const [callStartTime, setCallStartTime] = useState(null);
  const [liveData, setLiveData] = useState({ time: "19:30:00", fillRate: 0, incidents: 0, zones: [] });
  const [checkinPhoto, setCheckinPhoto] = useState(null);
  const [locationStr, setLocationStr] = useState("Position GPS requise");
  const [coords, setCoords] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [currentTaskData, setCurrentTaskData] = useState(null); 
  const [resolvedTasks, setResolvedTasks] = useState([]); 

  const [publicStep, setPublicStep] = useState(1);
  const [publicZone, setPublicZone] = useState('Sud');
  const [citizenData, setCitizenData] = useState({ name: '', phone: '', type: 'Débordement de bac' });

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const meetingRecorderRef = useRef(null);
  const meetingStreamRef = useRef(null);
  const meetingIntervalRef = useRef(null);
  const isSendingChunkRef = useRef(false);
  const knownTasksRef = useRef(new Set());

  const [chats, setChats] = useState({});
  const [callHistoryList, setCallHistoryList] = useState([]);

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
    }
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === 'Public') {
      setCitizenData(prev => ({ ...prev, name: currentUser.name, phone: currentUser.phone }));
    }
  }, [currentUser]);

  // --- EVENTS & POLLING ---
  useEffect(() => {
    let intervalEvents; let intervalTasks; let intervalDg;
    
    if (currentUser && currentUser.role !== 'Public') {
      intervalEvents = setInterval(async () => {
        try {
          const res = await fetch(`https://natango-api.onrender.com/api/events/${currentUser.role}/${currentUser.phone}`);
          const data = await res.json();
          if (data.success && data.events.length > 0) {
            setChats(prev => {
              const newChats = { ...prev };
              data.events.forEach(e => {
                if (newChats[e.chatId]) newChats[e.chatId].messages.push(e.messageObj);
              });
              return newChats;
            });
            showToast("🔔 Notification Natango reçue !");
          }
        } catch(e) {}
      }, 3000);
      
      if (currentUser.role === 'Agent') {
        intervalTasks = setInterval(async () => {
          try {
            const res = await fetch(`https://natango-api.onrender.com/api/tasks/${currentUser.phone}`);
            const data = await res.json();
            if (data.success && data.task && !knownTasksRef.current.has(data.task.id)) {
              knownTasksRef.current.add(data.task.id);
              setCurrentTaskData(data.task); 
              setChats(prev => ({
                ...prev, 'terrain': { ...prev['terrain'], messages: [...prev['terrain'].messages, {
                  id: data.task.id, type: 'action', taskId: data.task.id,
                  content: `URGENCE ${data.task.urgency} : ${data.task.type} signalé par Citoyen (${data.task.citizenName} - ${data.task.citizenPhone}). Zone ${data.task.zone}. Intervention immédiate requise.`,
                  time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                }]}
              }));
              showToast("🚨 Nouvelle mission assignée !");
            }
          } catch(e) {}
        }, 4000);
      }
      
      if (currentUser.role === 'DG') {
        intervalDg = setInterval(async () => {
          try { const res = await fetch('https://natango-api.onrender.com/api/dashboard-live'); const data = await res.json(); if (data.success) setLiveData(data.data); } catch (e) {}
        }, 5000); 
      }
    }
    return () => { clearInterval(intervalEvents); clearInterval(intervalTasks); clearInterval(intervalDg); };
  }, [currentUser]);

  useEffect(() => {
    if (['checkin', 'public_report', 'proof_photo'].includes(activeOverlay)) { 
      if (!checkinPhoto) startCamera(); 
    } else { stopCamera(); setPublicStep(1); }
    return () => stopCamera();
  }, [activeOverlay, checkinPhoto]);

  const showToast = (message) => { setToastMessage(message); setTimeout(() => setToastMessage(null), 3500); };

  const startCamera = async () => {
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); if (videoRef.current) { videoRef.current.srcObject = stream; setIsCameraActive(true); } }
    catch (err) { showToast("Veuillez autoriser la caméra."); }
  };
  const stopCamera = () => { if (videoRef.current && videoRef.current.srcObject) { videoRef.current.srcObject.getTracks().forEach(track => track.stop()); setIsCameraActive(false); } };
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d'); canvasRef.current.width = videoRef.current.videoWidth; canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height); 
      setCheckinPhoto(canvasRef.current.toDataURL('image/jpeg')); stopCamera();
      if (activeOverlay === 'public_report') setPublicStep(2);
    }
  };

  const getLocationPublic = () => {
    if (navigator.geolocation) { 
      navigator.geolocation.getCurrentPosition(
        (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationStr(`✓ Position capturée`); setPublicStep(3); }, 
        () => { setLocationStr("Erreur GPS (Mode Manuel)"); setPublicStep(3); }
      ); 
    } else {
      setLocationStr("GPS non supporté"); setPublicStep(3);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStr(`Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`);
      }, () => setLocationStr("Dakar (GPS approximatif)"));
    }
  };

  // Fonction mission dynamique selon le nom de l'agent
  const getDynamicMission = (name) => {
    const n = name.toLowerCase();
    if (n.includes('mouhamed') || n.includes('sow')) return "Évacuation prioritaire Zone Sud";
    if (n.includes('hamidou') || n.includes('ndiaye')) return "Supervision Propreté Zone Est";
    return "Surveillance Logistique";
  };

  const generateInitialChats = (role, name) => {
    if (role === 'DG') return {
      'hub': { name: 'Natango Hub', sub: 'Assistant Stratégique', color: 'bg-blue-500', messages: [{ id: 1, type: 'system', content: 'Mode Stratégique activé.' }] },
      'terrain': { name: 'Natango Terrain', sub: 'Opérations Live', color: 'bg-green-500', messages: [{ id: 1, type: 'system', content: 'Prêt pour le dispatch.' }] },
      'marketing': { name: 'Natango Marketing', sub: 'Rapports & Data', color: 'bg-purple-500', messages: [{ id: 1, type: 'system', content: 'Prêt pour l\'analyse.' }] },
      'rh': { name: 'Natango RH', sub: 'Monitoring Effectifs', color: 'bg-orange-500', messages: [{ id: 1, type: 'system', content: 'Monitoring RH connecté.' }] }
    };
    if (role === 'Agent') return {
      'terrain': { name: 'Natango Terrain', sub: 'Missions Live', color: 'bg-green-500', messages: [
        { id: 1, type: 'system', content: 'Connecté au Dispatch IA.' },
        { id: 2, type: 'action', content: `Ordre de mission initial : ${getDynamicMission(name)}. Direction Zone de saturation.`, time: '19:30', taskId: 'init_1' }
      ]},
      'rh': { name: 'Natango RH', sub: 'Check-in', color: 'bg-orange-500', messages: [{ id: 1, type: 'action_rh', content: 'Effectuez votre check-in (Photo) pour prendre votre service.', time: '19:30' }] }
    };
    return {};
  };

  const getHistoryForApi = (chatId) => {
    if (!chats[chatId]) return [];
    return chats[chatId].messages.map(msg => {
        if (['text_in', 'voice_in'].includes(msg.type)) return { role: 'user', content: msg.content || "" };
        if (['text_out', 'voice_out'].includes(msg.type)) return { role: 'assistant', content: msg.content || "" };
        if (msg.type === 'doc' && msg.content) return { role: 'system', content: `[Fichier: ${msg.filename}]\nContenu: ${msg.content}` };
        return null;
    }).filter(Boolean);
  };

  const activateSession = () => {
    setIsSessionActive(true);
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    sessionTimeoutRef.current = setTimeout(() => {
      setIsSessionActive(false);
      showToast("Mode écoute continue désactivé.");
    }, 180000); 
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isAiTyping) return;
    const userMessage = inputText; const cid = activeChatId;
    setChats(prev => ({ ...prev, [cid]: { ...prev[cid], messages: [...prev[cid].messages, { id: Date.now(), type: 'text_in', content: userMessage, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }] } }));
    setInputText(''); setIsAiTyping(true);
    try {
      const response = await fetch('https://natango-api.onrender.com/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.phone, userName: currentUser.name, role: currentUser.role, targetAi: cid, message: userMessage, history: getHistoryForApi(cid) }) });
      const data = await response.json();
      if (data.success) setChats(prev => ({ ...prev, [cid]: { ...prev[cid], messages: [...prev[cid].messages, data.reply] } }));
    } catch (error) { showToast("Erreur Serveur IA."); } finally { setIsAiTyping(false); }
  };

  const CHUNK_INTERVAL = 8000;

  const startMeetingRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      meetingStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      meetingTranscriptRef.current = ""; 

      const startNewRecorder = () => {
        if (!meetingStreamRef.current) return;
        const recorder = new MediaRecorder(meetingStreamRef.current, { mimeType });
        meetingRecorderRef.current = recorder;
        let chunks = [];
        recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };
        recorder.onstop = () => { const blob = new Blob(chunks, { type: mimeType }); if (blob.size > 2000) sendMeetingChunk(blob, mimeType); };
        recorder.start(); setIsRecording(true);
      };

      startNewRecorder();
      meetingIntervalRef.current = setInterval(() => {
        if (meetingRecorderRef.current && meetingRecorderRef.current.state !== 'inactive') {
          meetingRecorderRef.current.stop(); startNewRecorder();
        }
      }, CHUNK_INTERVAL);
    } catch (err) { setIsCallActive(false); }
  };

  const sendMeetingChunk = async (blob, mimeType) => {
    if (isSendingChunkRef.current) return;
    isSendingChunkRef.current = true;
    const target = currentUser.role === 'DG' ? 'hub' : 'terrain';
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    const fd = new FormData();
    fd.append('audio', blob, `meeting_chunk.${ext}`); fd.append('role', currentUser.role); fd.append('userName', currentUser.name); fd.append('targetAi', target); fd.append('history', JSON.stringify(getHistoryForApi(target))); fd.append('meetingContext', meetingTranscriptRef.current); fd.append('isSessionActive', isSessionActive);

    try {
      const response = await fetch('https://natango-api.onrender.com/api/meeting-chunk', { method: 'POST', body: fd });
      const data = await response.json();
      if (data.success && data.transcription) {
        meetingTranscriptRef.current += " " + data.transcription; setMeetingTranscript(meetingTranscriptRef.current);
        if (data.triggered || (isSessionActive && data.reply)) {
          activateSession(); setIsAiTyping(true);
          setChats(prev => ({ ...prev, [target]: { ...prev[target], messages: [...prev[target].messages, data.reply] } }));
          if (data.reply.audioBase64) { new Audio(`data:audio/mp3;base64,${data.reply.audioBase64}`).play(); }
          setTimeout(() => setIsAiTyping(false), 1000);
        }
      }
    } catch (e) {} finally { isSendingChunkRef.current = false; }
  };

  const stopMeetingRecording = async () => {
    if (meetingIntervalRef.current) { clearInterval(meetingIntervalRef.current); meetingIntervalRef.current = null; }
    if (meetingRecorderRef.current && meetingRecorderRef.current.state !== 'inactive') meetingRecorderRef.current.stop();
    if (meetingStreamRef.current) { meetingStreamRef.current.getTracks().forEach(t => t.stop()); meetingStreamRef.current = null; }
    setIsRecording(false); setIsSessionActive(false);

    if (meetingTranscriptRef.current.trim().length > 10) {
      showToast("Génération du rapport...");
      try {
        const target = currentUser.role === 'DG' ? 'hub' : 'terrain';
        const res = await fetch('https://natango-api.onrender.com/api/summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: meetingTranscriptRef.current }) });
        const data = await res.json();
        if (data.success) {
          const durationMin = Math.max(1, Math.round((Date.now() - (callStartTime || Date.now())) / 60000));
          const structuredActions = (data.data.actions || []).map(a => {
            if (typeof a === 'string') {
              const l = a.toLowerCase(); let status = 'pending';
              if (l.includes('validé') || l.includes('acté')) status = 'done'; else if (l.includes('reporté')) status = 'deferred'; else if (l.includes('urgence')) status = 'urgent';
              return { text: a, status };
            }
            return a;
          });
          setCallHistoryList(prev => [{ id: Date.now(), title: data.data.title || "Rapport Intervention", date: "À l'instant", type: "outgoing", duration: `${durationMin} min`, decisions: structuredActions.length, summary: data.data.summary, notes: data.data.notes || [], actions: structuredActions }, ...prev]);
          
          setChats(prev => ({
            ...prev,
            [target]: {
              ...prev[target],
              messages: [
                ...prev[target].messages,
                {
                  id: Date.now() + 1,
                  type: 'doc',
                  filename: `Transcript_Reunion_${new Date().toLocaleTimeString().replace(/:/g,'')}.txt`,
                  size: Math.max(1, Math.round(meetingTranscriptRef.current.length / 1024)) + ' KB',
                  desc: 'Transcription complète pour mémoire IA',
                  content: meetingTranscriptRef.current, 
                  time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                }
              ]
            }
          }));
          showToast("Rapport sauvegardé !");
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (isCallActive) { setMeetingTranscript(""); meetingTranscriptRef.current = ""; setCallStartTime(Date.now()); startMeetingRecording(); }
    else { stopMeetingRecording(); setCallStartTime(null); }
  }, [isCallActive]);

  const startRecordingPTT = async (e) => {
    if(e) e.preventDefault(); if (isRecording || isAiTyping || isCallActive) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType }); audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (ev) => { if (ev.data.size > 0) audioChunksRef.current.push(ev.data); };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType }); stream.getTracks().forEach(track => track.stop());
        if (audioBlob.size > 2000) await handleVoiceSubmit(audioBlob, mimeType); else showToast("Message trop court.");
      };
      mediaRecorderRef.current.start(); setIsRecording(true);
    } catch (err) {}
  };
  const stopRecordingPTT = (e) => { if(e) e.preventDefault(); if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const blobToBase64 = (blob) => new Promise((resolve) => {
    const reader = new FileReader(); reader.onloadend = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(blob);
  });

  const handleVoiceSubmit = async (audioBlob, mimeType) => {
    const tempId = Date.now(); const cid = activeChatId;
    const userAudioBase64 = await blobToBase64(audioBlob);
    setChats(prev => ({ ...prev, [cid]: { ...prev[cid], messages: [...prev[cid].messages, { id: tempId, type: 'voice_in', audioBase64: userAudioBase64, audioMime: mimeType, duration: '...', content: "", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }] } }));
    setIsAiTyping(true);
    const fd = new FormData(); fd.append('audio', audioBlob, `voice.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`);
    fd.append('userId', currentUser.phone); fd.append('userName', currentUser.name); fd.append('role', currentUser.role); fd.append('targetAi', cid); fd.append('history', JSON.stringify(getHistoryForApi(cid)));
    try {
      const response = await fetch('https://natango-api.onrender.com/api/voice', { method: 'POST', body: fd }); const data = await response.json();
      if (data.success) {
        setChats(prev => { const msgs = prev[cid].messages.map(m => m.id === tempId ? { ...m, duration: '0:05' } : m); return { ...prev, [cid]: { ...prev[cid], messages: msgs } }; });
        setChats(prev => ({ ...prev, [cid]: { ...prev[cid], messages: [...prev[cid].messages, data.reply] } }));
      }
    } catch (error) {} finally { setIsAiTyping(false); }
  };

  const handlePhotoUpload = (e) => { if (e.target.files && e.target.files[0]) setFormData({...formData, photo: URL.createObjectURL(e.target.files[0])}); };

  const validateCheckIn = async () => {
    if(!checkinPhoto) { showToast("Veuillez prendre une photo."); return; }
    try {
      await fetch('https://natango-api.onrender.com/api/checkin', { method: 'POST' });
      setActiveOverlay(null); showToast("Check-in validé !");
      setChats(prev => ({ ...prev, 'rh': { ...prev['rh'], messages: [...prev['rh'].messages, { id: Date.now(), type: 'text_out', content: `Check-in enregistré à ${locationStr}. Simulation démarrée.`, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }] } }));
    }
    catch(e) { setActiveOverlay(null); showToast("Check-in validé !"); }
  };

  const validateTask = async () => {
    if(!checkinPhoto || !currentTaskId) return;
    try {
      await fetch('https://natango-api.onrender.com/api/resolve', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ taskId: currentTaskId, photo: checkinPhoto, agentName: currentUser.name }) });
      setResolvedTasks(prev => [...prev, currentTaskId]);
      setActiveOverlay(null); setCheckinPhoto(null);
      showToast("Mission accomplie ! L'IA vérifie et prévient le Superviseur.");
      setAgentXP(prev => prev + 150);
      setChats(prev => ({ ...prev, 'terrain': { ...prev['terrain'], messages: [...prev['terrain'].messages, { id: Date.now(), type: 'text_out', content: `✅ Incident résolu et transmis pour validation.`, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }] } }));
    } catch (e) { setActiveOverlay(null); }
  };

  const reportAgentIssue = async () => {
    const issue = prompt("Décrivez le problème (ex: Plus de sacs, Zone bloquée) :");
    if(!issue) return;
    try {
      await fetch('https://natango-api.onrender.com/api/agent-issue', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: currentUser.name, phone: currentUser.phone, issue }) });
      showToast("Problème envoyé. En attente d'une solution de l'IA...");
      setChats(prev => ({ ...prev, 'terrain': { ...prev['terrain'], messages: [...prev['terrain'].messages, { id: Date.now(), type: 'text_out', content: `Signalement problème : ${issue}`, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }] } }));
    } catch(e){}
  };

  const resolveDgAction = async (msgId) => {
    try {
      await fetch('https://natango-api.onrender.com/api/dg-action', { method: 'POST' });
      setChats(prev => {
        const newTerrain = [...prev['terrain'].messages];
        const idx = newTerrain.findIndex(m => m.id === msgId);
        if(idx > -1) newTerrain[idx].content = newTerrain[idx].content + "\n\n✅ VALIDÉ PAR LE DG";
        return { ...prev, 'terrain': { ...prev['terrain'], messages: newTerrain } };
      });
      showToast("Action validée et envoyée à l'agent.");
    } catch(e) {}
  };

  const sendPublicReport = async () => {
    if (!citizenData.name || !citizenData.phone) { showToast("Veuillez renseigner Nom et Numéro."); return; }
    showToast("Analyse de l'image par l'IA Natango...");
    try {
      const res = await fetch('https://natango-api.onrender.com/api/report', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
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

  // =====================================================
  // VUE : PUBLIC (CITOYEN)
  // =====================================================
  if (currentUser && currentUser.role === 'Public') {
    return (
      <div className={`h-screen w-full flex justify-center font-sans ${isDarkMode ? "bg-black text-white" : "bg-gray-50 text-gray-900"}`}>
        <div className="w-full max-w-md bg-white dark:bg-[#0b141a] flex flex-col h-full relative overflow-hidden shadow-2xl border-x border-gray-200 dark:border-black">
          <div className="pt-12 pb-6 px-6 bg-[#0056FF] text-white flex items-center gap-4 shadow-md rounded-b-[30px] z-10">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-2"><img src="/logo.png" className="w-full h-full object-contain" alt="logo"/></div>
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
              <div className="flex justify-between items-center px-6 py-5 bg-black/50 absolute top-0 w-full z-10 text-white"><h3 className="font-black text-lg flex items-center gap-2"><Target size={20}/> Étape {publicStep}/3</h3><button onClick={() => {setActiveOverlay(null); setCheckinPhoto(null);}} className="bg-white/20 rounded-full p-2"><X size={20} /></button></div>
              
              <div className="flex-1 relative bg-black flex flex-col justify-center">
                {publicStep === 1 && (<>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /><canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none"></div>
                  {isCameraActive && <button onClick={takePhoto} className="absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full border-4 border-white flex items-center justify-center active:scale-90 z-20"><div className="w-14 h-14 bg-white rounded-full"></div></button>}
                </>)}
                {publicStep === 2 && (<div className="p-8 text-center animate-in zoom-in"><MapPin size={80} className="text-[#0056FF] mx-auto mb-6 animate-pulse"/><h2 className="text-white text-2xl font-black mb-4">Où êtes-vous ?</h2><p className="text-gray-400 mb-10">Partagez votre position pour guider l'agent avec précision.</p><button onClick={getLocationPublic} className="w-full bg-[#0056FF] text-white font-bold py-4 rounded-2xl text-lg shadow-xl active:scale-95 flex justify-center gap-2"><MapPin size={24}/> Partager la position</button></div>)}
                {publicStep === 3 && (<div className="p-6 bg-white dark:bg-[#111b21] h-full rounded-t-[40px] animate-in slide-in-from-bottom-10 flex flex-col">
                  <h2 className="text-2xl font-black mb-6 dark:text-white mt-4">Derniers détails</h2>
                  <div className="space-y-5 flex-1">
                    <div><label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nom (Obligatoire)</label><input type="text" value={citizenData.name} onChange={e => setCitizenData({...citizenData, name: e.target.value})} className="w-full mt-1 bg-gray-50 dark:bg-[#202c33] dark:text-white rounded-2xl p-4 font-bold outline-none" placeholder="Ex: Jean Dupont" /></div>
                    <div><label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Numéro (Obligatoire)</label><input type="tel" value={citizenData.phone} onChange={e => setCitizenData({...citizenData, phone: e.target.value})} className="w-full mt-1 bg-gray-50 dark:bg-[#202c33] dark:text-white rounded-2xl p-4 font-bold outline-none" placeholder="Ex: 77 000 00 00" /></div>
                    <div><label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Type d'incident</label>
                      <select value={citizenData.type} onChange={e => setCitizenData({...citizenData, type: e.target.value})} className="w-full mt-1 bg-gray-50 dark:bg-[#202c33] dark:text-white rounded-2xl p-4 font-bold outline-none"><option value="Débordement de bac">Débordement de bac</option><option value="Déchets au sol">Déchets au sol</option><option value="Autre">Autre</option></select>
                    </div>
                    <div><label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Zone (Proche de)</label>
                      <select value={publicZone} onChange={e => setPublicZone(e.target.value)} className="w-full mt-1 bg-gray-50 dark:bg-[#202c33] dark:text-white rounded-2xl p-4 font-bold outline-none"><option value="Nord">Zone Nord</option><option value="Sud">Zone Sud</option><option value="Est">Zone Est</option><option value="Ouest">Zone Ouest</option></select>
                    </div>
                  </div>
                  <button onClick={sendPublicReport} className="w-full py-4 bg-[#0056FF] text-white rounded-[20px] font-black text-lg shadow-xl active:scale-95 mb-6 flex justify-center items-center gap-2"><Send size={20} /> Transmettre à l'IA</button>
                </div>)}
              </div>
            </div>
          )}
          {toastMessage && (<div className="absolute top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-bold z-[200] animate-in fade-in shadow-lg">{toastMessage}</div>)}
        </div>
      </div>
    );
  }

  // =====================================================
  // VUE : APP CLASSIQUE (DG / AGENT)
  // =====================================================
  return (
    <div className={`h-screen w-full flex justify-center font-sans transition-colors duration-300 ${isDarkMode ? "bg-black text-gray-100" : "bg-[#F7F8FA] text-gray-900"}`}>
      
      {!currentUser ? (
        <div className="w-full max-w-md bg-white dark:bg-[#0b141a] flex flex-col h-full relative overflow-hidden shadow-2xl border-x border-gray-200 dark:border-[#111b21]">
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
            {step === 0 && (
              <div className="w-full flex flex-col items-center text-center animate-in fade-in">
                <div className="w-44 h-44 mb-10 bg-white p-3 rounded-full shadow-sm border border-gray-100 dark:border-[#202c33] flex items-center justify-center overflow-hidden"><img src="/logo.png" alt="Natango" className="w-full h-full object-contain" /></div>
                <h1 className="text-3xl font-bold tracking-tight dark:text-[#e9edef] mb-4">Natango OS</h1>
                <p className="text-[15px] text-gray-500 max-w-[300px] mx-auto mb-12">Le cerveau opérationnel de vos événements.</p>
                <button onClick={() => setStep(1)} className="w-10/12 bg-[#0056FF] text-white py-4 rounded-full font-bold shadow-xl active:scale-[0.98]">Connexion</button>
              </div>
            )}
            {step === 1 && (
              <div className="w-full flex flex-col animate-in fade-in px-4">
                <h2 className="text-2xl font-bold text-center mb-10 dark:text-[#e9edef]">Vérification</h2>
                <form onSubmit={(e) => { e.preventDefault(); if (formData.phone.length > 5) { setStep(2); setTimeout(() => setStep(3), 800); } }} className="space-y-8">
                  <div className="flex gap-4 justify-center">
                    <div className="w-20 border-b-2 border-[#0056FF] pb-2"><input type="text" value="+221" disabled className="w-full bg-transparent text-center font-bold text-xl dark:text-[#e9edef]" /></div>
                    <div className="flex-1 border-b-2 border-[#0056FF] pb-2"><input type="tel" placeholder="N° Téléphone" className="w-full bg-transparent font-bold text-xl outline-none dark:text-[#e9edef]" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} autoFocus required /></div>
                  </div>
                  <div className="flex justify-center mt-12"><button type="submit" className={`px-10 py-4 rounded-full font-bold text-lg shadow-lg ${formData.phone.length > 5 ? 'bg-[#0056FF] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`} disabled={formData.phone.length <= 5}>Suivant</button></div>
                </form>
              </div>
            )}
            {step === 2 && (<div className="flex flex-col items-center space-y-4 animate-in zoom-in"><Loader2 className="h-12 w-12 text-[#0056FF] animate-spin" /><p className="text-gray-500">Recherche base...</p></div>)}
            {step === 3 && (
              <div className="w-full flex flex-col animate-in fade-in px-4">
                <h2 className="text-2xl font-bold text-center mb-8 dark:text-[#e9edef]">Profil</h2>
                {formData.role !== 'Public' && (
                  <div className="flex justify-center mb-10"><input type="file" id="photo-upload" accept="image/*" className="hidden" onChange={handlePhotoUpload} /><div onClick={() => document.getElementById('photo-upload').click()} className="w-28 h-28 rounded-full flex items-center justify-center cursor-pointer border-4 border-gray-200 dark:border-[#202c33] bg-gray-100 dark:bg-[#111b21] overflow-hidden shadow-inner">{formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <Camera size={36} className="text-gray-400" />}</div></div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); if (formData.name) { setCurrentUser(formData); setChats(generateInitialChats(formData.role, formData.name)); setActiveChatId(formData.role === 'DG' ? 'hub' : 'terrain'); } }} className="space-y-6">
                  <div className="border-b-2 border-gray-300 dark:border-[#202c33] focus-within:border-[#0056FF] dark:focus-within:border-[#00a884] pb-2"><input type="text" placeholder="Prénom et Nom" className="w-full bg-transparent font-bold text-xl outline-none dark:text-[#e9edef] placeholder:text-gray-400" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required /></div>
                  <div><p className="text-xs text-gray-500 uppercase font-bold mb-4 tracking-wider">Sélectionnez votre rôle</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div onClick={() => setFormData({...formData, role: 'DG'})} className={`p-3 rounded-2xl border-2 cursor-pointer flex flex-col items-center ${formData.role === 'DG' ? 'border-[#0056FF] dark:border-[#00a884] bg-blue-50 dark:bg-[#00a884]/10' : 'border-gray-200 dark:border-[#202c33]'}`}><LayoutDashboard size={24} className={formData.role === 'DG' ? 'text-[#0056FF] dark:text-[#00a884]' : 'text-gray-400'} /><span className={`text-[12px] font-bold mt-2 ${formData.role === 'DG' ? 'text-[#0056FF] dark:text-[#00a884]' : 'text-gray-500'}`}>Directeur</span></div>
                      <div onClick={() => setFormData({...formData, role: 'Agent'})} className={`p-3 rounded-2xl border-2 cursor-pointer flex flex-col items-center ${formData.role === 'Agent' ? 'border-[#0056FF] dark:border-[#00a884] bg-blue-50 dark:bg-[#00a884]/10' : 'border-gray-200 dark:border-[#202c33]'}`}><Target size={24} className={formData.role === 'Agent' ? 'text-[#0056FF] dark:text-[#00a884]' : 'text-gray-400'} /><span className={`text-[12px] font-bold mt-2 ${formData.role === 'Agent' ? 'text-[#0056FF] dark:text-[#00a884]' : 'text-gray-500'}`}>Agent</span></div>
                      <div onClick={() => setFormData({...formData, role: 'Public'})} className={`p-3 rounded-2xl border-2 cursor-pointer flex flex-col items-center ${formData.role === 'Public' ? 'border-red-500 bg-red-50' : 'border-gray-200 dark:border-[#202c33]'}`}><Users size={24} className={formData.role === 'Public' ? 'text-red-500' : 'text-gray-400'} /><span className={`text-[12px] font-bold mt-2 ${formData.role === 'Public' ? 'text-red-500' : 'text-gray-500'}`}>Public</span></div>
                    </div>
                  </div>
                  <div className="flex justify-center pt-6"><button type="submit" className={`px-10 py-4 rounded-full font-bold w-full text-lg shadow-xl ${formData.name.length > 2 ? 'bg-[#0056FF] dark:bg-[#00a884] text-white dark:text-[#111b21]' : 'bg-gray-200 text-gray-400'}`} disabled={formData.name.length <= 2}>Activer Natango</button></div>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`w-full h-full bg-white dark:bg-[#0b141a] flex flex-col relative overflow-hidden border-x border-gray-200 dark:border-black shadow-2xl transition-all duration-500 ease-in-out ${activeOverlay === 'dashboard' ? 'max-w-6xl' : 'max-w-md'}`}>
          {toastMessage && (<div className="absolute top-12 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-[#202c33] text-white px-5 py-2.5 rounded-full text-[13px] font-medium z-[200] animate-in fade-in shadow-lg flex items-center gap-2"><CheckCircle2 size={16} className="text-green-400 dark:text-[#00a884]" /> {toastMessage}</div>)}

          <div className="flex-1 overflow-hidden flex flex-col relative">

            {/* CHAT LIST */}
            {activeView === 'chat_list' && !isCallActive && (
              <div className="flex-1 flex flex-col animate-in fade-in h-full absolute inset-0 bg-white dark:bg-[#0b141a] z-10">
                <div className="pt-12 pb-4 px-5 shrink-0"><h1 className="text-3xl font-extrabold dark:text-[#e9edef] mb-5">Capteurs Natango</h1><div className="bg-gray-100 dark:bg-[#202c33] flex items-center px-4 py-2.5 rounded-2xl"><Search size={18} className="text-gray-400 mr-3" /><input type="text" placeholder="Rechercher" className="bg-transparent flex-1 outline-none text-[15px] dark:text-[#e9edef]" /></div></div>
                <div className="flex-1 overflow-y-auto pb-4">
                  {Object.entries(chats).map(([id, chat]) => (
                    <div key={id} onClick={() => { setActiveChatId(id); setActiveView('conversation'); }} className="flex items-center px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#111b21] cursor-pointer">
                      <div className={`w-14 h-14 bg-gray-100 dark:bg-[#111b21] rounded-2xl border border-gray-100 dark:border-[#202c33] p-2 flex shrink-0 ${id === 'marketing' ? 'border-purple-200 bg-purple-50' : ''}`}>
                        {id === 'marketing' ? <BarChart size={28} className="text-purple-500 m-auto"/> : <img src="/logo.png" className={`w-full h-full object-contain ${id !== 'hub' && id !== 'terrain' ? 'grayscale opacity-70' : ''}`} alt="av" />}
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

            {/* CALLS */}
            {activeView === 'call_history' && !isCallActive && (
              <div className="flex-1 flex flex-col animate-in fade-in h-full absolute inset-0 bg-white dark:bg-[#0b141a] z-10">
                <div className="pt-12 pb-4 px-5 shrink-0"><h1 className="text-3xl font-extrabold dark:text-[#e9edef] mb-5">Intelligence Meeting</h1><div className="bg-gray-100 dark:bg-[#202c33] flex items-center px-4 py-2.5 rounded-2xl"><Search size={18} className="text-gray-400 mr-3" /><input type="text" placeholder="Rechercher" className="bg-transparent flex-1 outline-none text-[15px] dark:text-[#e9edef]" /></div></div>
                <div className="flex-1 overflow-y-auto px-2 space-y-2 pb-4">
                  {callHistoryList.map((call) => {
                    const doneCount = (call.actions || []).filter(a => (typeof a === 'object' ? a.status : '') === 'done').length;
                    const total = (call.actions || []).length;
                    return (
                      <div key={call.id} className="bg-white dark:bg-[#111b21] p-5 rounded-3xl border border-gray-100 dark:border-[#202c33] shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${call.type === 'incoming' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>{call.type === 'incoming' ? <PhoneIncoming size={20} /> : <PhoneOutgoing size={20} />}</div>
                          <span className="text-[11px] font-bold text-gray-400 bg-gray-50 dark:bg-[#202c33] px-3 py-1 rounded-full">{call.date}</span>
                        </div>
                        <h3 className="font-bold text-[17px] dark:text-[#e9edef] mb-1">{call.title}</h3>
                        <div className="flex items-center gap-4 mb-3">
                          <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={14}/> {call.duration}</span>
                          <span className="text-xs font-bold text-green-600 dark:text-[#00a884] flex items-center gap-1"><CheckCircle2 size={14}/> {doneCount}/{total} actés</span>
                        </div>
                        {total > 0 && <div className="w-full h-1.5 bg-gray-100 dark:bg-[#202c33] rounded-full mb-4 overflow-hidden"><div className="h-full bg-green-500 dark:bg-[#00a884] rounded-full" style={{width: `${(doneCount/total)*100}%`}}></div></div>}
                        <button onClick={() => setSelectedCall(call)} className="w-full flex items-center justify-center gap-2 text-sm font-bold text-[#0056FF] dark:text-[#00a884] bg-blue-50 dark:bg-[#202c33] py-3 rounded-2xl active:scale-95"><AlignLeft size={18} /> Voir le rapport</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CONVERSATION */}
            {activeView === 'conversation' && !isCallActive && (
              <div className="flex-1 flex flex-col animate-in slide-in-from-right-full h-full absolute inset-0 z-20 bg-natango-pattern dark:bg-[#0b141a]">
                <div className="h-16 bg-white/80 dark:bg-[#111b21]/80 backdrop-blur-md border-b border-gray-100 dark:border-[#202c33] flex items-center justify-between px-3 z-20 shrink-0">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setActiveView('chat_list')} className="p-2 text-gray-600 dark:text-[#8696a0] rounded-full"><ArrowLeft size={24} /></button>
                    <div className={`w-10 h-10 bg-gray-100 dark:bg-[#202c33] rounded-xl flex overflow-hidden items-center justify-center ${activeChatId === 'marketing' ? 'bg-purple-100' : ''}`}>{activeChatId === 'marketing' ? <BarChart size={20} className="text-purple-500"/> : <img src="/logo.png" className={`w-full h-full object-contain ${activeChatId === 'rh' ? 'grayscale' : ''}`} alt="av" />}</div>
                    <div className="flex flex-col ml-2"><span className="font-bold text-[15px] dark:text-[#e9edef]">{chats[activeChatId]?.name}</span><span className="text-[11px] text-green-500 dark:text-[#00a884] font-bold uppercase">Live Sync</span></div>
                  </div>
                  <div className="flex items-center gap-1">
                    {currentUser.role === 'DG' && activeChatId !== 'marketing' && (
                      <button onClick={() => setActiveOverlay('dashboard')} className="text-gray-500 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95">
                        <Map size={22} className={activeOverlay === 'dashboard' ? 'text-[#0056FF]' : ''} />
                      </button>
                    )}
                    <button onClick={() => setIsCallActive(true)} className="text-[#0056FF] dark:text-[#00a884] p-2 rounded-full active:scale-90"><Phone size={22} className="fill-current" /></button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
                  {chats[activeChatId]?.messages.map((msg) => {
                    if (msg.type === 'dg_action') return (
                      <div key={msg.id} className="flex justify-start">
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 w-[90%] rounded-3xl p-4 shadow-sm">
                          <div className="flex items-center gap-2 text-orange-600 font-bold mb-2"><AlertTriangle size={18}/> Alerte Logistique Agent</div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap">{msg.content}</p>
                          {!msg.content.includes('VALIDÉ') && <button onClick={() => resolveDgAction(msg.id)} className="w-full bg-orange-500 text-white font-bold py-3 rounded-2xl active:scale-95 shadow-md">Valider la solution IA</button>}
                        </div>
                      </div>
                    );

                    switch (msg.type) {
                      case 'system': return <div key={msg.id} className="flex justify-center my-3"><span className="text-[10px] font-bold uppercase tracking-widest bg-gray-100 dark:bg-[#111b21] text-gray-400 px-4 py-1.5 rounded-full">{msg.content}</span></div>;
                      case 'infographic': return (
                        <div key={msg.id} className="flex justify-start w-full animate-in zoom-in-95">
                          <div className="bg-white dark:bg-[#202c33] w-full rounded-3xl p-5 shadow-xl border border-purple-100 dark:border-purple-900/30">
                            <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-gray-700 pb-3"><div className="flex items-center gap-3"><BarChart size={22} className="text-purple-500" /><h3 className="font-extrabold dark:text-white text-lg">{msg.content.title}</h3></div><Download size={18} className="text-gray-400" /></div>
                            <div className="grid grid-cols-1 gap-3 mb-5">{msg.content.metrics?.map((m, i) => (<div key={i} className="bg-purple-50/50 dark:bg-purple-900/10 p-4 rounded-2xl flex justify-between items-center"><div><p className="text-[10px] uppercase font-black text-purple-400 tracking-widest">{m.label}</p><p className="text-xl font-black dark:text-white">{m.value}</p></div><p className="text-[11px] font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-lg">{m.trend}</p></div>))}</div>
                            <div className="bg-gray-900 dark:bg-black p-4 rounded-2xl"><p className="text-[10px] font-black text-gray-400 uppercase mb-3">Composition</p><div className="flex w-full h-7 rounded-xl overflow-hidden"><div style={{width:'50%'}} className="bg-blue-500 flex items-center justify-center text-[9px] text-white font-black">50%</div><div style={{width:'30%'}} className="bg-emerald-500 flex items-center justify-center text-[9px] text-white font-black">30%</div><div style={{width:'20%'}} className="bg-orange-500 flex items-center justify-center text-[9px] text-white font-black">20%</div></div></div>
                          </div>
                        </div>
                      );
                      case 'action': return (
                        <div key={msg.id} className="flex justify-start"><div className="bg-white dark:bg-[#202c33] w-[90%] rounded-3xl rounded-tl-sm px-4 py-4 shadow-md border border-red-100 dark:border-transparent animate-in zoom-in-95">
                          <div className="flex items-center gap-3 mb-3 text-red-500 font-bold text-sm"><AlertTriangle size={18} className="animate-pulse"/> {msg.content.includes('URGENCE') ? 'Alerte Dispatch' : 'Mission Prioritaire'}</div>
                          <p className="text-[15px] leading-relaxed mb-4 font-medium dark:text-[#e9edef]">{msg.content}</p>
                          {resolvedTasks.includes(msg.taskId) ? (
                            <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 py-3 rounded-2xl text-sm font-bold flex justify-center items-center gap-2"><CheckCircle2 size={18}/> Mission accomplie</div>
                          ) : (
                            <div className="flex gap-2.5">
                              <button onClick={() => { setCurrentTaskId(msg.taskId); setActiveOverlay('proof_photo'); }} className="flex-1 bg-[#0056FF] dark:bg-[#00a884] text-white dark:text-[#111b21] text-[14px] font-bold py-3 rounded-2xl active:scale-95 shadow-lg">Terminer</button>
                              <button onClick={() => setActiveOverlay('route')} className="flex-1 border-2 border-gray-200 dark:border-[#2a3942] text-gray-700 dark:text-[#e9edef] text-[14px] font-bold py-3 rounded-2xl active:scale-95">Trajet</button>
                            </div>
                          )}
                          <span className="text-[10px] text-gray-500 float-right mt-1.5">{msg.time}</span>
                        </div></div>
                      );
                      case 'action_rh': return (
                        <div key={msg.id} className="flex justify-start"><div className="bg-white dark:bg-[#202c33] w-[85%] rounded-3xl rounded-tl-sm px-4 py-4 shadow-md border border-gray-100 dark:border-transparent">
                          <p className="text-[15px] leading-relaxed mb-4 font-medium dark:text-[#e9edef]">{msg.content}</p>
                          <button onClick={() => setActiveOverlay('checkin')} className="w-full flex items-center justify-center gap-3 bg-[#0056FF] dark:bg-[#00a884] text-white dark:text-[#111b21] text-[15px] font-bold py-3.5 rounded-2xl active:scale-95 shadow-xl"><Camera size={20}/> Scanner mon visage</button>
                          <span className="text-[10px] text-gray-500 float-right mt-1.5">{msg.time}</span>
                        </div></div>
                      );
                      case 'doc': return (
                        <div key={msg.id} className="flex justify-start"><div className="bg-white dark:bg-[#202c33] w-[85%] rounded-3xl rounded-tl-sm p-2 shadow-md border border-gray-100 dark:border-transparent">
                          <div onClick={() => showToast(`Téléchargement ${msg.filename}...`)} className="bg-gray-50 dark:bg-[#111b21] rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer"><div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-[#0056FF]"><FileText size={24} /></div><div className="flex-1 overflow-hidden"><h4 className="font-bold text-[14px] dark:text-white truncate">{msg.filename}</h4><span className="text-[11px] font-bold text-gray-400 uppercase">{msg.size}</span></div><Download size={18} className="text-gray-400" /></div>
                          <div className="px-3 py-2 flex justify-between"><p className="text-[13px] text-gray-500">{msg.desc}</p><span className="text-[10px] text-gray-500 mt-1">{msg.time}</span></div>
                        </div></div>
                      );
                      case 'voice_in': return (
                        <div key={msg.id} className="flex justify-end"><div className="bg-[#DCEBFF] dark:bg-[#005c4b] w-[80%] rounded-3xl rounded-tr-sm px-4 py-3 shadow-md">
                          <div className="flex items-center gap-2 mb-2"><Mic size={14} className="text-[#0056FF] dark:text-[#00a884]" /><span className="text-[11px] font-bold text-[#0056FF] dark:text-[#00a884] uppercase tracking-wider">Note vocale</span></div>
                          <AudioPlayer base64={msg.audioBase64} mime={msg.audioMime} bars={[10,18,6,22,14,8,16,20,12]} />
                          <div className="flex justify-between items-center mt-2"><span className="text-[10px] font-bold text-[#0056FF] dark:text-[#8696a0]">{msg.duration === '...' ? 'Envoi...' : msg.duration || '0:05'}</span><span className="text-[10px] text-gray-500">{msg.time} <CheckCircle2 size={12} className="inline text-[#0056FF] dark:text-[#53bdeb]" /></span></div>
                        </div></div>
                      );
                      case 'voice_out': return (
                        <div key={msg.id} className="flex justify-start"><div className="bg-white dark:bg-[#202c33] w-[85%] rounded-3xl rounded-tl-sm px-4 py-3 shadow-md border border-gray-100 dark:border-transparent">
                          <div className="flex items-center gap-2 mb-2"><Volume2 size={14} className="text-[#0056FF] dark:text-[#00a884]" /><span className="text-[11px] font-bold text-[#0056FF] dark:text-[#00a884] uppercase tracking-wider">Réponse vocale</span></div>
                          <AudioPlayer base64={msg.audioBase64} bars={[8,14,22,10,16,24,12,18,14,8]} />
                          <div className="flex justify-end mt-2"><span className="text-[10px] text-gray-500 dark:text-[#8696a0]">{msg.time}</span></div>
                        </div></div>
                      );
                      case 'text_in': return (<div key={msg.id} className="flex justify-end"><div className="bg-[#DCEBFF] dark:bg-[#005c4b] max-w-[85%] rounded-3xl rounded-tr-sm px-4 py-3 shadow-sm"><p className="text-[14px] font-medium dark:text-[#e9edef] pr-6">{msg.content}</p><div className="flex items-center gap-1 float-right mt-1 ml-2"><span className="text-[10px] text-gray-500">{msg.time}</span><CheckCircle2 size={12} className="text-[#0056FF] dark:text-[#53bdeb]" /></div></div></div>);
                      case 'text_out': return (<div key={msg.id} className="flex justify-start"><div className="bg-white dark:bg-[#202c33] max-w-[85%] rounded-3xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-transparent"><p className="text-[14px] font-medium dark:text-[#e9edef] whitespace-pre-wrap">{msg.content}</p><span className="text-[10px] text-gray-500 float-right mt-1">{msg.time}</span></div></div>);
                      default: return null;
                    }
                  })}
                  {isAiTyping && (<div className="flex justify-start"><div className="bg-white dark:bg-[#202c33] rounded-2xl px-5 py-4 border border-gray-100 dark:border-transparent flex gap-1.5"><div className="w-2 h-2 bg-blue-500 dark:bg-[#00a884] rounded-full animate-bounce"></div><div className="w-2 h-2 bg-blue-500 dark:bg-[#00a884] rounded-full animate-bounce" style={{animationDelay:'150ms'}}></div><div className="w-2 h-2 bg-blue-500 dark:bg-[#00a884] rounded-full animate-bounce" style={{animationDelay:'300ms'}}></div></div></div>)}
                  <div ref={messagesEndRef} />
                </div>

                <div className="bg-white dark:bg-[#111b21] px-3 py-3 flex flex-col gap-2 shrink-0 border-t border-gray-100 dark:border-[#202c33] pb-safe">
                  {currentUser.role === 'Agent' && activeChatId === 'terrain' && (
                    <button onClick={reportAgentIssue} className="self-start text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-full flex items-center gap-1 active:scale-95"><HelpCircle size={14}/> Signaler un problème</button>
                  )}
                  <div className="flex items-end gap-2">
                    <div className="flex-1 bg-gray-100 dark:bg-[#202c33] rounded-[28px] flex items-center px-4 py-2 min-h-[48px]"><button className="text-gray-500 p-1.5"><Paperclip size={22} /></button><input type="text" placeholder="Message Natango..." className="flex-1 bg-transparent px-3 text-[15px] font-medium outline-none dark:text-[#e9edef] placeholder:text-gray-400" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} /></div>
                    {inputText.trim() ? (<button onClick={handleSendMessage} className="w-12 h-12 rounded-full bg-[#0056FF] dark:bg-[#00a884] flex items-center justify-center text-white dark:text-[#111b21] shrink-0 shadow-lg active:scale-90"><Send size={22} className="ml-1" /></button>)
                    : (<button onPointerDown={startRecordingPTT} onPointerUp={stopRecordingPTT} onPointerLeave={stopRecordingPTT} className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg transition-all ${isRecording ? 'bg-red-500 scale-125' : 'bg-[#0056FF] dark:bg-[#00a884] active:scale-90'}`}>{isRecording ? <div className="w-4 h-4 bg-white rounded-sm animate-pulse"></div> : <Mic size={24} />}</button>)}
                  </div>
                </div>
              </div>
            )}

            {/* CALL MODE */}
            {isCallActive && (
              <div className="flex-1 flex flex-col animate-in zoom-in-95 h-full absolute inset-0 z-50 bg-[#0b141a]">
                <div className="pt-16 pb-4 flex flex-col items-center text-center"><div className="flex items-center gap-2 text-blue-400 mb-3 bg-blue-500/10 px-4 py-1.5 rounded-full"><Activity size={14} className="animate-pulse" /><span className="text-[10px] font-black uppercase tracking-widest">Natango Live</span></div><h2 className="text-3xl font-black text-white mb-2">Espace Hub</h2><p className="text-[#8696a0] font-bold">{isAiTyping ? "Traitement IA..." : isRecording ? <span className="text-green-500 animate-pulse">Écoute active...</span> : "Sync..."}</p></div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-full blur-2xl transition-all ${isAiTyping ? 'bg-blue-500 opacity-40' : isRecording ? 'bg-green-500 opacity-20 animate-pulse' : 'bg-[#00a884] opacity-10'}`}></div>
                    <div className={`relative w-40 h-40 bg-[#111b21] rounded-full flex items-center justify-center border-4 transition-all ${isAiTyping ? 'border-blue-500 text-blue-500 scale-110' : isRecording ? 'border-green-500 text-green-500' : 'border-gray-800 text-gray-700'}`}>
                      {isAiTyping ? <Loader2 size={50} className="animate-spin" /> : <svg width="70" height="70" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M48 24C48 15.2 40.8 8 32 8C23.2 8 16 15.2 16 24C16 26.3 16.5 28.5 17.4 30.5C18 31.8 18 33.3 17.5 34.6C16.6 36.9 16 39.4 16 42C16 50.8 23.2 58 32 58C40.8 58 48 50.8 48 42C48 39.4 47.4 36.9 46.5 34.6C46 33.3 46 31.8 46.6 30.5C47.5 28.5 48 26.3 48 24Z"/><text x="32" y="42" fontSize="28" fontWeight="black" textAnchor="middle" fill="currentColor" stroke="none">N</text></svg>}
                    </div>
                  </div>
                  <p className="mt-12 text-sm text-white/60 font-bold italic px-12">Dites <span className="text-green-400 font-black">"Assistant"</span> pour interagir.</p>
                </div>
                <div className="h-40 bg-black/40 backdrop-blur-xl rounded-t-[40px] flex items-center justify-center border-t border-white/5 pb-8"><button onClick={() => setIsCallActive(false)} className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl active:scale-90 border-4 border-black"><PhoneOff size={32} /></button></div>
              </div>
            )}

            {/* ✅ RÉINTÉGRÉ : VUE PROFIL COMPLÈTE */}
            {activeView === 'profile' && !isCallActive && (
              <div className="flex-1 flex flex-col animate-in fade-in h-full absolute inset-0 bg-white dark:bg-[#0b141a] z-10 overflow-y-auto">
                <div className="pt-12 pb-6 px-5 border-b border-gray-100 dark:border-[#202c33]">
                  <h1 className="text-3xl font-extrabold dark:text-[#e9edef] mb-6">Profil {currentUser.role}</h1>
                  <div className="flex items-center gap-5">
                    <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-[#111b21] flex items-center justify-center overflow-hidden border-4 border-gray-200 dark:border-[#202c33]">
                      {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <User size={44} className="text-gray-400" />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black dark:text-white">{formData.name}</h2>
                      <p className="text-gray-500 dark:text-[#8696a0]">{formData.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {/* Toggle Mode Sombre */}
                  <div className="bg-gray-50 dark:bg-[#111b21] rounded-3xl p-5 flex items-center justify-between border border-gray-100 dark:border-[#202c33]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-[#202c33] flex items-center justify-center text-indigo-500">{isDarkMode ? <Moon size={22} /> : <Sun size={22} />}</div>
                      <p className="text-[15px] font-bold dark:text-[#e9edef]">Mode Sombre</p>
                    </div>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-14 h-7 rounded-full p-1 ${isDarkMode ? 'bg-[#00a884]' : 'bg-gray-300'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${isDarkMode ? 'translate-x-7' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                  {/* Poste */}
                  <div className="bg-gray-50 dark:bg-[#111b21] rounded-3xl p-5 border border-gray-100 dark:border-[#202c33]">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Poste</p>
                    <p className="text-[16px] font-bold dark:text-[#e9edef]">{formData.role === 'DG' ? 'Directeur Général' : 'Agent de Terrain'}</p>
                  </div>
                  {/* Infos spécifiques Agent */}
                  {currentUser.role === 'Agent' && (
                    <>
                      <div className="bg-blue-50 dark:bg-[#111b21] border border-blue-100 dark:border-[#202c33] rounded-3xl p-5 flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-100 dark:bg-[#202c33] rounded-2xl flex items-center justify-center text-[#0056FF] dark:text-[#00a884]"><Target size={28} /></div>
                        <div>
                          <p className="text-[10px] text-[#0056FF] dark:text-[#00a884] uppercase font-black tracking-widest">Mission</p>
                          <p className="text-[15px] font-bold dark:text-[#e9edef]">{getDynamicMission(formData.name)}</p>
                        </div>
                      </div>
                      <div className="bg-orange-50 dark:bg-[#111b21] border border-orange-100 dark:border-[#202c33] rounded-3xl p-5 flex items-center gap-4">
                        <div className="w-14 h-14 bg-orange-100 dark:bg-[#202c33] rounded-2xl flex items-center justify-center text-orange-500"><Award size={28} /></div>
                        <div>
                          <p className="text-[10px] text-orange-500 uppercase font-black tracking-widest">Performance</p>
                          <p className="text-[16px] font-black dark:text-[#e9edef]">{agentXP} XP</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* DASHBOARD 3 VUES */}
            {activeOverlay === 'dashboard' && currentUser.role === 'DG' && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="w-full h-[95%] overflow-hidden bg-[#F7F8FA] dark:bg-[#0b141a] rounded-[40px] shadow-2xl flex flex-col border border-gray-200 dark:border-white/5">
                  <div className="bg-white dark:bg-[#111b21] px-6 py-5 border-b border-gray-100 dark:border-white/5 shrink-0 z-10 flex justify-between items-center">
                    <h3 className="font-black text-xl dark:text-white flex items-center gap-3"><Map size={22} className="text-[#0056FF]" /> Centre Opérationnel</h3>
                    <button onClick={() => setActiveOverlay(null)} className="bg-gray-100 dark:bg-[#202c33] rounded-full p-2"><X size={20} className="text-gray-500" /></button>
                  </div>
                  <div className="px-6 py-4 bg-white dark:bg-[#111b21] shrink-0 border-b border-gray-100 dark:border-white/5">
                    <div className="flex bg-gray-100 dark:bg-[#202c33] p-1 rounded-[20px]">
                      <button onClick={() => setDashboardTab('rh')} className={`flex-1 py-2.5 rounded-[16px] text-[13px] font-black transition-all ${dashboardTab === 'rh' ? 'bg-white dark:bg-[#111b21] shadow-sm text-[#0056FF]' : 'text-gray-500 dark:text-gray-400'}`}>RH</button>
                      <button onClick={() => setDashboardTab('operations')} className={`flex-1 py-2.5 rounded-[16px] text-[13px] font-black transition-all ${dashboardTab === 'operations' ? 'bg-white dark:bg-[#111b21] shadow-sm text-[#0056FF]' : 'text-gray-500 dark:text-gray-400'}`}>Opérations</button>
                      <button onClick={() => setDashboardTab('heatmap')} className={`flex-1 py-2.5 rounded-[16px] text-[13px] font-black transition-all ${dashboardTab === 'heatmap' ? 'bg-white dark:bg-[#111b21] shadow-sm text-[#0056FF]' : 'text-gray-500 dark:text-gray-400'}`}>Heatmap</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="relative w-full h-80 bg-gray-200 dark:bg-[#111b21] rounded-[32px] overflow-hidden border-4 border-white dark:border-[#202c33] shadow-inner mb-4">
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 0)', backgroundSize: '20px 20px' }}></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 rounded-full border-[10px] border-white/40 dark:border-white/5 flex items-center justify-center"><div className="w-24 h-16 rounded-full border-4 border-white/20 dark:border-white/5"></div></div>
                      {dashboardTab === 'rh' && (<>
                        <div className="absolute top-8 left-6 bg-white dark:bg-[#202c33] p-2 rounded-2xl shadow-lg border border-gray-100 dark:border-white/5 flex items-center gap-2"><div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><User size={16}/></div><div><p className="text-[10px] font-black text-gray-400 uppercase leading-none">Snack Nord</p><p className="text-xs font-bold dark:text-white">Moussa</p></div></div>
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white dark:bg-[#202c33] p-2 rounded-2xl shadow-lg border border-gray-100 dark:border-white/5 flex items-center gap-2"><div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><User size={16}/></div><div><p className="text-[10px] font-black text-gray-400 uppercase leading-none">Parking Est</p><p className="text-xs font-bold dark:text-white">Ibrahim</p></div></div>
                        <div className="absolute top-1/2 right-6 -translate-y-1/2 bg-white dark:bg-[#202c33] p-2 rounded-2xl shadow-lg border border-gray-100 dark:border-white/5 flex items-center gap-2"><div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><User size={16}/></div><div><p className="text-[10px] font-black text-gray-400 uppercase leading-none">Entrée Sud</p><p className="text-xs font-bold dark:text-white">Koffi</p></div></div>
                      </>)}
                      {dashboardTab === 'operations' && (<>
                        <div className="absolute top-8 left-6"><div className="relative"><MapPin size={32} className="text-red-500 relative z-10"/><div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-50"></div></div></div>
                        <div className="absolute bottom-12 left-1/3 bg-white dark:bg-[#202c33] p-1.5 rounded-2xl shadow-lg border-2 border-orange-400 flex items-center gap-2"><div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600"><User size={12}/></div><span className="text-[10px] font-bold pr-2 dark:text-white">En mission</span></div>
                        <div className="absolute top-1/2 right-12 bg-white dark:bg-[#202c33] p-1.5 rounded-2xl shadow-lg border-2 border-green-400 flex items-center gap-2"><div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600"><CheckCircle2 size={12}/></div><span className="text-[10px] font-bold pr-2 dark:text-white">Disponible</span></div>
                      </>)}
                      {dashboardTab === 'heatmap' && (<>
                        {liveData.zones.map((z, i) => { 
                          const isHigh = parseFloat(z.Densite) > 0.8; const isMed = parseFloat(z.Densite) > 0.4;
                          const pos = z.Zone === 'Nord' ? 'top-4 left-1/4' : z.Zone === 'Sud' ? 'bottom-4 left-1/2' : z.Zone === 'Est' ? 'top-1/2 right-4' : 'top-1/3 left-4'; 
                          return <div key={i} className={`absolute ${pos} w-32 h-32 -ml-16 -mt-16 rounded-full blur-2xl opacity-60 ${isHigh ? 'bg-red-500' : isMed ? 'bg-orange-500' : 'bg-green-500'}`}></div>; 
                        })}
                        <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-black/80 backdrop-blur rounded-xl p-3 border border-white/20">
                          <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-[10px] font-bold dark:text-white">Zones critiques</span></div>
                          <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span className="text-[10px] font-bold dark:text-white">Intervention</span></div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-[10px] font-bold dark:text-white">Zones propres</span></div>
                        </div>
                      </>)}
                    </div>
                    {dashboardTab === 'rh' && (
                      <div className="bg-white dark:bg-[#111b21] rounded-3xl p-5 border border-gray-100 dark:border-white/5">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Affectations du jour</h4>
                        <div className="space-y-3">
                          {['Moussa (Snack Nord)', 'Ibrahim (Parking Est)', 'Koffi (Entrée Sud)'].map((agent, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#202c33] rounded-2xl"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-[#0056FF]"><User size={18}/></div><p className="font-bold text-sm dark:text-white">{agent}</p></div><CheckCircle2 size={18} className="text-green-500"/></div>
                          ))}
                        </div>
                        <div className="mt-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-2xl text-sm font-bold flex items-center gap-2"><CheckCircle2 size={18}/> Zones couvertes - Prêts pour la journée</div>
                      </div>
                    )}
                    {dashboardTab === 'operations' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 bg-white dark:bg-[#111b21] rounded-3xl p-5 border border-gray-100 dark:border-white/5">
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Alertes actives</h4>
                          {liveData.incidents > 0 ? (
                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-start gap-3"><AlertTriangle className="text-red-500 shrink-0"/><div><p className="text-sm font-bold text-red-700 dark:text-red-400">Intervention en attente</p><p className="text-xs text-red-600/80 dark:text-red-400/80">Un signalement n'a pas encore été traité.</p></div></div>
                          ) : (
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl flex items-center gap-3"><CheckCircle2 className="text-green-500"/><p className="text-sm font-bold text-green-700 dark:text-green-400">Aucun incident critique</p></div>
                          )}
                        </div>
                        <div className="bg-white dark:bg-[#111b21] rounded-3xl p-5 border border-gray-100 dark:border-white/5"><p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">En cours</p><p className="text-2xl font-black text-[#0056FF]">{liveData.incidents}</p></div>
                        <div className="bg-white dark:bg-[#111b21] rounded-3xl p-5 border border-gray-100 dark:border-white/5"><p className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">Tps Rép.</p><p className="text-2xl font-black text-gray-800 dark:text-white">2m</p></div>
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
              </div>
            )}

            {/* CHECK-IN & PHOTO DE PREUVE */}
            {(activeOverlay === 'checkin' || activeOverlay === 'proof_photo') && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                <div className="w-full bg-white dark:bg-[#111b21] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/10">
                  <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-white/10">
                    <h3 className="font-black text-xl dark:text-white flex items-center gap-3"><Camera className="text-blue-500" /> {activeOverlay === 'checkin' ? 'FaceID Natango' : 'Preuve Nettoyage'}</h3>
                    <button onClick={() => { setActiveOverlay(null); setCheckinPhoto(null); }} className="bg-gray-100 dark:bg-white/5 rounded-full p-2"><X size={20} className="text-gray-500" /></button>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="w-full h-72 bg-black rounded-[32px] overflow-hidden relative border-2 border-white/10">
                      {!checkinPhoto ? (<><video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-80" /><canvas ref={canvasRef} className="hidden" />{isCameraActive && <button onClick={takePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300 active:scale-90"><div className="w-12 h-12 bg-[#0056FF] dark:bg-[#00a884] m-auto rounded-full"></div></button>}{!isCameraActive && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-white w-8 h-8" /></div>}</>)
                      : (<><img src={checkinPhoto} className="w-full h-full object-cover" /><div className="absolute inset-0 flex items-center justify-center bg-green-500/20"><CheckCircle2 size={80} className="text-white" /></div><button onClick={() => {setCheckinPhoto(null); startCamera();}} className="absolute top-4 right-4 bg-black/60 p-2.5 rounded-full text-white"><X size={20}/></button></>)}
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <button onClick={activeOverlay === 'checkin' ? validateCheckIn : validateTask} disabled={!checkinPhoto} className={`w-full py-4 rounded-3xl font-black text-lg shadow-2xl flex justify-center items-center gap-3 ${checkinPhoto ? 'bg-green-600 text-white active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                      <CheckCircle2 size={24}/> {activeOverlay === 'checkin' ? 'Confirmer présence' : 'Valider nettoyage'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* ROUTE AGENT TACTIQUE */}
            {activeOverlay === 'route' && currentTaskData && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="w-full bg-white dark:bg-[#111b21] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-white/5">
                  <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 dark:border-white/5">
                    <h3 className="font-black text-xl dark:text-white flex items-center gap-3"><Navigation size={22} className="text-[#0056FF]" /> Guidage Natango</h3>
                    <button onClick={() => setActiveOverlay(null)} className="bg-gray-100 dark:bg-white/5 rounded-full p-2"><X size={20} className="text-gray-500" /></button>
                  </div>
                  <div className="p-6">
                    <div className="relative w-full h-64 bg-gray-50 dark:bg-black rounded-[32px] flex items-center justify-center border-2 border-gray-100 dark:border-white/5 overflow-hidden mb-5 shadow-inner">
                      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 0), linear-gradient(90deg, #000 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
                      <svg width="100%" height="100%" viewBox="0 0 200 200" className="relative z-10">
                        <path d={`M 100 100 Q 120 80 ${100 + (currentTaskData.navigation?.targetX || 40)} ${100 + (currentTaskData.navigation?.targetY || -40)}`} fill="none" stroke="#0056FF" strokeWidth="4" strokeDasharray="8 8" className="animate-pulse" />
                        <circle cx="100" cy="100" r="8" fill="white" stroke="#0056FF" strokeWidth="3" />
                        <circle cx="100" cy="100" r="12" fill="#0056FF" fillOpacity="0.2" className="animate-ping" />
                        <g transform={`translate(${100 + (currentTaskData.navigation?.targetX || 40)}, ${100 + (currentTaskData.navigation?.targetY || -40)})`}>
                          <circle r="6" fill="#EF4444" />
                          <circle r="12" fill="#EF4444" fillOpacity="0.2" className="animate-bounce" />
                        </g>
                      </svg>
                      <div className="absolute bottom-4 right-4 bg-white dark:bg-[#202c33] px-4 py-2 rounded-2xl shadow-lg border border-gray-100 dark:border-white/5">
                        <p className="text-xs font-black text-[#0056FF]">{currentTaskData.navigation?.distance || 120}m</p>
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-white/5 p-5 rounded-3xl flex items-center gap-4">
                      <div className="w-12 h-12 bg-white dark:bg-[#202c33] rounded-2xl flex items-center justify-center shadow-sm"><MapPin size={24} className="text-[#0056FF]" /></div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Secteur d'intervention</p>
                        <p className="text-sm font-bold dark:text-white">Zone {currentTaskData.zone} • {currentTaskData.type}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 pt-0"><button onClick={() => setActiveOverlay(null)} className="w-full py-4 bg-[#0056FF] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">J'arrive sur zone</button></div>
                </div>
              </div>
            )}

            {/* ✅ RÉINTÉGRÉ : RAPPORT STRUCTURÉ COMPLET */}
            {selectedCall && (
              <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="w-full bg-white dark:bg-[#111b21] rounded-t-[40px] shadow-2xl flex flex-col max-h-[92%] animate-in slide-in-from-bottom-full border-t border-gray-100 dark:border-white/5">
                  <div className="flex justify-between items-start px-6 py-5 border-b border-gray-100 dark:border-white/5 shrink-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1"><Shield size={16} className="text-[#0056FF] dark:text-[#00a884]" /><span className="text-[10px] font-black uppercase tracking-widest text-[#0056FF] dark:text-[#00a884]">Rapport Intelligence</span></div>
                      <h3 className="font-black text-xl dark:text-white">{selectedCall.title}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] font-bold text-gray-400 bg-gray-50 dark:bg-[#202c33] px-2.5 py-0.5 rounded-full flex items-center gap-1"><Clock size={12}/> {selectedCall.duration}</span>
                        <span className="text-[11px] text-gray-400">{selectedCall.date}</span>
                      </div>
                    </div>
                    <button onClick={() => setSelectedCall(null)} className="bg-gray-100 dark:bg-white/5 rounded-full p-2 ml-2 shrink-0"><X size={20} className="text-gray-500" /></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6">
                    {/* Synthèse IA */}
                    <div>
                      <h4 className="flex items-center gap-2 text-xs font-black text-[#0056FF] dark:text-[#00a884] mb-3 uppercase tracking-widest"><FileAudio size={16}/> Synthèse IA</h4>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-white/5 dark:to-white/[0.02] p-5 rounded-3xl border border-blue-100 dark:border-transparent">
                        <p className="text-[15px] font-medium leading-relaxed dark:text-[#e9edef]">{selectedCall.summary}</p>
                      </div>
                    </div>
                    {/* Observations */}
                    {selectedCall.notes?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">Observations</h4>
                        <div className="space-y-2">
                          {selectedCall.notes.map((note, i) => (
                            <div key={i} className="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3.5 rounded-2xl border border-gray-100 dark:border-white/5">
                              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-[#202c33] flex items-center justify-center shrink-0"><span className="text-[10px] font-black text-gray-500">{i+1}</span></div>
                              <span className="text-[14px] font-medium dark:text-[#e9edef]">{note}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Décisions & Actions */}
                    {selectedCall.actions?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">Décisions & Actions</h4>
                        <div className="space-y-2.5">
                          {selectedCall.actions.map((action, i) => {
                            const txt = typeof action === 'object' ? action.text : action;
                            const st = typeof action === 'object' ? action.status : 'pending';
                            const getActionStatusConfig = (status) => {
                              switch(status) {
                                case 'done': return { label: 'Acté', bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-900/30', icon: <CheckCircle2 size={16} /> };
                                case 'deferred': return { label: 'Reporté', bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900/30', icon: <RotateCcw size={16} /> };
                                case 'urgent': return { label: 'Urgent', bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-900/30', icon: <AlertTriangle size={16} /> };
                                default: return { label: 'En cours', bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/30', icon: <CircleDot size={16} /> };
                              }
                            };
                            const c = getActionStatusConfig(st);
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
                    {/* Export */}
                    <div className="pt-2">
                      <button onClick={() => showToast("Export PDF...")} className="w-full flex items-center justify-center gap-3 bg-gray-900 dark:bg-white/10 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95"><FileText size={20}/> Exporter (PDF)</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* NAV */}
          {!isCallActive && (
            <div className="h-18 bg-white dark:bg-[#111b21] border-t border-gray-100 dark:border-white/5 flex items-center justify-around px-3 z-30 shrink-0 pb-safe">
              <button onClick={() => setActiveView('chat_list')} className={`flex flex-col items-center gap-1.5 ${activeView === 'chat_list' || activeView === 'conversation' ? 'text-[#0056FF] dark:text-[#00a884] scale-110' : 'text-gray-400 opacity-60'}`}><MessageCircle size={26} className={activeView === 'chat_list' || activeView === 'conversation' ? "fill-current" : ""} /><span className="text-[10px] font-black uppercase">Capteurs</span></button>
              <button onClick={() => setActiveView('call_history')} className={`flex flex-col items-center gap-1.5 ${activeView === 'call_history' ? 'text-[#0056FF] dark:text-[#00a884] scale-110' : 'text-gray-400 opacity-60'}`}><Phone size={26} className={activeView === 'call_history' ? "fill-current" : ""} /><span className="text-[10px] font-black uppercase">Calls</span></button>
              {currentUser.role === 'DG' && (<button onClick={() => setActiveOverlay('dashboard')} className={`flex flex-col items-center gap-1.5 ${activeOverlay === 'dashboard' ? 'text-[#0056FF] dark:text-[#00a884] scale-110' : 'text-gray-400 opacity-60'}`}><LayoutDashboard size={26} className={activeOverlay === 'dashboard' ? "fill-current" : ""} /><span className="text-[10px] font-black uppercase">Live</span></button>)}
              <button onClick={() => setActiveView('profile')} className={`flex flex-col items-center gap-1.5 ${activeView === 'profile' ? 'text-[#0056FF] dark:text-[#00a884] scale-110' : 'text-gray-400 opacity-60'}`}><User size={26} className={activeView === 'profile' ? "fill-current" : ""} /><span className="text-[10px] font-black uppercase">Profil</span></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}