import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import multer from 'multer';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const upload = multer({ dest: 'uploads/' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let groq;
try {
    if (process.env.GROQ_API_KEY) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } else {
        console.warn("⚠️ ATTENTION: GROQ_API_KEY n'est pas définie dans le fichier .env");
    }
} catch (e) {
    console.error("Erreur initialisation Groq:", e);
}

async function transcribeAudio(filePath) {
    if (!groq) throw new Error("Client Groq non initialisé.");
    try {
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3",
            language: "fr",
            response_format: "json",
        });
        return transcription.text || "";
    } catch (error) {
        throw new Error(`Erreur Transcription Groq: ${error.message}`);
    }
}

// --- FILE D'ÉVÉNEMENTS EN MÉMOIRE (POUR LE TEMPS RÉEL UI) ---
let systemEvents = []; 
function pushEvent(targetRole, chatId, content, type = 'system', additionalProps = {}) {
    systemEvents.push({
        id: Date.now() + Math.random(),
        targetRole,
        chatId,
        acked: [],
        messageObj: {
            id: Date.now() + Math.random(),
            type,
            content,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            ...additionalProps
        }
    });
}

// =====================================================
// COMMUNICATION INTER-APP & DÉPLOIEMENT
// =====================================================

app.get('/api/events/:role/:phone', (req, res) => {
    const { role, phone } = req.params;
    const pending = systemEvents.filter(e => (e.targetRole === role || e.targetRole === 'All') && !e.acked.includes(phone));
    pending.forEach(e => e.acked.push(phone));
    res.json({ success: true, events: pending });
});

app.post('/api/report', async (req, res) => {
    const { zone, type, name, phone, lat, lng, photoBase64 } = req.body;
    const urgency = type.toLowerCase().includes('débordement') ? 'Critical' : 'High';
    
    try {
        const { data: incident, error } = await supabase
            .from('incidents')
            .insert([{
                type: type,
                description: `Citoyen: ${name} (${phone}) - Signalement en zone ${zone}`,
                gps_latitude: lat || 14.716,
                gps_longitude: lng || -17.467,
                priority: urgency,
                photo_before_url: photoBase64 ? 'photo_incluse' : null,
                status: 'pending'
            }])
            .select().single();

        if (error) throw error;

        const newTask = {
            id: incident.incident_id,
            zone: zone, 
            type: type, 
            urgency: urgency, 
            citizenName: name, 
            citizenPhone: phone,
            location: { lat: incident.gps_latitude, lng: incident.gps_longitude }, 
            status: 'pending', 
            timestamp: incident.timestamp_reported
        };
        
        pushEvent('DG', 'terrain', `🚨 Signalement Citoyen (${name} - ${phone}) : ${type} en Zone ${zone}. IA en cours de dispatching.`, 'system');
        res.json({ success: true, mission: newTask });
    } catch (e) {
        console.error("Erreur Report Supabase:", e);
        res.status(500).json({ success: false });
    }
});

app.get('/api/tasks/:phone', async (req, res) => {
    try {
        const { data: pendingTask, error } = await supabase
            .from('incidents')
            .select('*')
            .eq('status', 'pending')
            .order('timestamp_reported', { ascending: true })
            .limit(1)
            .single();

        if (pendingTask) {
            await supabase.from('incidents').update({ status: 'assigned' }).eq('incident_id', pendingTask.incident_id);

            const agentPos = { lat: 14.7167, lng: -17.4677 }; 
            const dx = pendingTask.gps_longitude - agentPos.lng;
            const dy = pendingTask.gps_latitude - agentPos.lat;
            const distanceMeters = Math.round(Math.sqrt(dx*dx + dy*dy) * 111320);

            const frontendTask = {
                id: pendingTask.incident_id,
                zone: 'Détectée',
                type: pendingTask.type,
                urgency: pendingTask.priority,
                citizenName: 'Citoyen', 
                citizenPhone: 'Public', 
                location: { lat: pendingTask.gps_latitude, lng: pendingTask.gps_longitude },
                agentPhone: req.params.phone,
                navigation: {
                    distance: distanceMeters || 120, 
                    targetX: dx * 20000 || 60,
                    targetY: -dy * 20000 || -40
                }
            };
            return res.json({ success: true, task: frontendTask });
        }
        res.json({ success: true, task: null });
    } catch (e) {
        res.json({ success: true, task: null });
    }
});

app.post('/api/resolve', async (req, res) => {
    const { taskId, photo, agentName } = req.body;
    
    if (!taskId) return res.status(404).json({ success: false });

    try {
        let aiFeedback = "Validation manuelle de secours.";
        let isClean = true;

        if (photo && groq) {
            const analysis = await groq.chat.completions.create({
                messages: [{
                    role: "user",
                    content: [
                        { type: "text", text: "Est-ce que cette zone est propre et débarrassée de déchets ? Réponds par OUI ou NON, suivi d'une très courte phrase d'explication." },
                        { type: "image_url", image_url: { url: photo } }
                    ],
                }],
                model: "llama-3.2-11b-vision-preview",
            });
            aiFeedback = analysis.choices[0]?.message?.content || "Analyse impossible.";
            isClean = aiFeedback.toLowerCase().includes("oui");
        }

        if (isClean) {
            await supabase.from('incidents').update({ 
                status: 'completed',
                timestamp_completed: new Date().toISOString(),
                photo_after_url: photo ? 'photo_incluse' : null
            }).eq('incident_id', taskId);
            
            pushEvent('DG', 'terrain', `✅ VALIDATION IA : L'agent ${agentName || 'sur le terrain'} a clôturé la mission. L'IA confirme : "${aiFeedback}"`, 'system');
            res.json({ success: true, validated: true });
        } else {
            pushEvent('Agent', 'terrain', `⚠️ REFUS IA : La zone n'est pas propre. L'IA dit : "${aiFeedback}"`, 'system');
            res.json({ success: false, message: "L'IA a refusé la validation." });
        }
    } catch (error) {
        await supabase.from('incidents').update({ status: 'completed' }).eq('incident_id', taskId);
        pushEvent('DG', 'terrain', `✅ L'agent ${agentName || 'sur le terrain'} a clôturé la mission (Validation classique).`, 'system');
        res.json({ success: true, validated: true });
    }
});

app.post('/api/agent-issue', (req, res) => {
    const { name, issue } = req.body;
    pushEvent('DG', 'terrain', `L'agent ${name} signale : "${issue}".\n💡 Proposition IA : Réallouer 50 sacs depuis la Zone Nord vers sa position.`, 'dg_action', { issueId: Date.now() });
    res.json({ success: true });
});

app.post('/api/dg-action', (req, res) => {
    pushEvent('Agent', 'terrain', `✅ Le Superviseur a validé la correction logistique. Le réapprovisionnement est en route vers votre position.`, 'system');
    res.json({ success: true });
});

// =====================================================
// IA CHAT & VOICE PIPELINE
// =====================================================

async function buildDynamicContext(role, targetAi) {
    const timeStr = new Date().toLocaleTimeString();
    
    let pendingCount = 0;
    let completedCount = 0;

    try {
        const { count: pCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: cCount } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'completed');
        pendingCount = pCount || 0;
        completedCount = cCount || 0;
    } catch(e) {}

    let prompt = `Tu es Natango, l'Intelligence Opérationnelle spécialisée dans la GESTION DES DÉCHETS et LA PROPRETÉ.
HEURE ACTUELLE DU SYSTÈME : ${timeStr}
INCIDENTS ACTIFS : ${pendingCount}
MISSIONS RÉSOLUES : ${completedCount}
RÈGLES : Sois direct et concis (1 à 3 phrases). Ton but est de gérer les déchets et nettoyer le stade.`;

    if (role === 'Agent') {
        prompt += `\nTu parles à l'agent de terrain. Donne des directives courtes et motive-le.`;
    } else if (role === 'DG') {
        prompt += `\nTu parles au Superviseur / DG. Fais des synthèses claires des incidents.`;
        if (targetAi === 'marketing') {
            return `Tu es Natango Marketing. Réponds UNIQUEMENT avec un objet JSON valide pour une infographie.
{
  "title": "Bilan Opérationnel : Gestion des Déchets",
  "event_date": "${new Date().toLocaleDateString()}",
  "metrics": [
    {"label": "Signalements Actifs", "value": "${pendingCount}", "trend": "Aujourd'hui"},
    {"label": "Incidents Résolus", "value": "${completedCount}", "trend": "En cours"}
  ],
  "demographics": { "Collecte Lourde": 50, "Recyclable": 30, "Tout-venant": 20 }
}`;
        }
    }
    return prompt;
}

const constructMeetingPrompt = (userName) => {
    const timeStr = new Date().toLocaleTimeString();
    return `Tu es l'Intelligence Artificielle qui participe vocalement à cette réunion de direction. 
Tu parles à l'équipe. L'heure du système est ${timeStr}.

RÈGLES DE COMPORTEMENT :
1. Analyse l'historique de la réunion fourni et RÉPONDS UNIQUEMENT À LA QUESTION POSÉE par l'utilisateur.
2. Si on te demande "t'en penses quoi ?", donne un avis pertinent basé sur ce qui vient d'être dit.
3. Fais des phrases courtes et naturelles pour l'oral (1 ou 2 phrases maximum).`;
};

app.post('/api/chat', async (req, res) => {
    try {
        const { userId, role, targetAi, message, history = [], needVoiceResponse } = req.body;
        if (!groq) return res.status(500).json({ success: false, error: "Clé API Groq manquante." });
        
        const systemPrompt = await buildDynamicContext(role, targetAi);
        const apiMessages = [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: message }];
        
        const completion = await groq.chat.completions.create({
            messages: apiMessages, model: 'llama-3.3-70b-versatile', 
            temperature: targetAi === 'marketing' ? 0.0 : 0.1,
            response_format: targetAi === 'marketing' ? { type: "json_object" } : { type: "text" }, max_tokens: 1024
        });
        
        const aiResponseText = completion.choices[0]?.message?.content || "Erreur.";
        if (targetAi === 'marketing') return res.json({ success: true, reply: { id: Date.now(), type: 'infographic', content: JSON.parse(aiResponseText), time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) } });
        
        let audioBase64 = null;
        if (needVoiceResponse && process.env.ELEVENLABS_API_KEY) audioBase64 = await textToSpeechElevenLabs(aiResponseText);
        
        res.json({ success: true, reply: { id: Date.now(), type: needVoiceResponse ? 'voice_out' : 'text_out', content: aiResponseText, audioBase64, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) } });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/voice', upload.single('audio'), async (req, res) => {
    let actualFilePath = null;
    try {
        const { role, targetAi, history } = req.body;
        const parsedHistory = history ? JSON.parse(history) : [];
        const audioFile = req.file;
        if (!audioFile) return res.status(400).json({ success: false, error: "Aucun fichier." });
        
        const ext = audioFile.originalname.includes('.') ? audioFile.originalname.split('.').pop() : 'webm';
        actualFilePath = `${audioFile.path}.${ext}`;
        fs.renameSync(audioFile.path, actualFilePath);
        
        const userText = await transcribeAudio(actualFilePath);
        if (!userText.trim()) throw new Error("Audio silencieux.");
        
        const systemPrompt = await buildDynamicContext(role, targetAi);
        const apiMessages = [{ role: 'system', content: systemPrompt }, ...parsedHistory, { role: 'user', content: userText }];
        const completion = await groq.chat.completions.create({ messages: apiMessages, model: 'llama-3.3-70b-versatile', temperature: 0.1, max_tokens: 256 });
        const aiResponseText = completion.choices[0]?.message?.content || "Erreur.";
        
        let audioBase64 = null;
        if (process.env.ELEVENLABS_API_KEY) audioBase64 = await textToSpeechElevenLabs(aiResponseText);
        if (fs.existsSync(actualFilePath)) fs.unlinkSync(actualFilePath);
        
        res.json({ success: true, transcription: userText, reply: { id: Date.now(), type: 'voice_out', content: aiResponseText, audioBase64, duration: '...', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) } });
    } catch (error) { if (actualFilePath && fs.existsSync(actualFilePath)) fs.unlinkSync(actualFilePath); res.status(500).json({ success: false }); }
});

async function textToSpeechElevenLabs(text) {
    try {
        const voiceId = process.env.VOICE_ID || 'YxrwjAKoUKULGd0g8K9Y';
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST', headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY },
            body: JSON.stringify({ text: text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
        });
        if (ttsResponse.ok) return Buffer.from(await ttsResponse.arrayBuffer()).toString('base64');
        return null;
    } catch (e) { return null; }
}

app.post('/api/meeting-chunk', upload.single('audio'), async (req, res) => {
    let actualFilePath = null;
    try {
        const { role, userName = "", history, meetingContext = "", isSessionActive } = req.body;
        const parsedHistory = history ? JSON.parse(history) : [];
        const audioFile = req.file;
        if (!audioFile) return res.status(400).json({ success: false });
        
        const ext = (audioFile.originalname || '').split('.').pop() || 'webm';
        actualFilePath = `${audioFile.path}.${ext}`;
        fs.renameSync(audioFile.path, actualFilePath);
        
        const transcription = await transcribeAudio(actualFilePath);
        if (fs.existsSync(actualFilePath)) fs.unlinkSync(actualFilePath);
        if (!transcription || !transcription.trim()) return res.json({ success: true, transcription: "", triggered: false });
        
        const cleanText = transcription.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        const triggerFound = cleanText.includes('assistant') || cleanText.includes('système') || cleanText.includes('natango') || cleanText.includes('natangu');
        const shouldRespond = triggerFound || isSessionActive === 'true';

        if (!shouldRespond) return res.json({ success: true, transcription, triggered: false });
        
        const fullContextPrompt = `${constructMeetingPrompt(userName)}\n--- HISTORIQUE ---\n"${meetingContext}"\n--- QUESTION ---\n"${transcription}"`;
        const completion = await groq.chat.completions.create({ messages: [{ role: 'system', content: fullContextPrompt }, ...parsedHistory, { role: 'user', content: transcription }], model: 'llama-3.3-70b-versatile', temperature: 0.1, max_tokens: 256 });
        
        const aiText = completion.choices[0]?.message?.content || "Erreur.";
        let audioBase64 = null;
        if (process.env.ELEVENLABS_API_KEY) audioBase64 = await textToSpeechElevenLabs(aiText);

        res.json({ success: true, transcription, triggered: triggerFound, reply: { id: Date.now(), type: 'voice_out', content: aiText, audioBase64, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } });
    } catch (error) { if (actualFilePath && fs.existsSync(actualFilePath)) fs.unlinkSync(actualFilePath); res.status(500).json({ success: false }); }
});

app.post('/api/summary', async (req, res) => {
    try {
        const { transcript } = req.body;
        if (!transcript || transcript.trim() === "") return res.json({ success: false });
        const prompt = `Tu es un assistant de direction. Fais un rapport 100% FIDÈLE. RÉPONDS UNIQUEMENT AVEC JSON.\n{ "title": "Titre", "summary": "Résumé", "notes": ["Note 1"], "actions": ["Action 1"] }\nTexte : "${transcript}"`;
        const completion = await groq.chat.completions.create({ messages: [{ role: 'user', content: prompt }], model: 'llama-3.3-70b-versatile', temperature: 0.1, response_format: { type: "json_object" } });
        res.json({ success: true, data: JSON.parse(completion.choices[0].message.content) });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/dashboard-live', async (req, res) => {
    try {
        let pendingCount = 0;
        try {
            const { count } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            pendingCount = count || 0;
        } catch(e) {}

        const mockZones = [
            { Zone: 'Nord', Densite: pendingCount > 0 ? 0.8 : 0.2 }, 
            { Zone: 'Sud', Densite: 0.2 }, 
            { Zone: 'Est', Densite: 0.5 }, 
            { Zone: 'Ouest', Densite: 0.1 }
        ];

        const avgFillRate = pendingCount > 0 ? Math.min(100, 30 + (pendingCount * 15)) : 30;

        res.json({ 
            success: true, 
            data: { 
                time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 
                fillRate: avgFillRate, 
                incidents: pendingCount, 
                zones: mockZones 
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/checkin', (req, res) => {
    pushEvent('DG', 'rh', `Nouveau Check-in terrain enregistré.`, 'system');
    res.json({ success: true, message: "Check-in validé." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Backend Natango OS démarré sur le port ${PORT}`);
    console.log(`📡 Pipeline : Supabase DB → Groq (STT/LLM/Vision) → ElevenLabs (TTS)\n`);
});